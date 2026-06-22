/**
 * /digital-twin
 *
 * The city operations centre. A 3D procedural city replaces all 2D cards/circles.
 * Each backend sector is rendered as an interactive district with buildings, roads,
 * and data-driven visual encoding. The right panel handles inspection, alerts, and
 * AI predictions.
 */

import { useState, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Layers,
  Loader2,
  Navigation,
  RotateCcw,
  Sparkles,
  Users,
  Wind,
  Zap,
  Leaf,
} from "lucide-react";
import { PageHeader } from "@/components/neuro/SectionHeader";
import { CityCanvas } from "@/components/neuro/CityCanvas";
import type { LayerId } from "@/components/neuro/CityCanvas";
import {
  useDigitalTwinSectors,
  useDigitalTwinMetrics,
  useDigitalTwinPredictions,
  useDigitalTwinAlerts,
} from "@/hooks/useDigitalTwin";
import type { CityAlert, CityPrediction, Sector } from "@/types/city";
import { getSectorStatus, STATUS_COLORS } from "@/types/city";

// ─── Route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/digital-twin")({
  head: () => ({ meta: [{ title: "Digital Twin · NeuroCity" }] }),
  component: DigitalTwinPage,
});

// ─── Layer config ─────────────────────────────────────────────────────────────

interface LayerDef {
  id: LayerId;
  label: string;
  description: string;
  color: string;
  icon: typeof Navigation;
}

const LAYERS: LayerDef[] = [
  { id: "traffic",        label: "Traffic",        description: "Road congestion index",     color: "var(--color-traffic)",        icon: Navigation },
  { id: "pollution",      label: "Pollution",      description: "Air quality index (AQI)",   color: "var(--color-environment)",    icon: Wind },
  { id: "infrastructure", label: "Infrastructure", description: "Infrastructure health %",   color: "var(--color-infrastructure)", icon: Building2 },
  { id: "population",     label: "Population",     description: "District density",           color: "var(--color-info)",           icon: Users },
  { id: "utilities",      label: "Utilities",      description: "Energy usage (kWh)",         color: "var(--color-ai)",             icon: Zap },
];

// ─── Colour maps ──────────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  Critical: "var(--color-risk)",
  High:     "#f97316",
  Medium:   "var(--color-traffic)",
  Low:      "var(--color-info)",
};

const PREDICTION_COLORS: Record<string, string> = {
  Traffic:        "var(--color-traffic)",
  Environment:    "var(--color-environment)",
  Infrastructure: "var(--color-infrastructure)",
  Energy:         "var(--color-ai)",
  "City Health":  "var(--color-success)",
};

// ─── Header metric pill ───────────────────────────────────────────────────────

