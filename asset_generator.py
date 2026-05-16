from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from statistics import mean

from providers import AssetGenerationRequest, AssetGenerationResult, LocalDemoProvider


OUTPUT_ROOT = Path("outputs")
LOCAL_PROVIDER = LocalDemoProvider()


@dataclass(frozen=True)
class GenerationRequest:
    image_path: str
    quality: str
    seed: int
    mesh_style: str
    notes: str = ""
    parent_asset_id: str | None = None
    feedback: str = ""
    regeneration_reason: str | None = None


def generate_asset(request: GenerationRequest) -> AssetGenerationResult:
    provider_request = AssetGenerationRequest(
        input_image=Path(request.image_path),
        quality_preset=request.quality,  # type: ignore[arg-type]
        seed=int(request.seed),
        mesh_style=request.mesh_style,  # type: ignore[arg-type]
        notes=request.notes,
        parent_asset_id=request.parent_asset_id,
        feedback=request.feedback,
        regeneration_reason=request.regeneration_reason,
    )
    return LOCAL_PROVIDER.generate_asset(provider_request, OUTPUT_ROOT)


def load_assets() -> list[dict]:
    assets_root = OUTPUT_ROOT / "assets"
    if not assets_root.exists():
        return []

    assets: list[dict] = []
    for metadata_path in sorted(assets_root.glob("*/metadata.json"), reverse=True):
        try:
            metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        assets.append(metadata)
    return sorted(assets, key=lambda item: item.get("created_at", ""), reverse=True)


def asset_table_rows() -> list[list[str | int]]:
    rows: list[list[str | int]] = []
    for asset in load_assets():
        rows.append(
            [
                asset.get("asset_id", ""),
                asset.get("created_at", ""),
                asset.get("provider", ""),
                asset.get("quality_preset", ""),
                asset.get("mesh_style", ""),
                int(asset.get("overall_quality_score", 0)),
                asset.get("status", ""),
                int(asset.get("file_size_bytes", 0)),
                asset.get("glb_path", ""),
                asset.get("metadata_path", ""),
                asset.get("quality_report_path", ""),
                asset.get("package_zip_path", ""),
            ]
        )
    return rows


def get_asset(asset_id: str) -> dict | None:
    if not asset_id:
        return None
    metadata_path = OUTPUT_ROOT / "assets" / asset_id / "metadata.json"
    if not metadata_path.exists():
        return None
    return json.loads(metadata_path.read_text(encoding="utf-8"))


def inspect_storage(metadata: dict) -> dict:
    paths = {
        "asset.glb": metadata.get("glb_path"),
        "metadata.json": metadata.get("metadata_path"),
        "quality_report.json": metadata.get("quality_report_path"),
        "manifest.json": metadata.get("manifest_path"),
        "package.zip": metadata.get("package_zip_path"),
        "input.png": metadata.get("input_image"),
        "activity_log.json": metadata.get("activity_log_path"),
    }
    checksums = metadata.get("checksums", {})
    files = []
    for label, path_value in paths.items():
        exists = bool(path_value and Path(path_value).exists())
        checksum_key = f"{Path(label).stem}_sha256"
        files.append(
            {
                "name": label,
                "path": path_value,
                "exists": exists,
                "size_bytes": Path(path_value).stat().st_size if exists and path_value else 0,
                "sha256": checksums.get(checksum_key),
            }
        )
    return {"files": files}


def evaluate_quality_gates(metadata: dict, quality_report: dict | None = None) -> dict:
    report = quality_report or {}
    score = int(report.get("overall_score") or metadata.get("overall_quality_score") or 0)
    size_mb = int(metadata.get("file_size_bytes") or 0) / (1024 * 1024)
    review_status = metadata.get("review_status") or "Needs Review"
    checks = [
        {"label": "Minimum quality score >= 75", "passed": score >= 75, "value": score},
        {"label": "Maximum file size <= 50 MB", "passed": size_mb <= 50, "value": round(size_mb, 3)},
        {"label": "Metadata present", "passed": bool(metadata.get("metadata_path") and Path(metadata["metadata_path"]).exists())},
        {"label": "Package ZIP present", "passed": bool(metadata.get("package_zip_path") and Path(metadata["package_zip_path"]).exists())},
        {"label": "Human review completed", "passed": review_status in {"Approved", "Final"}, "value": review_status},
    ]
    passed = all(item["passed"] for item in checks)
    return {
        "status": "Passed Quality Gate" if passed else "Failed Quality Gate",
        "passed": passed,
        "minimum_quality_score": 75,
        "maximum_file_size_mb": 50,
        "require_metadata": True,
        "require_package_zip": True,
        "require_human_review": True,
        "checks": checks,
    }


