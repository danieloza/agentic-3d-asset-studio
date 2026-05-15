from __future__ import annotations

import json
from pathlib import Path

import gradio as gr

from asset_generator import (
    GenerationRequest,
    activity_markdown,
    asset_table_rows,
    generate_asset,
    get_asset,
    latest_asset,
    load_assets,
    metadata_markdown,
    quality_markdown,
)
from providers import FUTURE_BACKENDS, MESH_STYLES, QUALITY_PRESETS, LocalDemoProvider


TITLE = "Agentic 3D Asset Studio"
SUBTITLE = (
    "Agent-ready 3D asset generation workspace with image upload, GLB preview, "
    "metadata, quality reports, ZIP packages and provider-aware automation."
)


CSS = """
:root {
  --studio-bg: #020617;
  --studio-panel: rgba(15, 23, 42, 0.76);
  --studio-panel-strong: rgba(8, 13, 28, 0.92);
  --studio-border: rgba(148, 163, 184, 0.18);
  --studio-muted: #94a3b8;
  --studio-text: #e5edf8;
  --studio-blue: #38bdf8;
  --studio-violet: #8b5cf6;
  --studio-emerald: #34d399;
}

body {
  background:
    radial-gradient(circle at 10% 4%, rgba(14, 165, 233, .23), transparent 30%),
    radial-gradient(circle at 88% 2%, rgba(124, 58, 237, .20), transparent 34%),
    linear-gradient(135deg, #020617 0%, #07111f 48%, #020617 100%) !important;
}

.gradio-container {
  max-width: 1440px !important;
  margin: 0 auto !important;
  padding: 22px 24px 44px !important;
  background: transparent !important;
  color: var(--studio-text) !important;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
}

.top-shell {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 18px;
  align-items: center;
  border: 1px solid var(--studio-border);
  border-radius: 26px;
  padding: 24px;
  background:
    linear-gradient(135deg, rgba(15,23,42,.93), rgba(2,6,23,.78)),
    radial-gradient(circle at 78% 22%, rgba(56,189,248,.18), transparent 34%);
  box-shadow: 0 24px 90px rgba(0, 0, 0, .42);
}

.brandline {
  color: #67e8f9;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(34, 211, 238, .26);
  background: rgba(8, 145, 178, .12);
  padding: 7px 12px;
  border-radius: 999px;
  font-size: .78rem;
  font-weight: 800;
  letter-spacing: .02em;
  text-transform: uppercase;
}

.top-shell h1 {
  margin: 16px 0 10px;
  font-size: clamp(2rem, 4vw, 4.1rem);
  line-height: .95;
  letter-spacing: -0.06em;
  color: #f8fbff !important;
}

.gradient-text {
  background: linear-gradient(90deg, #22d3ee, #3b82f6, #a855f7);
  -webkit-background-clip: text;
  color: transparent;
}

.top-shell p {
  margin: 0;
  max-width: 760px;
  color: #b6c2d5 !important;
  font-size: 1.02rem;
  line-height: 1.7;
}

.status-card {
  min-width: 260px;
  border: 1px solid rgba(148, 163, 184, .18);
  border-radius: 20px;
  padding: 18px;
  background: rgba(2, 6, 23, .55);
}

.status-row {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  margin-top: 10px;
  color: #cbd5e1;
  font-size: .88rem;
}

.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--studio-emerald);
  box-shadow: 0 0 18px rgba(52, 211, 153, .7);
  margin-right: 8px;
}

.gradio-container label,
.gradio-container .label-wrap span,
.gradio-container .prose,
.gradio-container .markdown,
.gradio-container h1,
.gradio-container h2,
.gradio-container h3,
.gradio-container p {
  color: #dbeafe !important;
}

.gradio-container input,
.gradio-container textarea,
.gradio-container select {
  background: rgba(15, 23, 42, .86) !important;
  color: #e5edf8 !important;
  border-color: rgba(148, 163, 184, .2) !important;
}

.gradio-container button {
  color: #e5edf8 !important;
}

.gradio-container .tab-nav,
.gradio-container .tabs {
  background: transparent !important;
}

.panel,
.gradio-container .block,
.gradio-container .form {
  border: 1px solid var(--studio-border) !important;
  background: var(--studio-panel) !important;
  border-radius: 20px !important;
  box-shadow: 0 18px 55px rgba(0, 0, 0, .24);
}

#source_image,
#preview_model,
#download_glb,
#download_package,
#metadata_file,
#quality_file {
  border-radius: 18px !important;
  overflow: hidden !important;
}

#source_image .image-container,
#preview_model .model3d-container,
#download_glb .file-preview,
#download_glb .empty,
#download_package .file-preview,
#download_package .empty,
#metadata_file .file-preview,
#quality_file .file-preview {
  background: linear-gradient(135deg, rgba(15, 23, 42, .94), rgba(2, 6, 23, .9)) !important;
}

#download_glb .empty.large,
#download_package .empty.large,
#metadata_file .empty.large,
#quality_file .empty.large {
  min-height: 58px !important;
  height: 58px !important;
  max-height: 58px !important;
  padding: 0 !important;
}

#download_glb .empty .icon,
#download_package .empty .icon,
#metadata_file .empty .icon,
#quality_file .empty .icon {
  width: 20px !important;
  height: 20px !important;
  opacity: .55 !important;
}

.mini-card {
  border: 1px solid rgba(148, 163, 184, .16);
  background: rgba(2, 6, 23, .42);
  border-radius: 18px;
  padding: 16px;
}

.provider-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}

.provider-card {
  border: 1px solid rgba(148, 163, 184, .16);
  border-radius: 18px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(15,23,42,.88), rgba(2,6,23,.74));
}

.provider-card strong {
  display: block;
  color: #f8fbff;
  margin-bottom: 8px;
}

.provider-card span {
  display: inline-flex;
  margin-bottom: 10px;
  padding: 4px 9px;
  border-radius: 999px;
  font-size: .75rem;
  border: 1px solid rgba(148, 163, 184, .2);
}

.active-pill {
  color: #86efac;
  background: rgba(34,197,94,.12);
  border-color: rgba(34,197,94,.25) !important;
}

.inactive-pill {
  color: #c4b5fd;
  background: rgba(139,92,246,.12);
}

@media (max-width: 900px) {
  .top-shell {
    grid-template-columns: 1fr;
  }
}
"""