function MetricPill({
  label, value, color, icon: Icon,
}: {
  label: string; value: string | number; color: string; icon: typeof Activity;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
        style={{ backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)`, color }}>
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold leading-tight">{value}</div>
      </div>
    </div>
  );
}

// ─── Layer controls (floating inside canvas) ──────────────────────────────────

function LayerPanel({
  activeId, onChange,
}: {
  activeId: LayerId; onChange: (id: LayerId) => void;
}) {
  return (
    <div className="glass-panel rounded-2xl p-2 shadow-[var(--shadow-elevated)]"
      style={{ backdropFilter: "blur(12px)", background: "rgba(10,22,40,0.82)" }}>
      <div className="px-2 pb-1 pt-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        Layers
      </div>
      {LAYERS.map((l) => {
        const on = activeId === l.id;
        return (
          <button key={l.id} onClick={() => onChange(l.id)} aria-pressed={on}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-all hover:bg-white/5"
            title={l.description}>
            <span className="h-2 w-2 rounded-full transition-colors"
              style={{ background: on ? l.color : "rgba(255,255,255,0.15)" }} />
            <l.icon className="h-3.5 w-3.5"
              style={{ color: on ? l.color : "rgba(255,255,255,0.4)" }} />
            <span style={{ color: on ? l.color : "rgba(255,255,255,0.55)", fontWeight: on ? 600 : 400 }}>
              {l.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Sector inspection panel ──────────────────────────────────────────────────

function SectorInspection({ sector, alerts }: { sector: Sector; alerts: CityAlert[] }) {
  const status      = getSectorStatus(sector);
  const statusColor = STATUS_COLORS[status];
  const own         = alerts.filter((a) => a.sector_id === sector.sector_id);

  const metrics = [
    { label: "Traffic",        value: String(sector.traffic),             color: "var(--color-traffic)",        icon: Navigation },
    { label: "AQI",            value: String(sector.aqi),                 color: "var(--color-environment)",    icon: Wind },
    { label: "Population",     value: sector.population.toLocaleString(), color: "var(--color-info)",           icon: Users },
    { label: "Energy (kWh)",   value: String(sector.energy_usage),        color: "var(--color-ai)",             icon: Zap },
    { label: "Infra Health",   value: `${sector.infrastructure_health}%`, color: "var(--color-success)",        icon: Building2 },
  ];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {sector.sector_id} · Selected district
            </div>
            <h3 className="mt-0.5 text-xl font-semibold">{sector.sector_name}</h3>
          </div>
          <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ backgroundColor: `color-mix(in oklab, ${statusColor} 15%, transparent)`, color: statusColor }}>
            {status}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {metrics.map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="rounded-lg border border-border bg-background/60 px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Icon className="h-3 w-3" style={{ color }} />
                {label}
              </div>
              <div className="mt-0.5 text-base font-semibold" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Per-sector alerts */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4" style={{ color: "var(--color-risk)" }} />
            Sector Alerts
          </div>
          <span className="text-xs text-muted-foreground">{own.length} active</span>
        </div>
        {own.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-[var(--color-success)]">
            <CheckCircle2 className="h-3.5 w-3.5" /> All clear — no alerts
          </div>
        ) : (
          <ul className="space-y-1.5">
            {own.map((a, i) => {
              const c = SEVERITY_COLORS[a.severity] ?? "var(--color-info)";
              return (
                <li key={i} className="flex items-start gap-2 rounded-lg border border-border bg-background/60 p-2">
                  <span className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold"
                    style={{ backgroundColor: `color-mix(in oklab, ${c} 15%, transparent)`, color: c }}>
                    {a.severity}
                  </span>
                  <span className="text-xs text-muted-foreground">{a.message}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Alerts panel ─────────────────────────────────────────────────────────────

const TYPE_ICON: Record<string, string> = {
  Traffic: "🚦", Pollution: "💨", Infrastructure: "🏗️",
};

function AlertsPanel({
  alerts, loading, focusedId, onAlertClick,
}: {
  alerts: CityAlert[]; loading: boolean;
  focusedId: string | null; onAlertClick: (id: string) => void;
}) {
  if (loading) return (
    <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading alerts…
    </div>
  );
  if (alerts.length === 0) return (
    <div className="flex flex-col items-center gap-1.5 py-6 text-xs text-muted-foreground">
      <CheckCircle2 className="h-5 w-5 text-[var(--color-success)]" />
      No active alerts
    </div>
  );

  return (
    <ul className="space-y-1.5">
      {alerts.map((a, i) => {
        const c       = SEVERITY_COLORS[a.severity] ?? "var(--color-info)";
        const focused = focusedId === a.sector_id;
        return (
          <li key={i} role="button" tabIndex={0}
            onClick={() => onAlertClick(a.sector_id)}
            onKeyDown={(e) => e.key === "Enter" && onAlertClick(a.sector_id)}
            className={["flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 text-xs transition-colors hover:bg-secondary",
              focused ? "border-foreground/30 bg-secondary" : "border-border"].join(" ")}>
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded text-sm"
              style={{ backgroundColor: `color-mix(in oklab, ${c} 15%, transparent)` }}>
              {TYPE_ICON[a.type] ?? "⚠️"}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1">
                <span className="font-semibold text-foreground">{a.sector}</span>
                <span className="rounded px-1 py-0.5 text-[9px] font-bold"
                  style={{ backgroundColor: `color-mix(in oklab, ${c} 15%, transparent)`, color: c }}>
                  {a.severity}
                </span>
                <span className="rounded border border-border px-1 py-0.5 text-[9px] text-muted-foreground">
                  {a.type}
                </span>
              </div>
              <p className="mt-0.5 text-muted-foreground">{a.message}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Predictions panel ────────────────────────────────────────────────────────

function PredictionsPanel({ predictions, loading }: { predictions: CityPrediction[]; loading: boolean }) {
  if (loading) return (
    <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating predictions…
    </div>
  );

  return (
    <ul className="space-y-2">
      {predictions.map((p, i) => {
        const color = PREDICTION_COLORS[p.tag] ?? "var(--color-ai)";
        return (
          <li key={i} className="rounded-lg border border-border bg-background/60 p-3">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="rounded px-1.5 py-0.5 text-[9px] font-bold"
                  style={{ backgroundColor: `color-mix(in oklab, ${color} 15%, transparent)`, color }}>
                  {p.horizon}
                </span>
                <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">{p.tag}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">{p.confidence}%</span>
            </div>
            <p className="text-xs font-semibold text-foreground leading-snug">{p.title}</p>
            <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">{p.description}</p>
            <div className="mt-2 h-1 w-full rounded-full bg-secondary">
              <div className="h-1 rounded-full" style={{ width: `${p.confidence}%`, backgroundColor: color }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Live sensor ticker ───────────────────────────────────────────────────────

function SensorTicker({ sectors }: { sectors: Sector[] }) {
  if (!sectors.length) return null;
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Live
      </span>
      {sectors.map((s) => {
        const st = getSectorStatus(s);
        const c  = STATUS_COLORS[st];
        return (
          <div key={s.sector_id}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: c }} />
            <span className="font-semibold text-foreground">{s.sector_id}</span>
            <span className="text-muted-foreground">T:{s.traffic}</span>
            <span className="text-muted-foreground">AQI:{s.aqi}</span>
            <span className="text-muted-foreground">⚡{s.energy_usage}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Map legend ───────────────────────────────────────────────────────────────

function MapLegend({ layer }: { layer: LayerDef }) {
  return (
    <div className="glass-panel flex items-center gap-3 rounded-xl px-3 py-2 text-[10px]"
      style={{ backdropFilter: "blur(12px)", background: "rgba(10,22,40,0.82)" }}>
      <span className="font-bold uppercase tracking-wider" style={{ color: layer.color }}>
        {layer.label}
      </span>
      <span className="text-white/40">·</span>
      {[["Low", "var(--color-success)"], ["Mid", "var(--color-traffic)"], ["High", "var(--color-risk)"]].map(
        ([l, c]) => (
          <span key={l} className="flex items-center gap-1 text-white/60">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c }} />
            {l}
          </span>
        ),
      )}
      {layer.id === "infrastructure" && (
        <span className="text-white/40 italic">(inverted — high = good)</span>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function DigitalTwinPage() {
  const sectorsQ     = useDigitalTwinSectors();
  const metricsQ     = useDigitalTwinMetrics();
  const predictionsQ = useDigitalTwinPredictions();
  const alertsQ      = useDigitalTwinAlerts();

  const [activeLayerId, setActiveLayerId]         = useState<LayerId>("traffic");
  const [selectedSectorId, setSelectedSectorId]   = useState<string | null>(null);
  const [focusedAlertId, setFocusedAlertId]       = useState<string | null>(null);
  const [rightTab, setRightTab]                   = useState<"inspect" | "alerts" | "predictions">("inspect");

  const sectors     = sectorsQ.data?.sectors  ?? [];
  const dtMetrics   = metricsQ.data;
  const predictions = predictionsQ.data        ?? [];
  const alerts      = alertsQ.data             ?? [];

  const activeDef      = LAYERS.find((l) => l.id === activeLayerId)!;
  const selectedSector = sectors.find((s) => s.sector_id === selectedSectorId) ?? null;
  const firstLoad      = sectorsQ.isLoading && sectors.length === 0;

  function handleSectorSelect(id: string) {
    setSelectedSectorId((p) => (p === id ? null : id));
    setFocusedAlertId(null);
    setRightTab("inspect");
  }

  function handleAlertClick(sectorId: string) {
    setFocusedAlertId((p) => (p === sectorId ? null : sectorId));
    setSelectedSectorId(sectorId);
    setRightTab("inspect");
  }

  const tabDefs = [
    { id: "inspect"     as const, label: "Inspect",                                               icon: Building2      },
    { id: "alerts"      as const, label: alerts.length ? `Alerts (${alerts.length})` : "Alerts", icon: AlertTriangle  },
    { id: "predictions" as const, label: "Predictions",                                           icon: Sparkles       },
  ];

  return (
    <div className="mx-auto max-w-[1600px] space-y-4">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <PageHeader
        title="Digital Twin"
        subtitle="3D city operations — interact with districts to inspect live metrics, alerts, and AI predictions."
      />

      {/* ── Header KPIs ────────────────────────────────────────────────────── */}
      {dtMetrics ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <MetricPill label="City Health"   value={`${Math.round(dtMetrics.city_health)}/100`} color="var(--color-success)"    icon={Activity} />
          <MetricPill label="Active Alerts" value={dtMetrics.active_alerts}                     color="var(--color-risk)"       icon={AlertTriangle} />
          <MetricPill label="Total Sectors" value={dtMetrics.total_sectors}                     color="var(--color-info)"       icon={Layers} />
          <MetricPill label="Healthy"       value={dtMetrics.healthy_sectors}                   color="var(--color-success)"   icon={CheckCircle2} />
          <MetricPill label="Warning"       value={dtMetrics.warning_sectors}                   color="var(--color-traffic)"   icon={AlertTriangle} />
          <MetricPill label="Critical"      value={dtMetrics.critical_sectors}                  color="var(--color-risk)"      icon={Zap} />
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading metrics…
        </div>
      )}

      {/* ── Live sensor ticker ──────────────────────────────────────────────── */}
      <SensorTicker sectors={sectors} />

      {/* ── Main: 3D canvas + side panel ────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">

        {/* 3D Canvas */}
        <div className="relative h-[640px] overflow-hidden rounded-2xl border border-border shadow-[var(--shadow-elevated)]"
          style={{ background: "#020b18" }}>

          {firstLoad ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-sm">Building city model…</span>
            </div>
          ) : (
            <Suspense fallback={
              <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="text-sm">Initialising 3D engine…</span>
              </div>
            }>
              <CityCanvas
                sectors={sectors}
                layer={activeLayerId}
                selectedId={selectedSectorId}
                focusedId={focusedAlertId}
                onSelect={handleSectorSelect}
              />
            </Suspense>
          )}

          {/* Floating layer panel */}
          {!firstLoad && (
            <div className="absolute left-4 top-4">
              <LayerPanel activeId={activeLayerId} onChange={setActiveLayerId} />
            </div>
          )}

          {/* Interaction hint + reset */}
          {!firstLoad && (
            <div className="absolute right-4 top-4 flex flex-col gap-2">
              <button
                onClick={() => { setSelectedSectorId(null); setFocusedAlertId(null); }}
                title="Reset selection"
                className="glass-panel grid h-9 w-9 place-items-center rounded-xl shadow-[var(--shadow-soft)]"
                style={{ backdropFilter: "blur(12px)", background: "rgba(10,22,40,0.82)" }}>
                <RotateCcw className="h-4 w-4 text-white/70" />
              </button>
            </div>
          )}

          {/* Map legend */}
          {!firstLoad && (
            <div className="absolute bottom-4 left-4">
              <MapLegend layer={activeDef} />
            </div>
          )}

          {/* Status bar */}
          {!firstLoad && (
            <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-xl px-3 py-2 text-[10px]"
              style={{ backdropFilter: "blur(12px)", background: "rgba(10,22,40,0.82)" }}>
              <Sparkles className="h-3.5 w-3.5" style={{ color: "var(--color-ai)" }} />
              <span className="text-white/60">{sectors.length} districts · AI streaming</span>
            </div>
          )}

          {/* Controls hint */}
          {!firstLoad && !selectedSectorId && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <div className="rounded-xl px-4 py-2 text-center text-xs text-white/30"
                style={{ backdropFilter: "blur(4px)" }}>
                Drag to rotate · Scroll to zoom · Click a district
              </div>
            </div>
          )}
        </div>

        {/* Right side panel */}
        <div className="flex flex-col gap-3">
          {/* Tab bar */}
          <div className="flex rounded-xl border border-border bg-card p-1">
            {tabDefs.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setRightTab(id)}
                className={["flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-colors",
                  rightTab === id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"].join(" ")}>
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto space-y-3">

            {/* Inspect */}
            {rightTab === "inspect" && (
              selectedSector ? (
                <SectorInspection sector={selectedSector} alerts={alerts} />
              ) : (
                <div className="flex h-56 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card text-center">
                  <Building2 className="h-8 w-8 text-muted-foreground/30" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">No district selected</p>
                    <p className="mt-0.5 text-xs text-muted-foreground/60">Click any district in the 3D city</p>
                  </div>
                </div>
              )
            )}

            {/* Alerts */}
            {rightTab === "alerts" && (
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <AlertTriangle className="h-4 w-4" style={{ color: "var(--color-risk)" }} />
                    Active Alerts
                  </div>
                  {alerts.length > 0 && (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{ backgroundColor: "color-mix(in oklab, var(--color-risk) 15%, transparent)", color: "var(--color-risk)" }}>
                      {alerts.length}
                    </span>
                  )}
                </div>
                <AlertsPanel
                  alerts={alerts}
                  loading={alertsQ.isLoading && alerts.length === 0}
                  focusedId={focusedAlertId}
                  onAlertClick={handleAlertClick}
                />
              </div>
            )}

            {/* Predictions */}
            {rightTab === "predictions" && (
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="h-4 w-4" style={{ color: "var(--color-ai)" }} />
                  AI Predictions
                </div>
                <PredictionsPanel
                  predictions={predictions}
                  loading={predictionsQ.isLoading && predictions.length === 0}
                />
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
