from __future__ import annotations

import hashlib
import json
import math
import tempfile
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Literal

import numpy as np
from PIL import Image
import trimesh


Quality = Literal["Draft", "Balanced", "High"]
MeshStyle = Literal["Soft object", "Hard surface", "Product preview"]


@dataclass(frozen=True)
class GenerationRequest:
    image_path: str
    quality: Quality
    seed: int
    mesh_style: MeshStyle
    notes: str = ""


@dataclass(frozen=True)
class GenerationResult:
    asset_path: str
    metadata: dict


def _dominant_color(image_path: str) -> tuple[float, float, float, float]:
    image = Image.open(image_path).convert("RGBA")
    image.thumbnail((96, 96))
    pixels = np.asarray(image).reshape(-1, 4)
    visible = pixels[pixels[:, 3] > 24]
    if len(visible) == 0:
        return (0.2, 0.55, 1.0, 1.0)
    rgb = np.median(visible[:, :3], axis=0) / 255.0
    return (float(rgb[0]), float(rgb[1]), float(rgb[2]), 1.0)


def _image_fingerprint(image_path: str) -> str:
    with open(image_path, "rb") as handle:
        return hashlib.sha256(handle.read()).hexdigest()[:16]


def _make_soft_object(seed: int, detail: int) -> trimesh.Trimesh:
    rng = np.random.default_rng(seed)
    mesh = trimesh.creation.icosphere(subdivisions=detail, radius=1.0)
    vertices = mesh.vertices.copy()
    noise = rng.normal(0, 0.08, size=(len(vertices), 1))
    wave = np.sin(vertices[:, 0:1] * 3.1 + seed % 7) * 0.06
    vertices *= 1.0 + noise + wave
    mesh.vertices = vertices
    return mesh


def _make_hard_surface(seed: int) -> trimesh.Trimesh:
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


def _make_product_preview(seed: int, detail: int) -> trimesh.Trimesh:
    rng = np.random.default_rng(seed)
    radius = float(rng.uniform(0.42, 0.58))
    height = float(rng.uniform(1.1, 1.45))
    mesh = trimesh.creation.cylinder(radius=radius, height=height, sections=48 + detail * 16)
    bevel = trimesh.creation.torus(major_radius=radius * 0.9, minor_radius=0.045)
    bevel.apply_translation((0, 0, height / 2))
    return trimesh.util.concatenate([mesh, bevel])


def _add_preview_stage(mesh: trimesh.Trimesh) -> trimesh.Scene:
    stage = trimesh.creation.cylinder(radius=1.25, height=0.08, sections=64)
    stage.apply_translation((0, 0, -0.78))
    stage.visual.vertex_colors = np.tile([18, 28, 48, 255], (len(stage.vertices), 1))
    scene = trimesh.Scene()
    scene.add_geometry(stage, node_name="preview_stage")
    scene.add_geometry(mesh, node_name="generated_asset")
    return scene


def generate_asset(request: GenerationRequest) -> GenerationResult:
    detail_by_quality: dict[Quality, int] = {"Draft": 1, "Balanced": 2, "High": 3}
    detail = detail_by_quality[request.quality]

    if request.mesh_style == "Soft object":
        mesh = _make_soft_object(request.seed, detail)
    elif request.mesh_style == "Hard surface":
        mesh = _make_hard_surface(request.seed)
    else:
        mesh = _make_product_preview(request.seed, detail)

    color = _dominant_color(request.image_path)
    vertex_color = [int(channel * 255) for channel in color]
    mesh.visual.vertex_colors = np.tile(vertex_color, (len(mesh.vertices), 1))

    angle = math.radians(18)
    mesh.apply_transform(
        trimesh.transformations.rotation_matrix(angle, [0, 0, 1])
    )

    output_dir = Path(tempfile.mkdtemp(prefix="agentic_3d_asset_"))
    asset_path = output_dir / "generated_asset.glb"
    scene = _add_preview_stage(mesh)
    scene.export(asset_path)

    metadata = {
        "provider": "local-demo-generator",
        "model_backend": "procedural-glb-demo",
        "image_fingerprint": _image_fingerprint(request.image_path),
        "quality": request.quality,
        "mesh_style": request.mesh_style,
        "seed": request.seed,
        "notes": request.notes.strip(),
        "limitations": [
            "This local provider creates a deterministic demo mesh.",
            "Swap the provider adapter with TRELLIS, TripoSR, Stable Fast 3D, InstantMesh, or a private endpoint for real image-to-3D inference.",
        ],
    }

    (output_dir / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    return GenerationResult(asset_path=str(asset_path), metadata=metadata)


def metadata_markdown(metadata: dict) -> str:
    lines = [
        "### Generation metadata",
        f"- Provider: `{metadata['provider']}`",
        f"- Backend: `{metadata['model_backend']}`",
        f"- Image fingerprint: `{metadata['image_fingerprint']}`",
        f"- Quality: `{metadata['quality']}`",
        f"- Mesh style: `{metadata['mesh_style']}`",
        f"- Seed: `{metadata['seed']}`",
    ]
    if metadata.get("notes"):
        lines.append(f"- Notes: {metadata['notes']}")
    lines.append("")
    lines.append("**Limitations**")
    for limitation in metadata["limitations"]:
        lines.append(f"- {limitation}")
    return "\n".join(lines)
