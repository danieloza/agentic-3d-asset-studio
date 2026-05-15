import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  Archive,
  BadgeCheck,
  Bell,
  Box,
  Check,
  ChevronDown,
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

type Screen = "generate" | "assets" | "agents" | "providers" | "settings";
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
  urls?: {
    glb?: string | null;
    metadata?: string | null;
    quality_report?: string | null;
    package_zip?: string | null;
    input_image?: string | null;
    activity_log?: string | null;
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

  const uiAssets = backendAssets.length > 0 ? backendAssets.map(toUiAsset) : assets;

  async function refreshAssets() {
    const response = await fetch(`${API_BASE}/api/assets`);
    if (!response.ok) throw new Error("Could not load assets");
    const data = await response.json();
    const nextAssets = data.assets || [];
    setBackendAssets(nextAssets);
    if (nextAssets.length > 0) {
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
        <Topbar apiStatus={apiStatus} />
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
          />
        )}
        {screen === "assets" && <AssetsScreen selected={selectedAsset} setSelected={setSelectedAsset} assets={uiAssets} />}
        {screen === "agents" && <AgentsScreen />}
        {screen === "providers" && <ProvidersScreen />}
        {screen === "settings" && <SettingsScreen />}
      </section>
    </main>
  );
}

function Sidebar({ screen, setScreen }: { screen: Screen; setScreen: (screen: Screen) => void }) {
  const items = [
    ["generate", Sparkles, "Generate"],
    ["assets", Box, "Assets"],
    ["providers", Cuboid, "Providers"],
    ["agents", Users, "Agents"],
    ["settings", Settings, "Settings"],
  ] as const;

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <Layers3 size={28} />
        </div>
        <div>
          <strong>Agentic 3D</strong>
          <span>Asset Studio</span>
        </div>
      </div>

      <nav className="nav-list">
        {items.map(([key, Icon, label]) => (
          <button
            key={key}
            className={`nav-item ${screen === key ? "active" : ""}`}
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
        <button>Upgrade <ChevronDown size={15} /></button>
      </div>

      <div className="build-card">
        <span>Agentic 3D v2.4.0</span>
        <small>Build 2026.05.15</small>
        <p><i /> Up to date</p>
      </div>
    </aside>
  );
}

function Topbar({ apiStatus }: { apiStatus: "checking" | "online" | "offline" }) {
  return (
    <header className="topbar">
      <Dropdown label="Provider" value="Local Demo (Active)" active />
      <Dropdown label="Project" value="Sci-Fi Drone" icon={<Folder size={16} />} />
      <div className="topbar-spacer" />
      <div className="system-pill"><i /> API {apiStatus === "online" ? "connected" : apiStatus}</div>
      <button className="icon-btn"><CircleHelp size={20} /></button>
      <button className="icon-btn badge-dot"><Bell size={20} /></button>
      <button className="avatar">A</button>
    </header>
  );
}

function Dropdown({ label, value, active, icon }: { label: string; value: string; active?: boolean; icon?: React.ReactNode }) {
  return (
    <button className="dropdown-btn">
      <span>{label}</span>
      {active && <i />}
      {icon}
      <strong>{value}</strong>
      <ChevronDown size={16} />
    </button>
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
}) {
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const displayScore = generatedAsset?.quality_report?.overall_score || generatedAsset?.overall_quality_score || 92;
  const displayAssetName = generatedAsset ? `${generatedAsset.asset_id}.glb` : "asset_482742.glb";

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
            <p>{sourceFile ? `${Math.round(sourceFile.size / 1024)} KB · local upload · workflow input` : "PNG/JPG · local upload · workflow input"}</p>
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
        <LabeledInput label="Seed" value={seed} onChange={setSeed} icon={<Cuboid size={17} />} />
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
          <h3><Box size={18} /> Preview <span>· {displayAssetName}</span></h3>
          <div className="header-actions"><button>GLB</button><button>•••</button></div>
        </div>
        <div className="hero-preview">
          <AssetRender kind={generatedAsset ? assetKind(generatedAsset) : "drone"} />
          <div className="axis-widget"><span>X</span><span>Y</span><span>Z</span></div>
          <div className="preview-tools">
            <button><Archive size={18} /></button>
            <button><Gauge size={18} /></button>
            <button><Package size={18} /></button>
          </div>
          <div className="preview-dots">{Array.from({ length: 7 }).map((_, i) => <i key={i} className={i === 0 ? "on" : ""} />)}</div>
        </div>
      </section>

      <SummaryCards asset={generatedAsset} score={displayScore} />
      <ActivityTimeline activity={generatedAsset?.activity_log} />
    </div>
  );
}

function GenerateScreen({
  quality,
  setQuality,
  meshStyle,
  setMeshStyle,
  seed,
  setSeed,
  notes,
  setNotes,
}: {
  quality: Quality;
  setQuality: (quality: Quality) => void;
  meshStyle: MeshStyle;
  setMeshStyle: (style: MeshStyle) => void;
  seed: string;
  setSeed: (seed: string) => void;
  notes: string;
  setNotes: (notes: string) => void;
}) {
  return (
    <div className="generate-grid">
      <section className="panel control-panel">
        <PanelTitle number="1" title="Source Image" />
        <div className="dropzone">
          <AssetRender kind="drone" compact />
          <div>
            <strong>reference_object.png</strong>
            <p>PNG · local upload · workflow input</p>
            <button className="small-btn"><Upload size={15} /> Replace Image</button>
          </div>
          <button className="ghost-icon"><X size={17} /></button>
          <span>Drag & drop an image here, or click to browse</span>
        </div>

        <PanelTitle number="2" title="Generation Settings" />
        <Segmented label="Quality" values={["Draft", "Balanced", "High"]} value={quality} onChange={(v) => setQuality(v as Quality)} />
        <Segmented label="Mesh Style" values={["Soft object", "Hard surface", "Product preview"]} value={meshStyle} onChange={(v) => setMeshStyle(v as MeshStyle)} />
        <LabeledInput label="Seed" value={seed} onChange={setSeed} icon={<Cuboid size={17} />} />
        <label className="notes-field">
          <span>Notes <small>(optional)</small></span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} />
          <em>{notes.length}/500</em>
        </label>
        <button className="primary-action"><Sparkles size={24} /> Generate 3D Asset</button>
      </section>

      <section className="panel preview-panel">
        <div className="panel-header">
          <h3><Box size={18} /> Preview <span>· asset_482742.glb</span></h3>
          <div className="header-actions"><button>GLB</button><button>•••</button></div>
        </div>
        <div className="hero-preview">
          <AssetRender kind="drone" />
          <div className="axis-widget"><span>X</span><span>Y</span><span>Z</span></div>
          <div className="preview-tools">
            <button><Archive size={18} /></button>
            <button><Gauge size={18} /></button>
            <button><Package size={18} /></button>
          </div>
          <div className="preview-dots">{Array.from({ length: 7 }).map((_, i) => <i key={i} className={i === 0 ? "on" : ""} />)}</div>
        </div>
      </section>

      <SummaryCards />
      <ActivityTimeline />
    </div>
  );
}