FORCE_DARK_HEAD = """
<script>
(function () {
  const url = new URL(window.location.href);
  if (url.searchParams.get("__theme") !== "dark") {
    url.searchParams.set("__theme", "dark");
    window.location.replace(url.toString());
  }
})();
</script>
"""


THEME = gr.themes.Soft(primary_hue="blue", neutral_hue="slate")
PROVIDER = LocalDemoProvider()


def header_html() -> str:
    return f"""
    <section class="top-shell">
      <div>
        <div class="brandline">Agent-ready 3D workflow layer</div>
        <h1>{TITLE}<br><span class="gradient-text">image to governed GLB package</span></h1>
        <p>{SUBTITLE}</p>
      </div>
      <aside class="status-card">
        <div><span class="dot"></span>Local Demo Provider active</div>
        <div class="status-row"><span>Mode</span><strong>Dark-only workspace</strong></div>
        <div class="status-row"><span>Claim</span><strong>Workflow layer, not foundation model</strong></div>
        <div class="status-row"><span>Outputs</span><strong>GLB + JSON + ZIP</strong></div>
      </aside>
    </section>
    """


def run_generation(image_path: str | None, quality: str, mesh_style: str, seed: int, notes: str):
    if not image_path:
        raise gr.Error("Upload an image first.")

    result = generate_asset(
        GenerationRequest(
            image_path=image_path,
            quality=quality,
            seed=int(seed),
            mesh_style=mesh_style,
            notes=notes or "",
        )
    )

    asset_choices = [asset["asset_id"] for asset in load_assets()]
    return (
        str(result.glb_path),
        str(result.glb_path),
        str(result.package_zip_path),
        str(result.metadata_path),
        str(result.quality_report_path),
        metadata_markdown(result.metadata),
        quality_markdown(result.quality_report),
        activity_markdown(result.activity_log),
        asset_table_rows(),
        gr.update(choices=asset_choices, value=result.asset_id),
    )


def refresh_assets():
    assets = load_assets()
    choices = [asset["asset_id"] for asset in assets]
    selected = choices[0] if choices else None
    return asset_table_rows(), gr.update(choices=choices, value=selected)


