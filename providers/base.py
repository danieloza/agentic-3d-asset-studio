from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Literal, Protocol


QualityPreset = Literal["Draft", "Balanced", "High"]
MeshStyle = Literal["Soft object", "Hard surface", "Product preview"]

QUALITY_PRESETS: tuple[QualityPreset, ...] = ("Draft", "Balanced", "High")
MESH_STYLES: tuple[MeshStyle, ...] = ("Soft object", "Hard surface", "Product preview")
FUTURE_BACKENDS = ["TRELLIS", "TripoSR", "Stable Fast 3D", "InstantMesh"]


@dataclass(frozen=True)
class AssetGenerationRequest:
    input_image: Path
    quality_preset: QualityPreset
    mesh_style: MeshStyle
    seed: int
    notes: str = ""


@dataclass(frozen=True)
class AssetGenerationResult:
    asset_id: str
    asset_dir: Path
    glb_path: Path
    metadata_path: Path
    quality_report_path: Path
    package_zip_path: Path
    input_image_path: Path
    activity_log_path: Path
    metadata: dict
    quality_report: dict
    activity_log: list[dict]
    status: str = "completed"


@dataclass(frozen=True)
class ProviderDescription:
    name: str
    provider_type: str
    status: str
    description: str


class AssetProvider(Protocol):
    name: str
    provider_type: str

    def generate_asset(
        self,
        request: AssetGenerationRequest,
        output_root: Path,
    ) -> AssetGenerationResult:
        ...
