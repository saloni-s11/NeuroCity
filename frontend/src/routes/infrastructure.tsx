import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle, Building2, CheckCircle2,
  Droplets, Flame, Gauge, Loader2,
  Shield, TrendingDown, Wrench, Zap,
} from "lucide-react";
import { PageHeader, SectionHeader } from "@/components/neuro/SectionHeader";
import { KpiCard } from "@/components/neuro/KpiCard";
import {
  useInfraOverview, useInfraAssets, useInfraHotspots,
  useInfraMaintenance, useInfraUtilities, useInfraRisks, useInfraForecast,
} from "@/hooks/useInfrastructure";
import type {
  InfraAsset, InfraForecastItem, InfraHotspot,
  InfraRisk, MaintenanceItem, UtilityNetwork,
} from "@/types/city";

export const Route = createFileRoute("/infrastructure")({
  head: () => ({ meta: [{ title: "Infrastructure · NeuroCity" }] }),
  component: InfraPage,
});

// ─── Colour helpers ───────────────────────────────────────────────────────────

function healthColor(h: number): string {
  if (h >= 80) return "var(--color-success)";
  if (h >= 60) return "var(--color-traffic)";
  return "var(--color-risk)";
}

function healthLabel(h: number): string {
  if (h >= 90) return "Stable";
  if (h >= 75) return "Watch";
  return "Action";
}

const PRIORITY_COLOR: Record<string, string> = {
  Critical: "var(--color-risk)",
  High:     "var(--color-traffic)",
  Normal:   "var(--color-info)",
};

const SEV_COLOR: Record<string, string> = {
  Critical: "var(--color-risk)",
  High:     "var(--color-traffic)",
  Medium:   "var(--color-info)",
  Low:      "var(--color-success)",
};

const TYPE_ICON: Record<string, typeof Building2> = {
  "Road":            Building2,
  "Bridge":          Building2,
  "Power Grid":      Zap,
  "Water Network":   Droplets,
  "Street Lights":   Flame,
  "Public Building": Building2,
  "Utilities":       Wrench,
};

function typeColor(type: string): string {
  const map: Record<string, string> = {
    "Road":            "var(--color-infrastructure)",
    "Bridge":          "var(--color-infrastructure)",
    "Power Grid":      "var(--color-ai)",
    "Water Network":   "var(--color-info)",
    "Street Lights":   "var(--color-traffic)",
    "Public Building": "var(--color-environment)",
    "Utilities":       "var(--color-success)",
  };
  return map[type] ?? "var(--color-infrastructure)";
}

// ─── Loading / error ──────────────────────────────────────────────────────────

function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />{label}
    </div>
  );
}
function ErrBox({ msg }: { msg: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 text-center text-sm text-muted-foreground">{msg}</div>
  );
}

// ─── Section 1: KPI Overview ──────────────────────────────────────────────────

function OverviewKPIs() {
  const { data: ov, isLoading, error } = useInfraOverview();
  if (isLoading) return <Spinner label="Loading overview…" />;
  if (error || !ov) return <ErrBox msg="Could not load infrastructure overview." />;

  const healthTrend = [ov.health_score * 0.96, ov.health_score * 0.97, ov.health_score * 0.98,
    ov.health_score * 0.99, ov.health_score, ov.health_score, ov.health_score];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard label="Health Score"    value={`${ov.health_score}%`}   delta={0.4}   trend={healthTrend}             icon={Gauge}         tone="success"        status={ov.health_score >= 80 ? "Good" : "Watch"} />
      <KpiCard label="Critical Assets" value={String(ov.critical_assets)} delta={0} trend={[ov.critical_assets]}   icon={AlertTriangle} tone="risk"           status="Live" />
      <KpiCard label="Maintenance"     value={String(ov.maintenance_tasks)} delta={0} trend={[ov.maintenance_tasks]} icon={Wrench}        tone="traffic"        status="Queue" />
      <KpiCard label="Pred. Failures"  value={String(ov.predicted_failures)} delta={0} trend={[ov.predicted_failures]} icon={TrendingDown} tone="ai"           status="30-day" />
    </div>
  );
}