def load_selected_asset(asset_id: str | None):
    asset = get_asset(asset_id or "") or latest_asset()
    if not asset:
        empty = "### No assets yet\nGenerate your first asset from the Generate tab."
        return None, None, None, None, empty, empty

    quality_path = Path(asset["quality_report_path"])
    quality_report = json.loads(quality_path.read_text(encoding="utf-8")) if quality_path.exists() else {}
    return (
        asset.get("glb_path"),
        asset.get("glb_path"),
        asset.get("package_zip_path"),
        asset.get("metadata_path"),
        asset.get("quality_report_path"),
        metadata_markdown(asset),
        quality_markdown(quality_report) if quality_report else "### Quality report missing",
    )


def providers_html() -> str:
    cards = [
        (
            "Local Demo Provider",
            "Active",
            "active-pill",
            "Deterministic local GLB generator. Useful for UI, package, metadata, and agent workflow validation.",
        ),
        *[
            (
                backend,
                "Not configured",
                "inactive-pill",
                "Placeholder target for future real image-to-3D inference integration.",
            )
            for backend in FUTURE_BACKENDS
        ],
    ]
    rendered = "".join(
        f"""
        <div class="provider-card">
          <strong>{name}</strong>
          <span class="{pill}">{status}</span>
          <p>{description}</p>
        </div>
        """
        for name, status, pill, description in cards
    )
    return f'<div class="provider-grid">{rendered}</div>'


AGENT_DOC = """
### Tool: `generate_3d_asset`

**Input schema**

```json
{
  "image": "uploaded image file",
  "quality_preset": "Draft | Balanced | High",
  "mesh_style": "Soft object | Hard surface | Product preview",
  "seed": 1234,
  "notes": "optional generation context"
}
```

**Output schema**

```json
{
  "asset_id": "asset_xxxxx",
  "asset_glb": "outputs/assets/{asset_id}/asset.glb",
  "metadata_json": "outputs/assets/{asset_id}/metadata.json",
  "quality_report_json": "outputs/assets/{asset_id}/quality_report.json",
  "package_zip": "outputs/assets/{asset_id}/package.zip",
  "provider": "local_demo",
  "limitations": "deterministic demo provider, not a real foundation model"
}
```

**Safe usage constraints**

- Do not claim real AI image-to-3D generation unless a real provider is configured.
- Do not claim generated assets are production/game-ready without human review.
- Always report provider, provider type, limitations, metadata and quality report.
- Do not upload confidential, copyrighted, or personal images without permission.

**Workflow**

`upload image -> generate asset -> quality check -> metadata export -> ZIP package delivery`
"""


ABOUT_DOC = """
### What this project is

Agentic 3D Asset Studio is a premium Gradio workspace for testing an agent-ready 3D asset generation workflow. It produces a GLB file, metadata JSON, rule-based quality report, activity log and ZIP package.

### What this project does not claim

The active provider is **Local Demo Provider**. It generates deterministic demo geometry and does **not** run TRELLIS, TripoSR, Stable Fast 3D, InstantMesh, or any proprietary foundation image-to-3D model.

### Why this is useful

The project shows the application layer around AI asset generation: provider abstraction, file packaging, auditability, quality scoring, agent instructions, and a product-like operator UI.
"""


