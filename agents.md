# Agent Instructions - Agentic 3D Asset Studio

Use this Space to generate or retrieve a 3D `.glb` asset from an uploaded image.

## Intended Use

- Generate previewable 3D assets from product, object, or concept images.
- Export `.glb` files for downstream 3D workflows.
- Keep a clear metadata trail of generation settings and provider behavior.

## Safety and Trust

- Review generated geometry before using it in production.
- Do not upload confidential, copyrighted, or personal images unless you have permission.
- Treat the current local provider as a demo generator, not a production image-to-3D model.

## Inputs

- `image`: uploaded image file
- `quality`: `Draft`, `Balanced`, or `High`
- `seed`: integer seed for deterministic demo generation
- `mesh_style`: `Soft object`, `Hard surface`, or `Product preview`
- `notes`: optional prompt/context for downstream model adapters

## Output

- generated `.glb` file
- generation metadata summary

## Recommended Agent Flow

1. Validate that the user has rights to use the image.
2. Upload the image.
3. Use `Balanced` quality for normal previews.
4. Use `High` only when the user explicitly asks for a more detailed asset.
5. Download and inspect the `.glb`.
6. Report generation settings and limitations to the user.

## Example CLI Retrieval

```bash
curl https://huggingface.co/spaces/danieloza/agentic-3d-asset-studio/raw/main/agents.md
```
