# Agent Instructions - Agentic 3D Asset Studio

Use this Space as an agent-ready 3D asset generation workflow.

## Tool

`generate_3d_asset`

## Current Provider

```json
{
  "provider": "local_demo",
  "provider_name": "Local Demo Provider",
  "provider_type": "deterministic_demo",
  "model_backend": "procedural-glb-demo",
  "status": "active"
}
```

Important: the current provider does **not** run a real foundation image-to-3D model. It creates deterministic demo GLB assets for workflow validation, UI testing, packaging, metadata and agent orchestration.

## Input Schema

```json
{
  "image": "uploaded image file",
  "quality_preset": "Draft | Balanced | High",
  "mesh_style": "Soft object | Hard surface | Product preview",
  "seed": 1234,
  "notes": "optional generation context"
}
```

## Output Schema

```json
{
  "asset_id": "asset_xxxxxxxxxx",
  "asset_glb": "outputs/assets/{asset_id}/asset.glb",
  "metadata_json": "outputs/assets/{asset_id}/metadata.json",
  "quality_report_json": "outputs/assets/{asset_id}/quality_report.json",
  "activity_log_json": "outputs/assets/{asset_id}/activity_log.json",
  "package_zip": "outputs/assets/{asset_id}/package.zip",
  "provider": "local_demo",
  "provider_type": "deterministic_demo",
  "limitations": "This local provider generates deterministic demo GLB files and does not run a foundation image-to-3D model."
}
```

## Required Workflow

1. Confirm that the user has the right to use the input image.
2. Upload the source image.
3. Select a quality preset.
4. Select a mesh style.
5. Generate the asset.
6. Read `metadata.json`.
7. Read `quality_report.json`.
8. Return the `.glb` and `package.zip`.
9. Report provider, provider type and limitations.

## Safety Constraints

- Do not claim real AI image-to-3D generation unless a real provider is configured.
- Do not claim the asset is production-ready, game-ready, CAD-ready or commerce-ready without human review.
- Do not upload confidential, copyrighted, personal, or sensitive images without permission.
- Always return metadata and quality report together with the GLB.
- Always disclose that Local Demo Provider is deterministic and not a foundation model.

## Future Backends

The provider interface is prepared for future adapters:

- TRELLIS
- TripoSR
- Stable Fast 3D
- InstantMesh

Do not describe any of these as active until the provider is actually configured and verified.

## Example Retrieval

```bash
curl https://huggingface.co/spaces/danieloza/agentic-3d-asset-studio/raw/main/agents.md
```