with gr.Blocks(title=TITLE) as demo:
    gr.HTML(header_html())

    with gr.Tabs():
        with gr.Tab("Generate"):
            with gr.Row(equal_height=False):
                with gr.Column(scale=5, elem_classes=["panel"]):
                    gr.Markdown("### 1. Source image")
                    image = gr.Image(
                        label="Source image",
                        type="filepath",
                        sources=["upload", "clipboard"],
                        height=300,
                        elem_id="source_image",
                    )
                    gr.Markdown("### 2. Generation settings")
                    with gr.Row():
                        quality = gr.Radio(
                            list(QUALITY_PRESETS),
                            value="Balanced",
                            label="Quality preset",
                        )
                        mesh_style = gr.Dropdown(
                            list(MESH_STYLES),
                            value="Product preview",
                            label="Mesh style",
                        )
                    seed = gr.Slider(1, 9999, value=42, step=1, label="Seed")
                    notes = gr.Textbox(
                        label="Notes",
                        placeholder="Optional: describe target use case, object constraints, or downstream workflow.",
                        lines=3,
                    )
                    generate_button = gr.Button("Generate 3D Asset", variant="primary", size="lg")

                with gr.Column(scale=7, elem_classes=["panel"]):
                    model = gr.Model3D(label="3D preview", height=360, elem_id="preview_model")
                    with gr.Row():
                        download_glb = gr.File(label="Download GLB", file_types=[".glb"], height=76, elem_id="download_glb")
                        download_package = gr.File(label="Download Asset Package", file_types=[".zip"], height=76, elem_id="download_package")
                    with gr.Row():
                        metadata_file = gr.File(label="metadata.json", file_types=[".json"], height=76, elem_id="metadata_file")
                        quality_file = gr.File(label="quality_report.json", file_types=[".json"], height=76, elem_id="quality_file")
                    with gr.Row():
                        metadata = gr.Markdown("### Generation metadata\nUpload an image and generate an asset.")
                        quality_report = gr.Markdown("### Quality score\nWaiting for generation.")
                    activity_log = gr.Markdown("### Activity log\nNo generation yet.")

        with gr.Tab("Assets"):
            with gr.Row():
                with gr.Column(scale=7, elem_classes=["panel"]):
                    gr.Markdown("### Recent assets")
                    refresh_button = gr.Button("Refresh Assets")
                    assets_table = gr.Dataframe(
                        headers=[
                            "asset_id",
                            "created_at",
                            "provider",
                            "quality",
                            "mesh_style",
                            "quality_score",
                            "status",
                            "file_size_bytes",
                            "glb_path",
                            "metadata_path",
                            "quality_report_path",
                            "package_zip_path",
                        ],
                        value=asset_table_rows(),
                        interactive=False,
                        wrap=True,
                    )
                    asset_picker = gr.Dropdown(
                        choices=[asset["asset_id"] for asset in load_assets()],
                        label="Select asset",
                    )
                    load_asset_button = gr.Button("Load Selected Asset", variant="primary")
                with gr.Column(scale=5, elem_classes=["panel"]):
                    selected_model = gr.Model3D(label="Selected asset preview", height=320)
                    selected_glb = gr.File(label="GLB")
                    selected_package = gr.File(label="ZIP package")
                    selected_metadata_file = gr.File(label="metadata.json")
                    selected_quality_file = gr.File(label="quality_report.json")
                    selected_metadata = gr.Markdown("### Asset metadata\nSelect an asset.")
                    selected_quality = gr.Markdown("### Quality report\nSelect an asset.")

        with gr.Tab("Agents"):
            with gr.Row():
                with gr.Column(scale=7, elem_classes=["panel"]):
                    gr.Markdown(AGENT_DOC)
                with gr.Column(scale=5, elem_classes=["panel"]):
                    gr.Markdown(
                        """
### Agent constraints

- Always disclose `provider=local_demo` while Local Demo Provider is active.
- Return GLB, metadata JSON and quality report together.
- Treat quality scoring as rule-based demo diagnostics.
- Human review is required before production use.
"""
                    )

        with gr.Tab("Providers"):
            with gr.Column(elem_classes=["panel"]):
                gr.Markdown("### Provider status")
                gr.HTML(providers_html())
                gr.Markdown(
                    """
Only **Local Demo Provider** is active. Real model integrations should be added behind the same provider interface.
"""
                )

        with gr.Tab("Settings / About"):
            with gr.Column(elem_classes=["panel"]):
                gr.Markdown(ABOUT_DOC)

    generate_button.click(
        fn=run_generation,
        inputs=[image, quality, mesh_style, seed, notes],
        outputs=[
            model,
            download_glb,
            download_package,
            metadata_file,
            quality_file,
            metadata,
            quality_report,
            activity_log,
            assets_table,
            asset_picker,
        ],
        api_name="generate_3d_asset",
        api_description="Generate a demo GLB package with metadata, quality report, and activity log.",
    )
    refresh_button.click(fn=refresh_assets, inputs=None, outputs=[assets_table, asset_picker])
    load_asset_button.click(
        fn=load_selected_asset,
        inputs=asset_picker,
        outputs=[
            selected_model,
            selected_glb,
            selected_package,
            selected_metadata_file,
            selected_quality_file,
            selected_metadata,
            selected_quality,
        ],
    )


if __name__ == "__main__":
    demo.queue(default_concurrency_limit=2).launch(
        theme=THEME,
        css=CSS,
        head=FORCE_DARK_HEAD,
        footer_links=[],
    )
