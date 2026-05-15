from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from asset_generator import GenerationRequest, generate_asset, get_asset, load_assets


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

    return {
        **metadata,
        "quality_report": quality_report,
        "activity_log": activity_log,
        "urls": {
            "glb": _url_for_path(metadata.get("glb_path")),
            "metadata": _url_for_path(metadata.get("metadata_path")),
            "quality_report": _url_for_path(metadata.get("quality_report_path")),
            "package_zip": _url_for_path(metadata.get("package_zip_path")),
            "input_image": _url_for_path(metadata.get("input_image")),
            "activity_log": _url_for_path(metadata.get("activity_log_path")),
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


@app.post("/api/generate")
async def create_asset(
    image: UploadFile = File(...),
    quality_preset: str = Form("Balanced"),
    mesh_style: str = Form("Product preview"),
    seed: int = Form(482742),
    notes: str = Form(""),
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
        )
    )
    return _asset_payload(result.metadata)
