from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

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


def generate_asset(request: GenerationRequest) -> AssetGenerationResult:
    provider_request = AssetGenerationRequest(
        input_image=Path(request.image_path),
        quality_preset=request.quality,  # type: ignore[arg-type]
        seed=int(request.seed),
        mesh_style=request.mesh_style,  # type: ignore[arg-type]
        notes=request.notes,
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
