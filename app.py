from __future__ import annotations

import gradio as gr

from asset_generator import GenerationRequest, generate_asset, metadata_markdown


TITLE = "Agentic 3D Asset Studio"
SUBTITLE = (
    "Generate agent-ready 3D asset previews from images, export `.glb`, "
    "and keep generation metadata for downstream workflows."
)


CSS = """
:root {
  --studio-bg: #050814;
  --studio-panel: rgba(15, 23, 42, 0.72);
  --studio-border: rgba(148, 163, 184, 0.18);
}

.gradio-container {
  background:
    radial-gradient(circle at 18% 8%, rgba(34, 211, 238, 0.18), transparent 30%),
    radial-gradient(circle at 82% 12%, rgba(124, 58, 237, 0.18), transparent 28%),
    linear-gradient(135deg, #020617 0%, #08111f 48%, #050814 100%) !important;
  color: #e5e7eb !important;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
}

.hero {
  border: 1px solid var(--studio-border);
  border-radius: 28px;
  padding: 34px;
  background: linear-gradient(135deg, rgba(15,23,42,.88), rgba(2,6,23,.72));
  box-shadow: 0 24px 90px rgba(0, 0, 0, .42);
}

.hero h1 {
  margin: 0;
  font-size: clamp(2.2rem, 6vw, 5.2rem);
  line-height: .92;
  letter-spacing: -0.06em;
}

.hero p {
  max-width: 760px;
  color: #b6c2d5;
  font-size: 1.04rem;
  line-height: 1.7;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(34, 211, 238, .26);
  background: rgba(8, 145, 178, .12);
  color: #67e8f9;
  padding: 7px 12px;
  border-radius: 999px;
  font-size: .8rem;
  font-weight: 700;
  margin-bottom: 18px;
}

.gradient-text {
  background: linear-gradient(90deg, #22d3ee, #3b82f6, #a855f7);
  -webkit-background-clip: text;
  color: transparent;
}

.panel {
  border: 1px solid var(--studio-border) !important;
  background: var(--studio-panel) !important;
  border-radius: 22px !important;
}

.footer-note {
  color: #94a3b8;
  font-size: .9rem;
}
"""


def run_generation(image_path: str | None, quality: str, seed: int, mesh_style: str, notes: str):
    if not image_path:
        raise gr.Error("Upload an image first.")

    request = GenerationRequest(
        image_path=image_path,
        quality=quality,
        seed=int(seed),
        mesh_style=mesh_style,
        notes=notes or "",
    )
    result = generate_asset(request)
    return result.asset_path, result.asset_path, metadata_markdown(result.metadata)


THEME = gr.themes.Soft(primary_hue="blue", neutral_hue="slate")


with gr.Blocks(title=TITLE) as demo:
    gr.HTML(
        f"""
        <section class="hero">
          <div class="badge">Agent-ready image-to-3D workflow</div>
          <h1>{TITLE}<br><span class="gradient-text">from image to GLB</span></h1>
          <p>{SUBTITLE}</p>
        </section>
        """
    )

    with gr.Row(equal_height=False):
        with gr.Column(scale=5, elem_classes=["panel"]):
            image = gr.Image(
                label="Source image",
                type="filepath",
                sources=["upload", "clipboard"],
                height=380,
            )
            with gr.Row():
                quality = gr.Radio(
                    ["Draft", "Balanced", "High"],
                    value="Balanced",
                    label="Quality",
                )
                mesh_style = gr.Dropdown(
                    ["Soft object", "Hard surface", "Product preview"],
                    value="Product preview",
                    label="Mesh style",
                )
            seed = gr.Slider(1, 9999, value=42, step=1, label="Seed")
            notes = gr.Textbox(
                label="Generation notes",
                placeholder="Optional: describe the object, target use case, or asset constraints.",
                lines=3,
            )
            generate_button = gr.Button("Generate 3D Asset", variant="primary", size="lg")

        with gr.Column(scale=7, elem_classes=["panel"]):
            model = gr.Model3D(label="3D preview", height=430)
            download = gr.File(label="Download GLB", file_types=[".glb"])
            metadata = gr.Markdown("### Generation metadata\nUpload an image and generate an asset.")

    gr.Markdown(
        """
### Provider strategy

The default provider is a deterministic local `.glb` generator for demo and CI-friendly use. 
For production, replace the provider adapter with a real image-to-3D backend such as TRELLIS, TripoSR, Stable Fast 3D, InstantMesh, or a private inference endpoint.

<span class="footer-note">Built for portfolio, Spaces, and agent workflows. See `agents.md` for automation instructions.</span>
"""
    )

    generate_button.click(
        fn=run_generation,
        inputs=[image, quality, seed, mesh_style, notes],
        outputs=[model, download, metadata],
        api_name="generate_3d_asset",
        api_description="Generate a previewable GLB asset from an uploaded image and generation settings.",
    )


if __name__ == "__main__":
    demo.queue(default_concurrency_limit=2).launch(theme=THEME, css=CSS)
