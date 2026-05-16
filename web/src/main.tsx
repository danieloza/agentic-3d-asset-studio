import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "@google/model-viewer";
import {
  Activity,
  Archive,
  BadgeCheck,
  Bell,
  Box,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Cuboid,
  Database,
  Download,
  FileJson,
  Folder,
  Gauge,
  ImagePlus,
  Layers3,
  Package,
  Play,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  WandSparkles,
  X,
} from "lucide-react";
import "./styles.css";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        alt?: string;
        poster?: string;
        "camera-controls"?: boolean | string;
        "auto-rotate"?: boolean | string;
        "rotation-per-second"?: string;
        "shadow-intensity"?: string;
        "environment-image"?: string;
        exposure?: string;
        "camera-orbit"?: string;
        "field-of-view"?: string;
        "interaction-prompt"?: string;
        ar?: boolean | string;
      };
    }
  }
}

type Screen = "generate" | "assets" | "observability" | "agents" | "providers" | "settings";
type Quality = "Draft" | "Balanced" | "High";
type MeshStyle = "Soft object" | "Hard surface" | "Product preview";

type Asset = {
  id: string;
  name: string;
  style: string;
  provider: string;
  score: number;
  createdAt: string;
  kind: "drone" | "crate" | "mech" | "console" | "platform" | "core";
  backend?: BackendAsset;
};

type BackendAsset = {
  asset_id: string;
  created_at: string;
  provider_name?: string;
  provider?: string;
  provider_type?: string;
  model_backend?: string;
  quality_preset?: Quality;
  mesh_style?: MeshStyle;
  seed?: number;
  notes?: string;
  dominant_color?: string;
  file_size_bytes?: number;
  status?: string;
  overall_quality_score?: number;
  limitations?: string;
  future_backends?: string[];
  quality_report?: {
    geometry_score?: number;
    topology_score?: number;
    material_score?: number;
    metadata_score?: number;
    reproducibility_score?: number;
    overall_score?: number;
    warnings?: string[];
  };
  activity_log?: { event: string; detail: string; timestamp: string }[];
  review_status?: string;
  review_notes?: string;
  parent_asset_id?: string | null;
  feedback?: string;
  regeneration_reason?: string | null;
  production_readiness?: { label: string; status: "pass" | "warning" | "fail" }[];
  checksums?: Record<string, string>;
  quality_gates?: {
    status: string;
    passed: boolean;
    checks: { label: string; passed: boolean; value?: string | number | boolean }[];
  };
  storage?: {
    files: { name: string; path?: string; exists: boolean; size_bytes: number; sha256?: string }[];
  };
  urls?: {
    glb?: string | null;
    metadata?: string | null;
    quality_report?: string | null;
    package_zip?: string | null;
    input_image?: string | null;
    activity_log?: string | null;
    manifest?: string | null;
  };
};

const API_BASE = "http://127.0.0.1:8000";

function fileUrl(path?: string | null) {
  if (!path) return undefined;
  return path.startsWith("http") ? path : `${API_BASE}${path}`;
}