// ─── Section 2: Utility Cards Grid (matches screenshot layout exactly) ────────

function UtilityCard({ net }: { net: UtilityNetwork }) {
  const c = healthColor(net.health_pct);
  const Icon = net.name.includes("Power") ? Zap
    : net.name.includes("Water") ? Droplets
    : net.name.includes("Light") ? Flame
    : Wrench;

  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg"
            style={{ backgroundColor: `color-mix(in oklab, ${c} 14%, transparent)`, color: c }}>
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <div className="text-sm font-semibold">{net.name}</div>
            <div className="text-[11px] text-muted-foreground">{net.detail}</div>
          </div>
        </div>
        <div className="text-2xl font-semibold" style={{ color: c }}>
          {net.primary_metric_value}{net.primary_metric_unit}
        </div>
      </div>
      <div className="mt-4 h-1.5 rounded-full bg-secondary">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, net.health_pct)}%`, background: c }} />
      </div>
      <div className="mt-3 flex justify-between text-[11px] text-muted-foreground">
        <span>{net.primary_metric_label}: {net.primary_metric_value}{net.primary_metric_unit} · {net.outages} outage{net.outages !== 1 ? "s" : ""}</span>
        <span>{healthLabel(net.health_pct)}</span>
      </div>
    </div>
  );
}

function UtilitiesGrid() {
  const { data: util, isLoading, error } = useInfraUtilities();
  if (isLoading) return <Spinner label="Loading utility networks…" />;
  if (error || !util) return <ErrBox msg="Utility data unavailable." />;
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {util.networks.map((n) => <UtilityCard key={n.name} net={n} />)}
    </div>
  );
}

// ─── Section 3: Maintenance Table (matches screenshot layout exactly) ─────────

function MaintenanceTable() {
  const { data: items, isLoading, error } = useInfraMaintenance();
  if (isLoading) return <Spinner label="Loading maintenance queue…" />;
  if (error || !items) return <ErrBox msg="Maintenance data unavailable." />;

  return (
    <div className="card-surface p-5">
      <SectionHeader eyebrow="Pipeline" title="Maintenance alerts" />
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="py-2 pr-4 font-medium">Asset</th>
            <th className="py-2 pr-4 font-medium">Issue</th>
            <th className="py-2 pr-4 font-medium">Priority</th>
            <th className="py-2 font-medium">ETA</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: MaintenanceItem) => {
            const c = PRIORITY_COLOR[item.priority] ?? "var(--color-info)";
            return (
              <tr key={item.asset_id} className="border-t border-border hover:bg-secondary/40 transition-colors">
                <td className="py-3 pr-4">
                  <div className="font-medium text-foreground">{item.asset}</div>
                  <div className="text-[11px] text-muted-foreground">{item.type} · {item.sector}</div>
                </td>
                <td className="py-3 pr-4 text-muted-foreground max-w-[260px]">
                  <span className="line-clamp-2">{item.issue ?? "Scheduled inspection"}</span>
                </td>
                <td className="py-3 pr-4">
                  <span className="rounded-md px-2 py-0.5 text-[11px] font-semibold"
                    style={{ backgroundColor: `color-mix(in oklab, ${c} 14%, transparent)`, color: c }}>
                    {item.priority}
                  </span>
                </td>
                <td className="py-3 text-muted-foreground text-xs">{item.eta}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Section 4: Asset Health Table ───────────────────────────────────────────

function AssetTable() {
  const { data: assets, isLoading, error } = useInfraAssets();
  if (isLoading) return <Spinner label="Loading assets…" />;
  if (error || !assets) return <ErrBox msg="Asset data unavailable." />;

  return (
    <div className="card-surface p-5">
      <SectionHeader eyebrow="Asset Health Monitoring" title="All infrastructure assets"
        description={`${assets.length} assets across 7 categories — sorted by health score.`} />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              {["Asset", "Type", "Sector", "Health", "Status", "Risk", "Last Inspection"].map(h => (
                <th key={h} className="py-2 pr-4 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assets.map((a: InfraAsset) => {
              const c = healthColor(a.health_score);
              const tc = typeColor(a.type);
              const Icon = TYPE_ICON[a.type] ?? Building2;
              return (
                <tr key={a.asset_id} className="border-t border-border hover:bg-secondary/40 transition-colors">
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
                        style={{ backgroundColor: `color-mix(in oklab, ${tc} 12%, transparent)`, color: tc }}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <div className="font-medium text-foreground leading-tight">{a.asset_name}</div>
                        {a.issue && <div className="text-[10px] text-muted-foreground line-clamp-1">{a.issue}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-muted-foreground whitespace-nowrap">{a.type}</td>
                  <td className="py-2.5 pr-4 text-xs text-muted-foreground">{a.sector}</td>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-14 rounded-full bg-secondary">
                        <div className="h-1.5 rounded-full" style={{ width: `${a.health_score}%`, backgroundColor: c }} />
                      </div>
                      <span className="text-xs font-semibold" style={{ color: c }}>{a.health_score}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ backgroundColor: `color-mix(in oklab, ${c} 14%, transparent)`, color: c }}>
                      {a.status}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className="text-xs" style={{ color: a.risk_level === "High" ? "var(--color-risk)" : a.risk_level === "Medium" ? "var(--color-traffic)" : "var(--color-success)" }}>
                      {a.risk_level}
                    </span>
                  </td>
                  <td className="py-2.5 text-xs text-muted-foreground whitespace-nowrap">{a.last_inspection}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Section 5: Hotspots ──────────────────────────────────────────────────────

function HotspotsPanel() {
  const { data: hotspots, isLoading, error } = useInfraHotspots();
  if (isLoading) return <Spinner label="Detecting hotspots…" />;
  if (error || !hotspots) return <ErrBox msg="Hotspot data unavailable." />;

  if (hotspots.length === 0) return (
    <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
      <CheckCircle2 className="h-6 w-6 text-[var(--color-success)]" />
      <span className="text-sm">All assets healthy — no hotspots detected.</span>
    </div>
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {hotspots.map((h: InfraHotspot) => {
        const c = healthColor(h.health_score);
        const Icon = TYPE_ICON[h.type] ?? Building2;
        return (
          <div key={h.asset_id} className="card-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg"
                  style={{ backgroundColor: `color-mix(in oklab, ${c} 14%, transparent)`, color: c }}>
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-sm font-semibold leading-tight">{h.asset_name}</div>
                  <div className="text-[11px] text-muted-foreground">{h.type} · {h.sector}</div>
                </div>
              </div>
              <span className="shrink-0 text-lg font-bold" style={{ color: c }}>{h.health_score}%</span>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-secondary">
              <div className="h-1.5 rounded-full" style={{ width: `${h.health_score}%`, backgroundColor: c }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Failure risk: <span className="font-semibold" style={{ color: c }}>{h.failure_risk_pct}%</span></span>
              <span className="rounded px-1.5 py-0.5 font-semibold"
                style={{ backgroundColor: `color-mix(in oklab, ${c} 14%, transparent)`, color: c }}>{h.status}</span>
            </div>
            {h.issue && (
              <p className="mt-2 text-[11px] text-muted-foreground border-t border-border pt-2 line-clamp-2">{h.issue}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Section 6: Risks ─────────────────────────────────────────────────────────

function RisksPanel() {
  const { data: risks, isLoading, error } = useInfraRisks();
  if (isLoading) return <Spinner label="Analysing risks…" />;
  if (error || !risks) return <ErrBox msg="Risk data unavailable." />;

  if (risks.length === 0) return (
    <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
      <Shield className="h-6 w-6 text-[var(--color-success)]" />
      <span className="text-sm">No infrastructure risks detected.</span>
    </div>
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {risks.map((r: InfraRisk, i) => {
        const c = SEV_COLOR[r.severity] ?? "var(--color-info)";
        return (
          <div key={`${r.asset_id}-${i}`} className="card-surface p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: c }}>
                {r.severity} · {r.asset_name}
              </div>
              <span className="rounded-full px-2 py-0.5 text-[9px] font-bold"
                style={{ backgroundColor: `color-mix(in oklab, ${c} 14%, transparent)`, color: c }}>
                {r.severity}
              </span>
            </div>
            <p className="mt-2 text-sm font-medium text-foreground">{r.title}</p>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{r.message}</p>
            <div className="mt-2 text-[10px] text-muted-foreground border-t border-border pt-2">
              Value: <span className="font-semibold" style={{ color: c }}>{r.value}</span> · Threshold: {r.threshold}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Section 7: Forecast ──────────────────────────────────────────────────────

function ForecastPanel() {
  const { data: forecast, isLoading, error } = useInfraForecast();
  if (isLoading) return <Spinner label="Generating forecasts…" />;
  if (error || !forecast) return <ErrBox msg="Forecast data unavailable." />;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {forecast.map((f: InfraForecastItem) => {
        const tc = typeColor(f.type);
        const Icon = TYPE_ICON[f.type] ?? Building2;
        return (
          <div key={f.asset_id} className="card-surface p-5">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
                style={{ backgroundColor: `color-mix(in oklab, ${tc} 14%, transparent)`, color: tc }}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wide truncate" style={{ color: tc }}>{f.type}</div>
                <div className="text-sm font-semibold leading-tight truncate">{f.asset}</div>
              </div>
            </div>
            <p className="mt-3 text-sm text-foreground leading-snug">{f.prediction}</p>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{f.recommendation}</p>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
              <span className="text-[10px] text-muted-foreground">{f.horizon} · {f.sector}</span>
              <div className="flex items-center gap-1.5">
                <div className="h-1 w-14 rounded-full bg-secondary">
                  <div className="h-1 rounded-full" style={{ width: `${f.confidence}%`, backgroundColor: tc }} />
                </div>
                <span className="text-[10px] text-muted-foreground">{f.confidence}%</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page root ────────────────────────────────────────────────────────────────

function InfraPage() {
  const { data: ov } = useInfraOverview();

  return (
    <div className="mx-auto max-w-[1400px] space-y-8">

      <PageHeader
        title="Infrastructure"
        subtitle={
          ov
            ? `Health score ${ov.health_score}% · ${ov.critical_assets} critical · ${ov.maintenance_tasks} maintenance tasks · ${ov.predicted_failures} predicted failures`
            : "Asset health, utility performance, and maintenance pipeline."
        }
      />

      {/* 1 — KPI Overview */}
      <section>
        <OverviewKPIs />
      </section>

      {/* 2 — Utility Networks (matches screenshot: 3-col card grid, now 4 cards from API) */}
      <section className="space-y-4">
        <SectionHeader eyebrow="Utility Monitoring" title="Network performance" description="Live load, utilization, and outage status across all utility networks." />
        <UtilitiesGrid />
      </section>

      {/* 3 — Maintenance Alerts Table (matches screenshot exactly) */}
      <MaintenanceTable />

      {/* 4 — Asset Health Table */}
      <section className="space-y-4">
        <SectionHeader eyebrow="Asset Health Monitoring" title="Infrastructure asset registry"
          description="All 25 assets across Roads, Bridges, Power, Water, Lighting, Buildings, and Utilities." />
        <AssetTable />
      </section>

      {/* 5 — Hotspot Detection */}
      <section className="space-y-4">
        <SectionHeader eyebrow="Hotspot Detection" title="High-risk assets"
          description="Assets with health score below 70 — sorted by risk. Each shows computed failure probability." />
        <HotspotsPanel />
      </section>

      {/* 6 — Risk Detection */}
      <section className="space-y-4">
        <SectionHeader eyebrow="Risk Detection" title="Infrastructure risks"
          description="Auto-generated from asset health and utility load rules." />
        <RisksPanel />
      </section>

      {/* 7 — Forecasting */}
      <section className="space-y-4">
        <SectionHeader eyebrow="AI Forecasting" title="Failure predictions"
          description="Probability-based forecasts for at-risk assets and utility networks." />
        <ForecastPanel />
      </section>

    </div>
  );
}
