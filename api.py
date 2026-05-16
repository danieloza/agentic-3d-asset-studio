from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from PIL import Image

from asset_generator import (
    GenerationRequest,
    evaluate_quality_gates,
    generate_asset,
    get_asset,
    inspect_storage,
    load_assets,
    observability_summary,
    replay_asset,
)


PROJECT_ROOT = Path(__file__).parent.resolve()
OUTPUT_ROOT = PROJECT_ROOT / "outputs"
UPLOAD_ROOT = OUTPUT_ROOT / "uploads"

app = FastAPI(title="Agentic 3D Asset Studio API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:5174",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
app.mount("/outputs", StaticFiles(directory=OUTPUT_ROOT), name="outputs")


def _read_json(path_value: str | None, fallback: Any) -> Any:
    if not path_value:
        return fallback
    path = Path(path_value)
    if not path.is_absolute():
        path = PROJECT_ROOT / path
    if not path.exists():
        return fallback
    return json.loads(path.read_text(encoding="utf-8"))


def _url_for_path(path_value: str | None) -> str | None:
    if not path_value:
        return None
    path = Path(path_value)
    if not path.is_absolute():
        path = PROJECT_ROOT / path
    try:
        relative = path.resolve().relative_to(OUTPUT_ROOT.resolve())
    except ValueError:
        return None
    return "/outputs/" + relative.as_posix()


def _asset_payload(metadata: dict) -> dict:
    if not metadata.get("activity_log_path") and metadata.get("metadata_path"):
        metadata["activity_log_path"] = str(Path(metadata["metadata_path"]).parent / "activity_log.json")

    quality_report = _read_json(metadata.get("quality_report_path"), {})
    activity_log = _read_json(metadata.get("activity_log_path"), [])
    quality_gates = evaluate_quality_gates(metadata, quality_report)
    storage = inspect_storage(metadata)

    return {
        **metadata,
        "quality_report": quality_report,
        "activity_log": activity_log,
        "quality_gates": quality_gates,
        "storage": storage,
        "urls": {
            "glb": _url_for_path(metadata.get("glb_path")),
            "metadata": _url_for_path(metadata.get("metadata_path")),
            "quality_report": _url_for_path(metadata.get("quality_report_path")),
            "package_zip": _url_for_path(metadata.get("package_zip_path")),
            "input_image": _url_for_path(metadata.get("input_image")),
            "activity_log": _url_for_path(metadata.get("activity_log_path")),
            "manifest": _url_for_path(metadata.get("manifest_path")),
        },
    }


@app.get("/api/health")
def health() -> dict:
    return {
        "status": "ok",
        "provider": "local_demo",
        "message": "Agentic 3D Asset Studio API is running",
    }


@app.get("/api/assets")
def list_assets() -> dict:
    return {"assets": [_asset_payload(asset) for asset in load_assets()]}


@app.get("/api/assets/{asset_id}")
def read_asset(asset_id: str) -> dict:
    metadata = get_asset(asset_id)
    if metadata is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    return _asset_payload(metadata)


@app.get("/api/assets/{asset_id}/quality-gates")
def read_quality_gates(asset_id: str) -> dict:
    metadata = get_asset(asset_id)
    if metadata is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    return evaluate_quality_gates(metadata, _read_json(metadata.get("quality_report_path"), {}))


@app.post("/api/assets/{asset_id}/replay")
def replay_run(asset_id: str) -> dict:
    try:
        result = replay_asset(asset_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Asset not found") from None
    return _asset_payload(result.metadata)


@app.get("/api/observability")
def read_observability() -> dict:
    return observability_summary()


@app.post("/api/demo-project")
def load_demo_project() -> dict:
    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    demo_specs = [
        ("demo_drone.png", (38, 129, 220), "Hard surface", 7001),
        ("demo_product.png", (130, 77, 230), "Product preview", 7002),
        ("demo_core.png", (20, 190, 150), "Soft object", 7003),
    ]
    created = []
    for filename, color, mesh_style, seed in demo_specs:
        image_path = UPLOAD_ROOT / filename
        if not image_path.exists():
            Image.new("RGB", (96, 96), color).save(image_path)
        result = generate_asset(
            GenerationRequest(
                image_path=str(image_path),
                quality="Balanced",
                seed=seed,
                mesh_style=mesh_style,
                notes="One-click portfolio demo project seed asset.",
            )
        )
        created.append(_asset_payload(result.metadata))
    return {"created": created, "assets": [_asset_payload(asset) for asset in load_assets()]}


@app.post("/api/generate")
async def create_asset(
    image: UploadFile = File(...),
    quality_preset: str = Form("Balanced"),
    mesh_style: str = Form("Product preview"),
    seed: int = Form(482742),
    notes: str = Form(""),
    parent_asset_id: str | None = Form(None),
    feedback: str = Form(""),
    regeneration_reason: str | None = Form(None),
) -> dict:
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Upload must be an image file")

    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    safe_name = Path(image.filename or "source.png").name
    upload_path = UPLOAD_ROOT / safe_name

    with upload_path.open("wb") as target:
        shutil.copyfileobj(image.file, target)

    result = generate_asset(
        GenerationRequest(
            image_path=str(upload_path),
            quality=quality_preset,
            seed=seed,
            mesh_style=mesh_style,
            notes=notes,
            parent_asset_id=parent_asset_id,
            feedback=feedback,
            regeneration_reason=regeneration_reason,
        )
    )
    return _asset_payload(result.metadata)


@app.post("/api/assets/{asset_id}/review")
async def update_review(
    asset_id: str,
    review_status: str = Form("Needs Review"),
    review_notes: str = Form(""),
) -> dict:
    metadata = get_asset(asset_id)
    if metadata is None:
        raise HTTPException(status_code=404, detail="Asset not found")

    allowed = {"Draft", "Needs Review", "Approved", "Rejected", "Final"}
    if review_status not in allowed:
        raise HTTPException(status_code=400, detail="Invalid review status")

    metadata["review_status"] = review_status
    metadata["review_notes"] = review_notes.strip()
    metadata_path = Path(metadata["metadata_path"])
    if not metadata_path.is_absolute():
        metadata_path = PROJECT_ROOT / metadata_path
    metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    manifest_path_value = metadata.get("manifest_path")
    if manifest_path_value:
        manifest_path = Path(manifest_path_value)
        if not manifest_path.is_absolute():
            manifest_path = PROJECT_ROOT / manifest_path
        if manifest_path.exists():
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest["review_status"] = review_status
            manifest["review_notes"] = review_notes.strip()
            manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    return _asset_payload(metadata)


@app.post("/api/assets/{asset_id}/regenerate")
async def regenerate_asset(
    asset_id: str,
    feedback: str = Form(""),
    seed: int | None = Form(None),
) -> dict:
    metadata = get_asset(asset_id)
    if metadata is None:
        raise HTTPException(status_code=404, detail="Asset not found")

    input_image = metadata.get("input_image")
    if not input_image:
        raise HTTPException(status_code=400, detail="Asset has no input image")

    next_seed = int(seed if seed is not None else int(metadata.get("seed", 482742)) + 1)
    result = generate_asset(
        GenerationRequest(
            image_path=input_image,
            quality=metadata.get("quality_preset", "Balanced"),
            seed=next_seed,
            mesh_style=metadata.get("mesh_style", "Product preview"),
            notes=metadata.get("notes", ""),
            parent_asset_id=asset_id,
            feedback=feedback,
            regeneration_reason="user_feedback",
        )
    )
    return _asset_payload(result.metadata)
