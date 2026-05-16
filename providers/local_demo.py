from __future__ import annotations

import hashlib
import json
import math
import shutil
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from PIL import Image
import trimesh

from .base import (
    FUTURE_BACKENDS,
    AssetGenerationRequest,
    AssetGenerationResult,
    MeshStyle,
    ProviderDescription,
    QualityPreset,
)


class LocalDemoProvider:
    name = "Local Demo Provider"
    provider_id = "local_demo"
    provider_type = "deterministic_demo"
    model_backend = "procedural-glb-demo"

    def describe(self) -> ProviderDescription:
        return ProviderDescription(
            name=self.name,
            provider_type=self.provider_type,
            status="Active",
            description=(
                "Deterministic local GLB generator for demo and workflow validation. "
                "It does not run a foundation image-to-3D model."
            ),
        )

    def generate_asset(
        self,
        request: AssetGenerationRequest,
        output_root: Path,
    ) -> AssetGenerationResult:
        created_at = datetime.now(timezone.utc)
        asset_id = self._asset_id(request.input_image, request.seed, created_at)
        asset_dir = output_root / "assets" / asset_id
        asset_dir.mkdir(parents=True, exist_ok=True)

        activity_log: list[dict] = []
        self._log(activity_log, "image_uploaded", "Input image accepted")
        if request.parent_asset_id:
            self._log(activity_log, "regeneration_requested", f"Parent asset: {request.parent_asset_id}")
        if request.feedback:
            self._log(activity_log, "feedback_captured", request.feedback.strip())

        input_image_path = asset_dir / "input.png"
        self._copy_input_image(request.input_image, input_image_path)
        self._log(activity_log, "provider_selected", f"{self.name} selected")

        dominant_color_rgba = self._dominant_color(input_image_path)
        dominant_color_hex = self._rgba_to_hex(dominant_color_rgba)
        self._log(activity_log, "dominant_color_extracted", dominant_color_hex)

        mesh = self._build_mesh(
            quality_preset=request.quality_preset,
            mesh_style=request.mesh_style,
            seed=request.seed,
        )
        vertex_color = [int(channel * 255) for channel in dominant_color_rgba]
        mesh.visual.vertex_colors = np.tile(vertex_color, (len(mesh.vertices), 1))
        mesh.apply_transform(trimesh.transformations.rotation_matrix(math.radians(18), [0, 0, 1]))

        glb_path = asset_dir / "asset.glb"
        scene = self._add_preview_stage(mesh)
        scene.export(glb_path)
        self._log(activity_log, "glb_generated", "asset.glb created")

        quality_report = self._quality_report(request, mesh, glb_path)
        quality_report_path = asset_dir / "quality_report.json"
        quality_report_path.write_text(json.dumps(quality_report, indent=2), encoding="utf-8")
        self._log(activity_log, "quality_report_exported", "quality_report.json created")

        metadata = self._metadata(
            asset_id=asset_id,
            created_at=created_at,
            request=request,
            dominant_color_hex=dominant_color_hex,
            glb_path=glb_path,
            metadata_path=asset_dir / "metadata.json",
            quality_report_path=quality_report_path,
            input_image_path=input_image_path,
            package_zip_path=asset_dir / "package.zip",
            file_size=glb_path.stat().st_size if glb_path.exists() else 0,
            quality_report=quality_report,
        )
        metadata_path = asset_dir / "metadata.json"
        metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
        self._log(activity_log, "metadata_exported", "metadata.json created")

        activity_log_path = asset_dir / "activity_log.json"
        activity_log_path.write_text(json.dumps(activity_log, indent=2), encoding="utf-8")

        agent_instructions_path = asset_dir / "agent_instructions.md"
        agent_instructions_path.write_text(self._package_instructions(asset_id), encoding="utf-8")

        manifest_path = asset_dir / "manifest.json"
        manifest = self._manifest(
            asset_id=asset_id,
            created_at=created_at,
            files=[glb_path, metadata_path, quality_report_path, input_image_path, agent_instructions_path, activity_log_path],
            request=request,
            provider_name=self.name,
        )
        manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        metadata["manifest_path"] = str(manifest_path)
        metadata["checksums"] = manifest["checksums"]
        metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

        package_zip_path = asset_dir / "package.zip"
        self._create_package(
            package_zip_path=package_zip_path,
            files=[glb_path, metadata_path, quality_report_path, input_image_path, agent_instructions_path, activity_log_path, manifest_path],
        )
        manifest["checksums"]["package_sha256"] = self._sha256(package_zip_path)
        manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        metadata["package_zip_path"] = str(package_zip_path)
        metadata["checksums"] = manifest["checksums"]
        metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
        self._log(activity_log, "zip_package_created", "package.zip created")
        self._log(activity_log, "completed", "Generation completed")
        activity_log_path.write_text(json.dumps(activity_log, indent=2), encoding="utf-8")

        return AssetGenerationResult(
            asset_id=asset_id,
            asset_dir=asset_dir,
            glb_path=glb_path,
            metadata_path=metadata_path,
            quality_report_path=quality_report_path,
            package_zip_path=package_zip_path,
            input_image_path=input_image_path,
            activity_log_path=activity_log_path,
            metadata=metadata,
            quality_report=quality_report,
            activity_log=activity_log,
        )

    def _asset_id(self, input_image: Path, seed: int, created_at: datetime) -> str:
        raw = f"{input_image.resolve()}:{seed}:{created_at.isoformat()}".encode("utf-8")
        return "asset_" + hashlib.sha256(raw).hexdigest()[:10]

    def _log(self, activity_log: list[dict], event: str, detail: str) -> None:
        activity_log.append(
            {
                "event": event,
                "detail": detail,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        )

    def _copy_input_image(self, source: Path, target: Path) -> None:
        image = Image.open(source).convert("RGBA")
        image.save(target)

    def _dominant_color(self, image_path: Path) -> tuple[float, float, float, float]:
        image = Image.open(image_path).convert("RGBA")
        image.thumbnail((96, 96))
        pixels = np.asarray(image).reshape(-1, 4)
        visible = pixels[pixels[:, 3] > 24]
        if len(visible) == 0:
            return (0.2, 0.55, 1.0, 1.0)
        rgb = np.median(visible[:, :3], axis=0) / 255.0
        return (float(rgb[0]), float(rgb[1]), float(rgb[2]), 1.0)

    def _rgba_to_hex(self, color: tuple[float, float, float, float]) -> str:
        red, green, blue, _ = [int(channel * 255) for channel in color]
        return f"#{red:02X}{green:02X}{blue:02X}"

    def _build_mesh(self, quality_preset: QualityPreset, mesh_style: MeshStyle, seed: int) -> trimesh.Trimesh:
        detail_by_quality: dict[QualityPreset, int] = {"Draft": 1, "Balanced": 2, "High": 3}
        detail = detail_by_quality[quality_preset]
        if mesh_style == "Soft object":
            return self._make_soft_object(seed, detail)
        if mesh_style == "Hard surface":
            return self._make_hard_surface(seed)
        return self._make_product_preview(seed, detail)

    def _make_soft_object(self, seed: int, detail: int) -> trimesh.Trimesh:
        rng = np.random.default_rng(seed)
        mesh = trimesh.creation.icosphere(subdivisions=detail, radius=1.0)
        vertices = mesh.vertices.copy()
        noise = rng.normal(0, 0.08, size=(len(vertices), 1))
        wave = np.sin(vertices[:, 0:1] * 3.1 + seed % 7) * 0.06
        vertices *= 1.0 + noise + wave
        mesh.vertices = vertices
        return mesh

    def _make_hard_surface(self, seed: int) -> trimesh.Trimesh:
        rng = np.random.default_rng(seed)
        base = trimesh.creation.box(extents=(1.6, 1.0, 0.45))
        pieces = [base]
        for index in range(5):
            width = float(rng.uniform(0.15, 0.42))
            depth = float(rng.uniform(0.12, 0.32))
            height = float(rng.uniform(0.08, 0.28))
            part = trimesh.creation.box(extents=(width, depth, height))
            part.apply_translation(
                (
                    float(rng.uniform(-0.65, 0.65)),
                    float(rng.uniform(-0.35, 0.35)),
                    0.26 + height / 2 + index * 0.015,
                )
            )
            pieces.append(part)
        return trimesh.util.concatenate(pieces)

    def _make_product_preview(self, seed: int, detail: int) -> trimesh.Trimesh:
        rng = np.random.default_rng(seed)
        radius = float(rng.uniform(0.42, 0.58))
        height = float(rng.uniform(1.1, 1.45))
        mesh = trimesh.creation.cylinder(radius=radius, height=height, sections=48 + detail * 16)
        bevel = trimesh.creation.torus(major_radius=radius * 0.9, minor_radius=0.045)
        bevel.apply_translation((0, 0, height / 2))
        return trimesh.util.concatenate([mesh, bevel])

    def _add_preview_stage(self, mesh: trimesh.Trimesh) -> trimesh.Scene:
        stage = trimesh.creation.cylinder(radius=1.25, height=0.08, sections=64)
        stage.apply_translation((0, 0, -0.78))
        stage.visual.vertex_colors = np.tile([18, 28, 48, 255], (len(stage.vertices), 1))
        scene = trimesh.Scene()
        scene.add_geometry(stage, node_name="preview_stage")
        scene.add_geometry(mesh, node_name="generated_asset")
        return scene

    def _quality_report(self, request: AssetGenerationRequest, mesh: trimesh.Trimesh, glb_path: Path) -> dict:
        quality_bonus = {"Draft": -8, "Balanced": 0, "High": 5}[request.quality_preset]
        size_bonus = 4 if glb_path.exists() and glb_path.stat().st_size > 8_000 else -4
        geometry_score = min(96, max(60, 82 + quality_bonus + size_bonus))
        topology_score = min(94, max(58, 80 + quality_bonus + (4 if len(mesh.faces) > 80 else -6)))
        material_score = 78 + (5 if request.mesh_style == "Product preview" else 2)
        metadata_score = 96
        reproducibility_score = 98
        overall_score = round(
            (geometry_score + topology_score + material_score + metadata_score + reproducibility_score) / 5
        )
        warnings = [
            "Demo quality scoring is rule-based and not a full geometry validation system.",
            "Generated geometry must be reviewed by a human before production, game, CAD, or commerce use.",
        ]
        return {
            "scoring_type": "rule_based_demo",
            "geometry_score": geometry_score,
            "topology_score": topology_score,
            "material_score": material_score,
            "metadata_score": metadata_score,
            "reproducibility_score": reproducibility_score,
            "overall_score": overall_score,
            "warnings": warnings,
            "notes": [
                "Scores validate workflow completeness, reproducibility, and generated file presence.",
                "They do not certify that the asset is production-ready.",
            ],
        }

    def _metadata(
        self,
        asset_id: str,
        created_at: datetime,
        request: AssetGenerationRequest,
        dominant_color_hex: str,
        glb_path: Path,
        metadata_path: Path,
        quality_report_path: Path,
        input_image_path: Path,
        package_zip_path: Path,
        file_size: int,
        quality_report: dict,
    ) -> dict:
        return {
            "asset_id": asset_id,
            "created_at": created_at.isoformat(),
            "provider": self.provider_id,
            "provider_name": self.name,
            "provider_type": self.provider_type,
            "model_backend": self.model_backend,
            "input_image": str(input_image_path),
            "quality_preset": request.quality_preset,
            "mesh_style": request.mesh_style,
            "seed": request.seed,
            "notes": request.notes.strip(),
            "parent_asset_id": request.parent_asset_id,
            "feedback": request.feedback.strip(),
            "regeneration_reason": request.regeneration_reason,
            "dominant_color": dominant_color_hex,
            "glb_path": str(glb_path),
            "metadata_path": str(metadata_path),
            "quality_report_path": str(quality_report_path),
            "package_zip_path": str(package_zip_path),
            "file_size_bytes": file_size,
            "status": "completed",
            "review_status": "Needs Review",
            "review_notes": "",
            "production_readiness": self._production_readiness(),
            "overall_quality_score": quality_report["overall_score"],
            "limitations": (
                "This local provider generates deterministic demo GLB files and does not run "
                "a foundation image-to-3D model."
            ),
            "future_backends": FUTURE_BACKENDS,
        }

    def _production_readiness(self) -> list[dict]:
        return [
            {"label": "GLB generated", "status": "pass"},
            {"label": "Metadata exported", "status": "pass"},
            {"label": "Quality report generated", "status": "pass"},
            {"label": "Asset package created", "status": "pass"},
            {"label": "Reproducible seed saved", "status": "pass"},
            {"label": "Human review required", "status": "warning"},
            {"label": "Not verified in game engine", "status": "warning"},
            {"label": "Demo provider, not real image-to-3D model", "status": "warning"},
        ]

    def _sha256(self, path: Path) -> str:
        digest = hashlib.sha256()
        with path.open("rb") as source:
            for chunk in iter(lambda: source.read(1024 * 1024), b""):
                digest.update(chunk)
        return digest.hexdigest()

    def _manifest(
        self,
        asset_id: str,
        created_at: datetime,
        files: list[Path],
        request: AssetGenerationRequest,
        provider_name: str,
    ) -> dict:
        checksums = {f"{file_path.stem}_sha256": self._sha256(file_path) for file_path in files if file_path.exists()}
        return {
            "asset_id": asset_id,
            "created_at": created_at.isoformat(),
            "provider": provider_name,
            "provider_type": self.provider_type,
            "review_status": "Needs Review",
            "parent_asset_id": request.parent_asset_id,
            "feedback": request.feedback.strip(),
            "regeneration_reason": request.regeneration_reason,
            "files": [file_path.name for file_path in files if file_path.exists()],
            "checksums": checksums,
        }

    def _package_instructions(self, asset_id: str) -> str:
        return f"""# Asset Package - {asset_id}

This package was generated by Agentic 3D Asset Studio.

Files:
- asset.glb: generated demo GLB asset
- metadata.json: provider, inputs, paths, and limitations
- quality_report.json: rule-based demo quality report
- input.png: original input image copy
- activity_log.json: generation timeline

Important:
The active provider is Local Demo Provider. It creates deterministic demo geometry and does not run a real foundation image-to-3D model.
Review the asset manually before production use.
"""

    def _create_package(self, package_zip_path: Path, files: list[Path]) -> None:
        with zipfile.ZipFile(package_zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for file_path in files:
                if file_path.exists():
                    archive.write(file_path, arcname=file_path.name)