function PanelTitle({ number, title }: { number: string; title: string }) {
  return (
    <div className="panel-title">
      <b>{number}</b>
      <h3>{title}</h3>
    </div>
  );
}

function Segmented({ label, values, value, onChange }: { label: string; values: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="setting-row">
      <label>{label}</label>
      <div className="segmented">
        {values.map((item) => (
          <button key={item} className={item === value ? "selected" : ""} onClick={() => onChange(item)}>
            {item}
          </button>
        ))}
      </div>
      <p>{value === "Balanced" ? "Balanced speed and detail for most use cases." : "Provider-aware deterministic demo setting."}</p>
    </div>
  );
}

function LabeledInput({ label, value, onChange, icon }: { label: string; value: string; onChange: (value: string) => void; icon: React.ReactNode }) {
  return (
    <label className="setting-row input-row">
      <span>{label}</span>
      <div className="input-shell">
        <input value={value} onChange={(event) => onChange(event.target.value)} />
        {icon}
      </div>
      <p>Reproducible output with deterministic seed.</p>
    </label>
  );
}

function SummaryCards({ asset, score = 92 }: { asset?: BackendAsset | null; score?: number }) {
  const quality = asset?.quality_report || {};
  const openFile = (path?: string | null) => {
    const url = fileUrl(path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="summary-grid">
      <div className="panel summary-card">
        <h3>Generation Summary</h3>
        <dl>
          <dt>Provider</dt><dd>{asset?.provider_name || "Local Demo"}</dd>
          <dt>Backend</dt><dd>{asset?.model_backend || "procedural-glb-demo"}</dd>
          <dt>Status</dt><dd>{asset?.status || "Ready"}</dd>
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
        <button className="export-btn" onClick={() => openFile(asset?.urls?.package_zip)} disabled={!asset?.urls?.package_zip}><Package size={18} /> Download Asset Package <ChevronDown size={16} /></button>
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

function AssetsScreen({ selected, setSelected, assets }: { selected: Asset; setSelected: (asset: Asset) => void; assets: Asset[] }) {
  const openFile = (path?: string | null) => {
    const url = fileUrl(path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="assets-layout">
      <section className="assets-main">
        <div className="asset-toolbar">
          <div className="search"><Search size={18} /><input placeholder="Search assets..." /><span>⌘K</span></div>
          <Dropdown label="Provider" value="Local Demo" active />
          <Dropdown label="Project" value="Sci-Fi Drone" icon={<Folder size={16} />} />
        </div>
        <div className="asset-title-row">
          <div><h2>Assets</h2><p>Browse and manage your generated 3D assets.</p></div>
          <span>{assets.length} assets</span>
        </div>
        <div className="asset-content">
          <aside className="filters panel">
            <h3>Filters <button>Clear all</button></h3>
            <FilterGroup title="Project" items={["All Projects"]} />
            <FilterGroup title="Mesh Style" items={["All", "Hard Surface", "Organic", "Stylized", "Environment"]} chips />
            <FilterGroup title="Provider" items={["All Providers", "Local Demo", "TRELLIS", "TripoSR"]} checks />
          </aside>
          <div className="asset-grid">
            {assets.map((asset) => (
              <button key={asset.id} className={`asset-card panel ${selected.id === asset.id ? "selected" : ""}`} onClick={() => setSelected(asset)}>
                <AssetRender kind={asset.kind} card />
                <strong>{asset.name}</strong>
                <span>{asset.style}</span>
                <div><i /> {asset.provider}<em>{asset.score} /100</em></div>
              </button>
            ))}
          </div>
        </div>
      </section>
      <aside className="asset-inspector panel">
        <div className="inspector-head"><strong>{selected.name}</strong><button><X size={18} /></button></div>
        <div className="inspector-preview"><AssetRender kind={selected.kind} /></div>
        <div className="inspector-tabs"><button className="selected">Overview</button><button>History</button><button>Files</button></div>
        <div className="inspector-grid">
          <div className="panel metric-panel"><h3>Quality Score</h3><ScoreRing score={selected.score} /></div>
          <div className="panel details-panel"><h3>Asset Details</h3><dl><dt>Mesh Style</dt><dd>{selected.style}</dd><dt>Provider</dt><dd>{selected.provider}</dd><dt>File Size</dt><dd>{selected.backend?.file_size_bytes ? `${Math.round(selected.backend.file_size_bytes / 1024)} KB` : "Demo"}</dd><dt>Status</dt><dd>{selected.backend?.status || "Completed"}</dd></dl></div>
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

function FilterGroup({ title, items, chips, checks }: { title: string; items: string[]; chips?: boolean; checks?: boolean }) {
  return (
    <div className="filter-group">
      <h4>{title}</h4>
      <div className={chips ? "chip-list" : "check-list"}>
        {items.map((item, index) => (
          <button key={item} className={index === 0 ? "selected" : ""}>
            {checks && <i />} {item}
          </button>
        ))}
      </div>
    </div>
  );
}

function AgentsScreen() {
  return (
    <div className="agents-layout">
      <section className="agents-main">
        <div className="agent-hero panel">
          <div>
            <h2>Agent Mode</h2>
            <p>Use the generate_3d_asset tool to create governed GLB asset packages with metadata and diagnostics.</p>
            <div className="tool-pill"><span>Tool</span><strong>generate_3d_asset</strong><em>Stable</em></div>
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
        <button className="primary-action"><Play size={20} /> Run Tool</button>
        <button className="secondary-action">Simulate Agent Run</button>
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
  return (
    <section className="panel settings-panel">
      <h2>Settings / About</h2>
      <p>This product UI is a premium frontend shell for Agentic 3D Asset Studio. The active generation provider remains the deterministic Local Demo Provider.</p>
      <div className="settings-grid">
        <div><strong>Current mode</strong><span>Dark-only cockpit UI</span></div>
        <div><strong>Backend claim</strong><span>Workflow layer, not foundation model</span></div>
        <div><strong>Outputs</strong><span>GLB, metadata, quality report, package ZIP</span></div>
      </div>
    </section>
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