function formatDate(value?: string) {
  if (!value) return "Not generated yet";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function assetKind(asset: BackendAsset): Asset["kind"] {
  const style = asset.mesh_style || "";
  if (style === "Soft object") return "core";
  if (style === "Product preview") return "crate";
  return "drone";
}

function toUiAsset(asset: BackendAsset): Asset {
  return {
    id: asset.asset_id,
    name: asset.asset_id.replace(/^asset_/, "Asset "),
    style: asset.mesh_style || "Generated Asset",
    provider: asset.provider_name || asset.provider || "Local Demo",
    score: asset.quality_report?.overall_score || asset.overall_quality_score || 0,
    createdAt: formatDate(asset.created_at),
    kind: assetKind(asset),
    backend: asset,
  };
}

const assets: Asset[] = [
  { id: "asset_7f3a9c1e", name: "Drone Mark IV", style: "Hard Surface", provider: "Local Demo", score: 92, createdAt: "May 24, 2026", kind: "drone" },
  { id: "asset_19c2b8dd", name: "Mech Sentinel", style: "Hard Surface", provider: "Local Demo", score: 89, createdAt: "May 23, 2026", kind: "mech" },
  { id: "asset_f4d9e2a7", name: "Industrial Generator", style: "Product Preview", provider: "Local Demo", score: 87, createdAt: "May 22, 2026", kind: "crate" },
  { id: "asset_2b7e44aa", name: "Sci-Fi Crate", style: "Product Preview", provider: "Local Demo", score: 85, createdAt: "May 21, 2026", kind: "crate" },
  { id: "asset_0c6ad9f1", name: "Hover Bike", style: "Hard Surface", provider: "Local Demo", score: 91, createdAt: "May 20, 2026", kind: "drone" },
  { id: "asset_a81d20be", name: "Power Cell", style: "Soft Object", provider: "Local Demo", score: 86, createdAt: "May 19, 2026", kind: "core" },
  { id: "asset_ba58e1c4", name: "Landing Pad", style: "Environment", provider: "Local Demo", score: 83, createdAt: "May 18, 2026", kind: "platform" },
  { id: "asset_347d210f", name: "Tech Console", style: "Product Preview", provider: "Local Demo", score: 88, createdAt: "May 17, 2026", kind: "console" },
];

const timeline = [
  ["Image uploaded", "2:32:10 PM"],
  ["Provider selected", "2:32:12 PM"],
  ["Dominant color", "2:32:18 PM"],
  ["GLB generated", "2:32:35 PM"],
  ["Metadata exported", "2:33:05 PM"],
  ["Quality report", "2:33:20 PM"],
  ["ZIP package", "2:34:00 PM"],
  ["Completed", "2:34:00 PM"],
];

function App() {
  const [screen, setScreen] = useState<Screen>("generate");
  const [quality, setQuality] = useState<Quality>("Balanced");
  const [meshStyle, setMeshStyle] = useState<MeshStyle>("Hard surface");
  const [seed, setSeed] = useState("482742");
  const [notes, setNotes] = useState("Clean topology, deterministic demo mesh, provider-aware metadata.");
  const [selectedAsset, setSelectedAsset] = useState<Asset>(assets[0]);
  const [backendAssets, setBackendAssets] = useState<BackendAsset[]>([]);
  const [generatedAsset, setGeneratedAsset] = useState<BackendAsset | null>(null);
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking");
  const [provider, setProvider] = useState("Local Demo (Active)");
  const [project, setProject] = useState("Sci-Fi Drone");

  const uiAssets = backendAssets.length > 0 ? backendAssets.map(toUiAsset) : assets;

  async function refreshAssets() {
    const response = await fetch(`${API_BASE}/api/assets`);
    if (!response.ok) throw new Error("Could not load assets");
    const data = await response.json();
    const nextAssets = data.assets || [];
    setBackendAssets(nextAssets);
    if (nextAssets.length > 0) {
      setGeneratedAsset(nextAssets[0]);
      setSelectedAsset(toUiAsset(nextAssets[0]));
    }
  }

  useEffect(() => {
    async function boot() {
      try {
        const health = await fetch(`${API_BASE}/api/health`);
        setApiStatus(health.ok ? "online" : "offline");
        if (health.ok) await refreshAssets();
      } catch {
        setApiStatus("offline");
      }
    }
    void boot();
  }, []);

  return (
    <main className="app-shell">
      <Sidebar screen={screen} setScreen={setScreen} />
      <section className="workspace">
        <Topbar apiStatus={apiStatus} provider={provider} setProvider={setProvider} project={project} setProject={setProject} screen={screen} />
        {screen === "generate" && (
          <GenerateScreenConnected
            quality={quality}
            setQuality={setQuality}
            meshStyle={meshStyle}
            setMeshStyle={setMeshStyle}
            seed={seed}
            setSeed={setSeed}
            notes={notes}
            setNotes={setNotes}
            generatedAsset={generatedAsset}
            setGeneratedAsset={setGeneratedAsset}
            onGenerated={async (asset) => {
              setGeneratedAsset(asset);
              setScreen("generate");
              await refreshAssets();
              setSelectedAsset(toUiAsset(asset));
            }}
            apiStatus={apiStatus}
            assets={backendAssets}
            refreshAssets={refreshAssets}
          />
        )}
        {screen === "assets" && <AssetsScreen selected={selectedAsset} setSelected={setSelectedAsset} assets={uiAssets} />}
        {screen === "observability" && <ObservabilityScreen assets={backendAssets} refreshAssets={refreshAssets} setGeneratedAsset={setGeneratedAsset} setScreen={setScreen} />}
        {screen === "agents" && <AgentsScreen />}
        {screen === "providers" && <ProvidersScreen />}
        {screen === "settings" && <SettingsScreen />}
      </section>
    </main>
  );
}

function Sidebar({ screen, setScreen }: { screen: Screen; setScreen: (screen: Screen) => void }) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const items = [
    ["generate", Sparkles, "Generate"],
    ["assets", Box, "Assets"],
    ["observability", Activity, "Observability"],
    ["providers", Cuboid, "Providers"],
    ["agents", Users, "Agents"],
    ["settings", Settings, "Settings"],
  ] as const;

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark danieloza-mark">
          <img src="/danieloza-logo.png" alt="DANIELOZA logo" />
        </div>
        <div>
          <strong>Agentic 3D</strong>
          <span>Asset Studio</span>
          <em>powered by DANIELOZA</em>
        </div>
      </div>

      <nav className="nav-list">
        {items.map(([key, Icon, label]) => (
          <button
            key={key}
            className={`nav-item ${screen === key ? "active" : ""}`}
            aria-label={label}
            onClick={() => setScreen(key)}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="credit-card">
        <div className="card-label">Workflow Credits</div>
        <strong>8,420 <span>/10,000</span></strong>
        <div className="progress"><i style={{ width: "86%" }} /></div>
        <p>Resets in 12 days</p>
        <button aria-label="Upgrade" onClick={() => setUpgradeOpen(!upgradeOpen)}>Upgrade <ChevronDown size={15} /></button>
        {upgradeOpen && (
          <div className="credit-popover">
            <strong>Portfolio Pro Mode</strong>
            <p>Unlocks provider routing, hosted inference adapters, team audit exports, and shared asset libraries.</p>
            <button onClick={() => setScreen("settings")}>Configure roadmap</button>
          </div>
        )}
      </div>

      <div className="build-card">
        <span>Agentic 3D v2.4.0</span>
        <small>Build 2026.05.15</small>
        <p><i /> Up to date</p>
      </div>
    </aside>
  );
}

function Topbar({
  apiStatus,
  provider,
  setProvider,
  project,
  setProject,
  screen,
}: {
  apiStatus: "checking" | "online" | "offline";
  provider: string;
  setProvider: (value: string) => void;
  project: string;
  setProject: (value: string) => void;
  screen: Screen;
}) {
  const [panel, setPanel] = useState<"help" | "notifications" | "account" | null>(null);

  useEffect(() => {
    setPanel(null);
  }, [screen]);

  return (
    <header className="topbar">
      <Dropdown
        label="Provider"
        value={provider}
        active
        options={["Local Demo (Active)", "TRELLIS (Not configured)", "TripoSR (Not configured)", "InstantMesh (Not configured)"]}
        onChange={setProvider}
      />
      <Dropdown
        label="Project"
        value={project}
        icon={<Folder size={16} />}
        options={["Sci-Fi Drone", "Product Preview", "Hard Surface Batch", "Internal Demo"]}
        onChange={setProject}
      />
      <div className="topbar-spacer" />
      <div className="system-pill"><i /> API {apiStatus === "online" ? "connected" : apiStatus}</div>
      <button className="icon-btn" aria-label="Help" onClick={() => setPanel(panel === "help" ? null : "help")}><CircleHelp size={20} /></button>
      <button className="icon-btn badge-dot" aria-label="Notifications" onClick={() => setPanel(panel === "notifications" ? null : "notifications")}><Bell size={20} /></button>
      <button className="avatar" aria-label="Workspace account" onClick={() => setPanel(panel === "account" ? null : "account")}>A</button>
      {panel && (
        <div className="top-popover">
          {panel === "help" && <>
            <strong>Help</strong>
            <p>Upload an image, choose quality and mesh style, then generate a local demo GLB package with metadata and quality diagnostics.</p>
            <button onClick={() => setPanel(null)}>Got it</button>
          </>}
          {panel === "notifications" && <>
            <strong>Notifications</strong>
            <p>API connected. Local Demo Provider is active. Real image-to-3D providers are not configured yet.</p>
            <button onClick={() => setPanel(null)}>Mark as read</button>
          </>}
          {panel === "account" && <>
            <strong>Workspace</strong>
            <p>Agentic 3D Asset Studio runs locally and stores generated assets under <code>outputs/assets</code>.</p>
            <button onClick={() => setPanel(null)}>Close</button>
          </>}
        </div>
      )}
    </header>
  );
}

function Dropdown({
  label,
  value,
  active,
  icon,
  options,
  onChange,
}: {
  label: string;
  value: string;
  active?: boolean;
  icon?: React.ReactNode;
  options?: string[];
  onChange?: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="dropdown-wrap" onMouseLeave={() => setOpen(false)}>
      <button className="dropdown-btn" onClick={() => setOpen(!open)}>
        <span>{label}</span>
        {active && <i />}
        {icon}
        <strong>{value}</strong>
        <ChevronDown size={16} />
      </button>
      {open && options && (
        <div className="dropdown-menu">
          {options.map((option) => (
            <button
              key={option}
              className={option === value ? "selected" : ""}
              onClick={() => {
                onChange?.(option);
                setOpen(false);
              }}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function GenerateScreenConnected({
  quality,
  setQuality,
  meshStyle,
  setMeshStyle,
  seed,
  setSeed,
  notes,
  setNotes,
  generatedAsset,
  onGenerated,
  apiStatus,
  assets,
  setGeneratedAsset,
  refreshAssets,
}: {
  quality: Quality;
  setQuality: (quality: Quality) => void;
  meshStyle: MeshStyle;
  setMeshStyle: (style: MeshStyle) => void;
  seed: string;
  setSeed: (seed: string) => void;
  notes: string;
  setNotes: (notes: string) => void;
  generatedAsset: BackendAsset | null;
  setGeneratedAsset: (asset: BackendAsset | null) => void;
  onGenerated: (asset: BackendAsset) => Promise<void>;
  apiStatus: "checking" | "online" | "offline";
  assets: BackendAsset[];
  refreshAssets: () => Promise<void>;
}) {
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [previewPanel, setPreviewPanel] = useState<"glb" | "assets" | "archive" | "quality" | "package" | null>(null);
  const displayScore = generatedAsset?.quality_report?.overall_score || generatedAsset?.overall_quality_score || 92;
  const displayAssetName = generatedAsset ? `${generatedAsset.asset_id}.glb` : "asset_482742.glb";
  const currentAssetIndex = generatedAsset ? assets.findIndex((asset) => asset.asset_id === generatedAsset.asset_id) : -1;

  function selectRelativeAsset(direction: -1 | 1) {
    if (assets.length === 0) return;
    const current = currentAssetIndex >= 0 ? currentAssetIndex : 0;
    const next = (current + direction + assets.length) % assets.length;
    setGeneratedAsset(assets[next]);
  }

  async function handleGenerate() {
    if (!sourceFile) {
      setError("Choose a source image first.");
      fileInput.current?.click();
      return;
    }
    if (apiStatus !== "online") {
      setError("Python API is offline. Start uvicorn on port 8000 first.");
      return;
    }

    setError("");
    setIsGenerating(true);
    const form = new FormData();
    form.append("image", sourceFile);
    form.append("quality_preset", quality);
    form.append("mesh_style", meshStyle);
    form.append("seed", String(Number(seed) || 482742));
    form.append("notes", notes);

    try {
      const response = await fetch(`${API_BASE}/api/generate`, { method: "POST", body: form });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || "Generation failed");
      }
      await onGenerated(await response.json());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="generate-grid">
      <section className="panel control-panel">
        <PanelTitle number="1" title="Source Image" />
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => setSourceFile(event.target.files?.[0] || null)}
        />
        <div className="dropzone" onClick={() => fileInput.current?.click()}>
          <AssetRender kind="drone" compact />
          <div>
            <strong>{sourceFile?.name || "Choose source image"}</strong>
            <p>{sourceFile ? `${Math.round(sourceFile.size / 1024)} KB - local upload - workflow input` : "PNG/JPG - local upload - workflow input"}</p>
            <button className="small-btn" type="button"><Upload size={15} /> Replace Image</button>
          </div>
          <button className="ghost-icon" type="button" onClick={(event) => { event.stopPropagation(); setSourceFile(null); }}>
            <X size={17} />
          </button>
          <span>Drag & drop an image here, or click to browse</span>
        </div>

        <PanelTitle number="2" title="Generation Settings" />
        <Segmented label="Quality" values={["Draft", "Balanced", "High"]} value={quality} onChange={(v) => setQuality(v as Quality)} />
        <Segmented label="Mesh Style" values={["Soft object", "Hard surface", "Product preview"]} value={meshStyle} onChange={(v) => setMeshStyle(v as MeshStyle)} />
        <SeedControl value={seed} onChange={setSeed} />
        <label className="notes-field">
          <span>Notes <small>(optional)</small></span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} />
          <em>{notes.length}/500</em>
        </label>
        {error && <p className="inline-error">{error}</p>}
        <button className="primary-action" onClick={handleGenerate} disabled={isGenerating}>
          <Sparkles size={24} /> {isGenerating ? "Generating..." : "Generate 3D Asset"}
        </button>
      </section>

      <section className="panel preview-panel">
        <div className="panel-header">
          <h3><Box size={18} /> Preview <span>- {displayAssetName}</span></h3>
          <div className="header-actions">
            <button onClick={() => setPreviewPanel(previewPanel === "glb" ? null : "glb")}>GLB</button>
            <button onClick={() => {
              selectRelativeAsset(1);
              setPreviewPanel(previewPanel === "assets" ? null : "assets");
            }}>{assets.length || 0} assets</button>
          </div>
        </div>
        <div className="hero-preview">
          <ModelPreview asset={generatedAsset} kind={generatedAsset ? assetKind(generatedAsset) : "drone"} />
          <button className="preview-nav previous" aria-label="Previous asset" onClick={() => selectRelativeAsset(-1)} disabled={assets.length < 2}><ChevronLeft size={20} /></button>
          <button className="preview-nav next" aria-label="Next asset" onClick={() => selectRelativeAsset(1)} disabled={assets.length < 2}><ChevronRight size={20} /></button>
          <div className="axis-widget"><span>X</span><span>Y</span><span>Z</span></div>
          <div className="preview-tools">
            <button aria-label="Open asset files" onClick={() => setPreviewPanel(previewPanel === "archive" ? null : "archive")}><Archive size={18} /></button>
            <button aria-label="Open quality diagnostics" onClick={() => setPreviewPanel(previewPanel === "quality" ? null : "quality")}><Gauge size={18} /></button>
            <button aria-label="Open package contents" onClick={() => setPreviewPanel(previewPanel === "package" ? null : "package")}><Package size={18} /></button>
          </div>
          {previewPanel && (
            <div className="preview-info-panel">
              <button aria-label="Close preview panel" onClick={() => setPreviewPanel(null)}><X size={15} /></button>
              {previewPanel === "glb" && <><strong>GLB Preview</strong><p>Interactive browser preview uses the generated <code>asset.glb</code> through model-viewer.</p></>}
              {previewPanel === "assets" && <><strong>Asset Switcher</strong><p>{assets.length || 0} generated assets are available. Use the left/right arrows to inspect another GLB.</p></>}
              {previewPanel === "archive" && <><strong>Asset Files</strong><p>Generated outputs include GLB, metadata JSON, quality report, activity log, input image, and ZIP package.</p></>}
              {previewPanel === "quality" && <><strong>Quality Diagnostics</strong><p>Rule-based demo scoring checks geometry, topology, material, metadata, and reproducibility signals.</p></>}
              {previewPanel === "package" && <><strong>Package Contents</strong><p>The downloadable package is agent-ready: asset, metadata, quality report, and usage instructions together.</p></>}
            </div>
          )}
          <div className="preview-dots">
            {(assets.length ? assets.slice(0, 7) : Array.from({ length: 7 })).map((_, i) => (
              <i key={i} className={i === Math.max(0, Math.min(currentAssetIndex, 6)) ? "on" : ""} />
            ))}
          </div>
        </div>
      </section>

      <SummaryCards asset={generatedAsset} score={displayScore} onAssetChanged={onGenerated} refreshAssets={refreshAssets} />
      <ActivityTimeline activity={generatedAsset?.activity_log} />
    </div>
  );
}

function PanelTitle({ number, title }: { number: string; title: string }) {
  return (
    <div className="panel-title">
      <span>{number}</span>
      <strong>{title}</strong>
    </div>
  );
}

function Segmented({
  label,
  values,
  value,
  onChange,
}: {
  label: string;
  values: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="segmented-row">
      <span>{label}</span>
      <div className="segmented">
        {values.map((item) => (
          <button key={item} className={item === value ? "active" : ""} onClick={() => onChange(item)}>
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

function SeedControl({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const numericValue = Number(value) || 1;
  const randomize = () => onChange(String(Math.floor(Math.random() * 9999) + 1));

  return (
    <div className="setting-row seed-row">
      <label>Seed</label>
      <div className="seed-control">
        <div className="seed-topline">
          <input value={value} onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 6))} />
          <button type="button" onClick={randomize}><Cuboid size={16} /> Random</button>
        </div>
        <input
          className="seed-slider"
          type="range"
          min="1"
          max="9999"
          value={Math.min(9999, Math.max(1, numericValue))}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      <p>Seed controls deterministic variation. Same image + settings + seed gives a reproducible demo mesh.</p>
    </div>
  );
}

function SummaryCards({
  asset,
  score = 92,
  onAssetChanged,
  refreshAssets,
}: {
  asset?: BackendAsset | null;
  score?: number;
  onAssetChanged?: (asset: BackendAsset) => Promise<void>;
  refreshAssets?: () => Promise<void>;
}) {
  const [exportOpen, setExportOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [feedback, setFeedback] = useState("Make it more hard-surface, reduce complexity, keep similar shape.");
  const [busyAction, setBusyAction] = useState("");
  const quality = asset?.quality_report || {};
  const openFile = (path?: string | null) => {
    const url = fileUrl(path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };
  const readiness = asset?.production_readiness || [
    { label: "GLB generated", status: "pass" },
    { label: "Metadata exported", status: "pass" },
    { label: "Quality report generated", status: "pass" },
    { label: "Asset package created", status: "pass" },
    { label: "Reproducible seed saved", status: "pass" },
    { label: "Human review required", status: "warning" },
    { label: "Not verified in game engine", status: "warning" },
    { label: "Demo provider, not real image-to-3D model", status: "warning" },
  ];

  async function updateReview(reviewStatus: string) {
    if (!asset) return;
    setBusyAction(reviewStatus);
    const form = new FormData();
    form.append("review_status", reviewStatus);
    form.append("review_notes", reviewNotes || asset.review_notes || "");
    const response = await fetch(`${API_BASE}/api/assets/${asset.asset_id}/review`, { method: "POST", body: form });
    setBusyAction("");
    if (!response.ok) return;
    await onAssetChanged?.(await response.json());
  }

  async function regenerateWithFeedback() {
    if (!asset) return;
    setBusyAction("regenerate");
    const form = new FormData();
    form.append("feedback", feedback);
    form.append("seed", String((asset.seed || 482742) + 1));
    const response = await fetch(`${API_BASE}/api/assets/${asset.asset_id}/regenerate`, { method: "POST", body: form });
    setBusyAction("");
    if (!response.ok) return;
    await onAssetChanged?.(await response.json());
  }

  async function replayRun() {
    if (!asset) return;
    setBusyAction("replay");
    const response = await fetch(`${API_BASE}/api/assets/${asset.asset_id}/replay`, { method: "POST" });
    setBusyAction("");
    if (!response.ok) return;
    await onAssetChanged?.(await response.json());
    await refreshAssets?.();
  }

  return (
    <section className="summary-grid">
      <div className="panel summary-card">
        <h3>Generation Summary</h3>
        <dl>
          <dt>Provider</dt><dd>{asset?.provider_name || "Local Demo"}</dd>
          <dt>Backend</dt><dd>{asset?.model_backend || "procedural-glb-demo"}</dd>
          <dt>Status</dt><dd>{asset?.status || "Ready"}</dd>
          <dt>Review</dt><dd>{asset?.review_status || "Needs Review"}</dd>
          <dt>Generated</dt><dd>{formatDate(asset?.created_at)}</dd>
          <dt>Package</dt><dd>GLB + JSON + ZIP</dd>
        </dl>
      </div>
      <div className="panel quality-card">
        <h3>Quality Score</h3>
        <ScoreRing score={score} />
        <div className="bars">
          {["Geometry", "Topology", "Material", "Metadata", "Overall"].map((label, i) => (
            <div key={label}><span>{label}</span><i><b style={{ width: `${[
              quality.geometry_score || 94,
              quality.topology_score || 91,
              quality.material_score || 86,
              quality.metadata_score || 96,
              score,
            ][i]}%` }} /></i><em>{[
              quality.geometry_score || 94,
              quality.topology_score || 91,
              quality.material_score || 86,
              quality.metadata_score || 96,
              score,
            ][i]}</em></div>
          ))}
        </div>
      </div>
      <div className="panel download-card">
        <h3>Download</h3>
        <p>Download the asset or the complete package with metadata and quality report.</p>
        <button className="download-main" onClick={() => openFile(asset?.urls?.glb)} disabled={!asset?.urls?.glb}><Download size={20} /> Download GLB</button>
        <div className="export-menu-wrap">
          <button className="export-btn" onClick={() => setExportOpen(!exportOpen)} disabled={!asset}><Package size={18} /> Export Options <ChevronDown size={16} /></button>
          {exportOpen && (
            <div className="export-menu">
              <button onClick={() => openFile(asset?.urls?.package_zip)} disabled={!asset?.urls?.package_zip}>Complete ZIP package</button>
              <button onClick={() => openFile(asset?.urls?.metadata)} disabled={!asset?.urls?.metadata}>metadata.json</button>
              <button onClick={() => openFile(asset?.urls?.quality_report)} disabled={!asset?.urls?.quality_report}>quality_report.json</button>
              <button onClick={() => openFile(asset?.urls?.activity_log)} disabled={!asset?.urls?.activity_log}>activity_log.json</button>
              <button onClick={() => openFile(asset?.urls?.manifest)} disabled={!asset?.urls?.manifest}>manifest.json</button>
            </div>
          )}
        </div>
      </div>
      <div className="panel review-card">
        <h3>Human Review</h3>
        <p>Approve, reject, or send the asset back for regeneration before downstream handoff.</p>
        <div className="review-status-row">
          {["Draft", "Needs Review", "Approved", "Rejected", "Final"].map((status) => (
            <button
              key={status}
              className={status === (asset?.review_status || "Needs Review") ? "active" : ""}
              onClick={() => updateReview(status)}
              disabled={!asset || busyAction === status}
            >
              {status}
            </button>
          ))}
        </div>
        <textarea
          value={reviewNotes || asset?.review_notes || ""}
          onChange={(event) => setReviewNotes(event.target.value)}
          placeholder="Add review notes for this asset..."
        />
        <button className="secondary-action" onClick={() => updateReview(asset?.review_status || "Needs Review")} disabled={!asset || !!busyAction}>Save Review Notes</button>
      </div>
      <div className="panel readiness-card">
        <h3>Production Readiness</h3>
        <div className="readiness-list">
          {readiness.map((item) => (
            <div key={item.label} className={item.status}>
              <span>{item.status === "pass" ? "✓" : item.status === "warning" ? "!" : "×"}</span>
              <strong>{item.label}</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="panel gates-card">
        <h3>Evaluation Gates</h3>
        <p>{asset?.quality_gates?.status || "Waiting for generated asset"}</p>
        <div className="gate-list">
          {(asset?.quality_gates?.checks || []).map((check) => (
            <div key={check.label} className={check.passed ? "pass" : "fail"}>
              <span>{check.passed ? "OK" : "Gate"}</span>
              <strong>{check.label}</strong>
              {check.value !== undefined && <em>{String(check.value)}</em>}
            </div>
          ))}
        </div>
      </div>
      <div className="panel regeneration-card">
        <h3>Regenerate with Feedback</h3>
        <p>Create a new version linked to this asset with parent_asset_id, feedback, and regeneration_reason saved in metadata.</p>
        <textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} />
        <button className="primary-action" onClick={regenerateWithFeedback} disabled={!asset || busyAction === "regenerate"}>
          <Sparkles size={20} /> {busyAction === "regenerate" ? "Regenerating..." : "Regenerate Variant"}
        </button>
        <button className="secondary-action" onClick={replayRun} disabled={!asset || busyAction === "replay"}>
          <Play size={17} /> {busyAction === "replay" ? "Replaying..." : "Replay Run"}
        </button>
        {asset?.parent_asset_id && <small>Parent asset: {asset.parent_asset_id}</small>}
      </div>
    </section>
  );
}

function ScoreRing({ score }: { score: number }) {
  return (
    <div className="score-ring" style={{ background: `conic-gradient(#7c3aed 0 ${score}%, #38bdf8 ${score}% 100%)` }}>
      <div><strong>{score}</strong><span>/100</span></div>
    </div>
  );
}

function ActivityTimeline({ activity }: { activity?: BackendAsset["activity_log"] }) {
  const rows = activity?.length
    ? activity.map((item) => [
      item.event.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
      new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(new Date(item.timestamp)),
    ])
    : timeline;

  return (
    <section className="panel activity-panel">
      <div className="panel-header"><h3><Activity size={18} /> Activity Log</h3><button>View full log</button></div>
      <div className="timeline">
        {rows.map(([label, time], index) => (
          <div className="timeline-item" key={label}>
            <b className={index === rows.length - 1 ? "done" : ""}>{index === rows.length - 1 ? <Check size={16} /> : <FileJson size={15} />}</b>
            <span>{label}</span>
            <small>{time}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function ModelPreview({ asset, kind, compact }: { asset?: BackendAsset | null; kind: Asset["kind"]; compact?: boolean }) {
  const src = fileUrl(asset?.urls?.glb);
  if (!src) {
    return (
      <div className={`model-preview-fallback ${compact ? "compact" : ""}`}>
        <AssetRender kind={kind} />
        {!compact && (
          <div className="preview-empty-note">
            <strong>Generate an asset to load the real GLB preview</strong>
            <span>The cockpit will render the generated <code>asset.glb</code> here.</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <model-viewer
      className={`model-viewer ${compact ? "compact" : ""}`}
      src={src}
      alt={`Generated 3D asset ${asset?.asset_id || ""}`}
      camera-controls
      auto-rotate
      rotation-per-second="24deg"
      shadow-intensity="0.55"
      environment-image="neutral"
      exposure="1"
      camera-orbit="35deg 62deg 4.2m"
      field-of-view="22deg"
      interaction-prompt="none"
    />
  );
}

function AssetsScreen({ selected, setSelected, assets }: { selected: Asset; setSelected: (asset: Asset) => void; assets: Asset[] }) {
  const openFile = (path?: string | null) => {
    const url = fileUrl(path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };
  const [search, setSearch] = useState("");
  const [meshFilter, setMeshFilter] = useState("All");
  const [providerFilter, setProviderFilter] = useState("All Providers");
  const [projectFilter, setProjectFilter] = useState("All Projects");

  const filteredAssets = assets.filter((asset) => {
    const searchable = `${asset.name} ${asset.id} ${asset.style} ${asset.provider}`.toLowerCase();
    const searchHit = searchable.includes(search.toLowerCase());
    const meshHit = meshFilter === "All" || asset.style.toLowerCase().includes(meshFilter.toLowerCase().replace(" surface", ""));
    const providerHit = providerFilter === "All Providers" || asset.provider.toLowerCase().includes(providerFilter.toLowerCase().replace(" provider", ""));
    return searchHit && meshHit && providerHit && projectFilter.length > 0;
  });

  return (
    <div className="assets-layout">
      <section className="assets-main">
        <div className="asset-toolbar">
          <div className="search"><Search size={18} /><input placeholder="Search assets..." value={search} onChange={(event) => setSearch(event.target.value)} /><span>Ctrl K</span></div>
          <Dropdown label="Provider" value={providerFilter === "All Providers" ? "Local Demo" : providerFilter} active options={["All Providers", "Local Demo Provider", "TRELLIS", "TripoSR"]} onChange={setProviderFilter} />
          <Dropdown label="Project" value={projectFilter === "All Projects" ? "Sci-Fi Drone" : projectFilter} icon={<Folder size={16} />} options={["All Projects", "Sci-Fi Drone", "Product Preview", "Internal Demo"]} onChange={setProjectFilter} />
        </div>
        <div className="asset-title-row">
          <div><h2>Assets</h2><p>Browse and manage your generated 3D assets.</p></div>
          <span>{filteredAssets.length} / {assets.length} assets</span>
        </div>
        <div className="asset-content">
          <aside className="filters panel">
            <h3>Filters <button onClick={() => { setSearch(""); setMeshFilter("All"); setProviderFilter("All Providers"); setProjectFilter("All Projects"); }}>Clear all</button></h3>
            <FilterGroup title="Project" items={["All Projects", "Sci-Fi Drone", "Product Preview", "Internal Demo"]} value={projectFilter} onChange={setProjectFilter} />
            <FilterGroup title="Mesh Style" items={["All", "Hard Surface", "Product Preview", "Soft Object", "Environment"]} value={meshFilter} onChange={setMeshFilter} chips />
            <FilterGroup title="Provider" items={["All Providers", "Local Demo Provider", "TRELLIS", "TripoSR"]} value={providerFilter} onChange={setProviderFilter} checks />
          </aside>
          <div className="asset-grid">
            {filteredAssets.map((asset) => (
              <button key={asset.id} className={`asset-card panel ${selected.id === asset.id ? "selected" : ""}`} onClick={() => setSelected(asset)}>
                <AssetRender kind={asset.kind} card />
                <strong>{asset.name}</strong>
                <span>{asset.style}</span>
                <div><i /> {asset.provider}<em>{asset.score} /100</em></div>
              </button>
            ))}
            {filteredAssets.length === 0 && (
              <div className="empty-results panel">
                <strong>No assets match these filters</strong>
                <span>Clear filters or generate another asset.</span>
              </div>
            )}
          </div>
        </div>
      </section>
      <aside className="asset-inspector panel">
        <div className="inspector-head"><strong>{selected.name}</strong><button><X size={18} /></button></div>
        <div className="inspector-preview"><ModelPreview asset={selected.backend} kind={selected.kind} compact /></div>
        <div className="inspector-tabs"><button className="selected">Overview</button><button>History</button><button>Files</button></div>
        <div className="inspector-grid">
          <div className="panel metric-panel"><h3>Quality Score</h3><ScoreRing score={selected.score} /></div>
          <div className="panel details-panel"><h3>Asset Details</h3><dl><dt>Mesh Style</dt><dd>{selected.style}</dd><dt>Provider</dt><dd>{selected.provider}</dd><dt>File Size</dt><dd>{selected.backend?.file_size_bytes ? `${Math.round(selected.backend.file_size_bytes / 1024)} KB` : "Demo"}</dd><dt>Status</dt><dd>{selected.backend?.status || "Completed"}</dd></dl></div>
          <div className="panel storage-panel">
            <h3>Storage Inspector</h3>
            {(selected.backend?.storage?.files || []).map((file) => (
              <div key={file.name} className={file.exists ? "ok" : "missing"}>
                <span>{file.exists ? "OK" : "Missing"}</span>
                <strong>{file.name}</strong>
                <em>{file.size_bytes ? `${Math.round(file.size_bytes / 1024)} KB` : "-"}</em>
                {file.sha256 && <small>SHA256 {file.sha256.slice(0, 12)}...</small>}
              </div>
            ))}
          </div>
          <div className="panel export-panel">
            <h3>Download & Export</h3>
            <button className="download-main" onClick={() => openFile(selected.backend?.urls?.glb)} disabled={!selected.backend?.urls?.glb}><Download size={18} /> Download GLB</button>
            <button className="export-btn" onClick={() => openFile(selected.backend?.urls?.metadata)} disabled={!selected.backend?.urls?.metadata}>metadata.json</button>
            <button className="export-btn" onClick={() => openFile(selected.backend?.urls?.quality_report)} disabled={!selected.backend?.urls?.quality_report}>quality_report.json</button>
          </div>
        </div>
      </aside>
    </div>
  );
}
function FilterGroup({
  title,
  items,
  value,
  onChange,
  chips,
  checks,
}: {
  title: string;
  items: string[];
  value: string;
  onChange: (value: string) => void;
  chips?: boolean;
  checks?: boolean;
}) {
  return (
    <div className="filter-group">
      <h4>{title}</h4>
      <div className={chips ? "chip-list" : "check-list"}>
        {items.map((item) => (
          <button key={item} className={item === value ? "selected" : ""} onClick={() => onChange(item)}>
            {checks && <i />} {item}
          </button>
        ))}
      </div>
    </div>
  );
}

function ObservabilityScreen({
  assets,
  refreshAssets,
  setGeneratedAsset,
  setScreen,
}: {
  assets: BackendAsset[];
  refreshAssets: () => Promise<void>;
  setGeneratedAsset: (asset: BackendAsset | null) => void;
  setScreen: (screen: Screen) => void;
}) {
  const [summary, setSummary] = useState<any>(null);
  const [loadingDemo, setLoadingDemo] = useState(false);

  async function loadSummary() {
    const response = await fetch(`${API_BASE}/api/observability`);
    if (response.ok) setSummary(await response.json());
  }

  async function loadDemoProject() {
    setLoadingDemo(true);
    const response = await fetch(`${API_BASE}/api/demo-project`, { method: "POST" });
    setLoadingDemo(false);
    if (response.ok) {
      const payload = await response.json();
      await refreshAssets();
      setGeneratedAsset(payload.created?.[0] || null);
      await loadSummary();
    }
  }

  useEffect(() => {
    void loadSummary();
  }, [assets.length]);

  const totalStorageMb = summary ? (summary.total_storage_bytes / (1024 * 1024)).toFixed(2) : "0.00";
  const latest = assets[0];

  return (
    <div className="observability-layout">
      <section className="panel observability-hero">
        <div>
          <h2>Workflow Observability</h2>
          <p>Track local generation runs, quality gates, storage usage, replayability, and demo project readiness.</p>
        </div>
        <button className="primary-action" onClick={loadDemoProject} disabled={loadingDemo}>
          <Sparkles size={20} /> {loadingDemo ? "Loading demo..." : "Load Demo Project"}
        </button>
      </section>

      <section className="observability-grid">
        <MetricTile label="Total runs" value={summary?.total_runs ?? assets.length} />
        <MetricTile label="Success rate" value={`${summary?.success_rate ?? 0}%`} />
        <MetricTile label="Average quality" value={summary?.average_quality_score ?? 0} />
        <MetricTile label="Failed gates" value={summary?.failed_quality_gates ?? 0} />
        <MetricTile label="Storage used" value={`${totalStorageMb} MB`} />
        <MetricTile label="Most used preset" value={summary?.most_used_preset ?? "None"} />
      </section>

      <section className="panel replay-panel">
        <h3>Run Replay</h3>
        <p>Replay the latest run from saved metadata: input image, provider, quality, mesh style, seed, and notes.</p>
        <dl>
          <dt>Latest run</dt><dd>{latest?.asset_id || "No asset yet"}</dd>
          <dt>Seed</dt><dd>{latest?.seed || "-"}</dd>
          <dt>Provider</dt><dd>{latest?.provider_name || "-"}</dd>
          <dt>Input hash</dt><dd>{latest?.checksums?.input_sha256?.slice(0, 18) || "-"}</dd>
        </dl>
        <button className="secondary-action" disabled={!latest} onClick={async () => {
          if (!latest) return;
          const response = await fetch(`${API_BASE}/api/assets/${latest.asset_id}/replay`, { method: "POST" });
          if (response.ok) {
            setGeneratedAsset(await response.json());
            await refreshAssets();
            setScreen("generate");
          }
        }}>Replay Latest Run</button>
      </section>

      <section className="panel gate-overview">
        <h3>Quality Gate Overview</h3>
        {(assets.slice(0, 5)).map((asset) => (
          <div key={asset.asset_id} className={asset.quality_gates?.passed ? "pass" : "fail"}>
            <strong>{asset.asset_id}</strong>
            <span>{asset.quality_gates?.status || "Not evaluated"}</span>
            <em>{asset.overall_quality_score || 0}/100</em>
          </div>
        ))}
      </section>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="panel metric-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AgentsScreen() {
  const [runState, setRunState] = useState<"idle" | "running" | "completed">("idle");
  const [selectedTool, setSelectedTool] = useState("generate_3d_asset");

  function runTool() {
    setRunState("running");
    window.setTimeout(() => setRunState("completed"), 850);
  }

  return (
    <div className="agents-layout">
      <section className="agents-main">
        <div className="agent-hero panel">
          <div>
            <h2>Agent Mode</h2>
            <p>Use the generate_3d_asset tool to create governed GLB asset packages with metadata and diagnostics.</p>
            <div className="tool-pill"><span>Tool</span><strong>{selectedTool}</strong><em>{runState === "running" ? "Running" : "Stable"}</em></div>
          </div>
          <div className="agent-cube"><Layers3 size={82} /></div>
        </div>
        <div className="schema-grid">
          <SchemaCard title="Input Schema" rows={[["source_image", "string", "required"], ["quality_preset", "string", "default: balanced"], ["mesh_style", "string", "default: hard_surface"], ["seed", "integer", "optional"]]} />
          <SchemaCard title="Output Schema" rows={[["asset_id", "string", "unique identifier"], ["preview", "object", "turntable render"], ["files", "object", "GLB, metadata, quality"], ["quality", "object", "rule-based score"]]} />
          <div className="panel constraints"><h3><ShieldCheck size={18} /> Safe Use & Constraints</h3>{["Respect copyright", "No real model claim", "Human review required", "Report limitations"].map((item) => <p key={item}><BadgeCheck size={18} /> <span>{item}</span><small>Provider-aware disclosure is required.</small></p>)}</div>
        </div>
        <ActivityTimeline />
      </section>
      <aside className="agent-run panel">
        <h3>Selected Run <span>Completed</span></h3>
        <div className="inspector-preview"><AssetRender kind="drone" /></div>
        <button className="file-row"><FileJson size={20} /> metadata.json <span>View</span></button>
        <button className="file-row"><ShieldCheck size={20} /> quality_report.json <span>View</span></button>
        <div className="panel metric-panel"><ScoreRing score={92} /></div>
        {runState !== "idle" && (
          <div className={`agent-run-state ${runState}`}>
            <strong>{runState === "running" ? "Running agent workflow..." : "Agent run completed"}</strong>
            <span>{runState === "running" ? "Validating input schema, provider limits, and package output." : "Generated demo run with metadata, quality report, and package delivery."}</span>
          </div>
        )}
        <button className="primary-action" onClick={runTool} disabled={runState === "running"}><Play size={20} /> {runState === "running" ? "Running..." : "Run Tool"}</button>
        <button className="secondary-action" onClick={() => {
          setSelectedTool(selectedTool === "generate_3d_asset" ? "validate_asset_package" : "generate_3d_asset");
          setRunState("idle");
        }}>Switch Tool</button>
      </aside>
    </div>
  );
}

function SchemaCard({ title, rows }: { title: string; rows: [string, string, string][] }) {
  return (
    <div className="panel schema-card">
      <h3>{title}</h3>
      {rows.map(([name, type, desc]) => <p key={name}><strong>{name}</strong><span>{type}</span><em>{desc}</em></p>)}
    </div>
  );
}

function ProvidersScreen() {
  return (
    <div className="providers-grid">
      {["Local Demo Provider", "TRELLIS", "TripoSR", "Stable Fast 3D", "InstantMesh"].map((name, index) => (
        <div key={name} className="panel provider-card">
          <div className="provider-icon"><Database size={30} /></div>
          <h3>{name}</h3>
          <span className={index === 0 ? "active" : ""}>{index === 0 ? "Active" : "Not configured"}</span>
          <p>{index === 0 ? "Deterministic workflow backend for GLB package generation and UI validation." : "Placeholder adapter for future real image-to-3D inference integration."}</p>
        </div>
      ))}
    </div>
  );
}

function SettingsScreen() {
  const [settings, setSettings] = useState({
    darkOnly: true,
    savePackages: true,
    strictDisclosure: true,
    agentMode: true,
  });
  const toggle = (key: keyof typeof settings) => setSettings((current) => ({ ...current, [key]: !current[key] }));

  return (
    <div className="settings-layout">
      <section className="panel settings-panel">
        <h2>Settings / About</h2>
        <p>Agentic 3D Asset Studio is a premium workflow layer for agent-ready 3D asset generation. The active provider is deterministic local demo generation, not a foundation image-to-3D model.</p>
        <div className="settings-grid">
          <div><strong>Current mode</strong><span>Dark-only cockpit UI</span></div>
          <div><strong>Backend claim</strong><span>Workflow layer, not foundation model</span></div>
          <div><strong>Outputs</strong><span>GLB, metadata, quality report, package ZIP</span></div>
          <div><strong>Workspace</strong><span>Local outputs under outputs/assets</span></div>
        </div>
      </section>

      <section className="panel settings-panel">
        <h2>Workspace Controls</h2>
        <div className="settings-list">
          <button onClick={() => toggle("darkOnly")}><span>Dark-only product UI</span><strong>{settings.darkOnly ? "Enabled" : "Disabled"}</strong></button>
          <button onClick={() => toggle("savePackages")}><span>Save ZIP packages</span><strong>{settings.savePackages ? "Enabled" : "Disabled"}</strong></button>
          <button onClick={() => toggle("strictDisclosure")}><span>Provider disclosure guardrail</span><strong>{settings.strictDisclosure ? "Strict" : "Relaxed"}</strong></button>
          <button onClick={() => toggle("agentMode")}><span>Agent-readable outputs</span><strong>{settings.agentMode ? "Enabled" : "Disabled"}</strong></button>
        </div>
      </section>

      <section className="panel settings-panel">
        <h2>Provider Roadmap</h2>
        <div className="roadmap-list">
          {["TRELLIS adapter", "TripoSR adapter", "Stable Fast 3D adapter", "InstantMesh adapter", "Three.js inspection tools"].map((item, index) => (
            <div key={item}><span>{index + 1}</span><strong>{item}</strong><em>{index === 0 ? "next" : "planned"}</em></div>
          ))}
        </div>
      </section>
    </div>
  );
}

function AssetRender({ kind, compact, card }: { kind: Asset["kind"]; compact?: boolean; card?: boolean }) {
  const body = useMemo(() => {
    if (kind === "drone") {
      return <><i className="drone-core" /><i className="arm a1" /><i className="arm a2" /><i className="arm a3" /><i className="arm a4" /><i className="rotor r1" /><i className="rotor r2" /><i className="rotor r3" /><i className="rotor r4" /></>;
    }
    if (kind === "mech") return <><i className="mech-body" /><i className="mech-head" /><i className="leg l1" /><i className="leg l2" /></>;
    if (kind === "core") return <><i className="core-orb" /><i className="core-ring" /></>;
    return <><i className="crate-main" /><i className="crate-line one" /><i className="crate-line two" /><i className="crate-light" /></>;
  }, [kind]);
  return <div className={`asset-render ${kind} ${compact ? "compact" : ""} ${card ? "card-render" : ""}`}>{body}</div>;
}

createRoot(document.getElementById("root")!).render(<App />);