def observability_summary() -> dict:
    assets = load_assets()
    total = len(assets)
    scores = [int(asset.get("overall_quality_score") or 0) for asset in assets]
    sizes = [int(asset.get("file_size_bytes") or 0) for asset in assets]
    statuses = [asset.get("status", "unknown") for asset in assets]
    gate_results = [evaluate_quality_gates(asset) for asset in assets]
    presets: dict[str, int] = {}
    for asset in assets:
        preset = asset.get("quality_preset", "Unknown")
        presets[preset] = presets.get(preset, 0) + 1
    most_used_preset = max(presets, key=presets.get) if presets else "None"
    return {
        "total_runs": total,
        "success_rate": round((statuses.count("completed") / total) * 100, 1) if total else 0,
        "average_quality_score": round(mean(scores), 1) if scores else 0,
        "failed_quality_gates": sum(1 for result in gate_results if not result["passed"]),
        "total_storage_bytes": sum(sizes),
        "average_package_size_bytes": round(mean(sizes)) if sizes else 0,
        "most_used_preset": most_used_preset,
        "providers_used": sorted({asset.get("provider", "unknown") for asset in assets}),
        "last_run": assets[0].get("created_at") if assets else None,
    }


def replay_asset(asset_id: str) -> AssetGenerationResult:
    metadata = get_asset(asset_id)
    if metadata is None:
        raise ValueError("Asset not found")
    return generate_asset(
        GenerationRequest(
            image_path=metadata["input_image"],
            quality=metadata.get("quality_preset", "Balanced"),
            seed=int(metadata.get("seed", 482742)),
            mesh_style=metadata.get("mesh_style", "Product preview"),
            notes=metadata.get("notes", ""),
            parent_asset_id=asset_id,
            feedback="Run replay from saved metadata",
            regeneration_reason="run_replay",
        )
    )


def latest_asset() -> dict | None:
    assets = load_assets()
    return assets[0] if assets else None


def metadata_markdown(metadata: dict) -> str:
    lines = [
        "### Generation metadata",
        f"- Asset ID: `{metadata['asset_id']}`",
        f"- Provider: `{metadata['provider_name']}` (`{metadata['provider_type']}`)",
        f"- Backend: `{metadata['model_backend']}`",
        f"- Status: `{metadata['status']}`",
        f"- Quality preset: `{metadata['quality_preset']}`",
        f"- Mesh style: `{metadata['mesh_style']}`",
        f"- Seed: `{metadata['seed']}`",
        f"- Dominant color: `{metadata['dominant_color']}`",
        f"- File size: `{metadata['file_size_bytes']}` bytes",
        "",
        "**Limitations**",
        f"- {metadata['limitations']}",
        f"- Future backend targets: {', '.join(metadata['future_backends'])}",
    ]
    if metadata.get("notes"):
        lines.insert(9, f"- Notes: {metadata['notes']}")
    return "\n".join(lines)


def quality_markdown(quality_report: dict) -> str:
    return "\n".join(
        [
            "### Quality score",
            f"## {quality_report['overall_score']} / 100",
            f"- Geometry: `{quality_report['geometry_score']}`",
            f"- Topology: `{quality_report['topology_score']}`",
            f"- Material: `{quality_report['material_score']}`",
            f"- Metadata: `{quality_report['metadata_score']}`",
            f"- Reproducibility: `{quality_report['reproducibility_score']}`",
            "",
            "**Warnings**",
            *[f"- {warning}" for warning in quality_report["warnings"]],
        ]
    )


def activity_markdown(activity_log: list[dict]) -> str:
    lines = ["### Activity log"]
    for item in activity_log:
        lines.append(f"- `{item['timestamp']}` - **{item['event']}**: {item['detail']}")
    return "\n".join(lines)
