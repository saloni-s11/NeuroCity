import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Building2,
  Gauge,
  Leaf,
  Loader2,
  Sparkles,
  Users,
  Wind,
  Zap,
  Globe2,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiCard } from "@/components/neuro/KpiCard";
import { SectionHeader } from "@/components/neuro/SectionHeader";
import { InsightsPanel } from "@/components/neuro/InsightsPanel";
import {
  useInsights,
  useMetrics,
  useSummary,
  useAlerts,
} from "@/hooks/useDashboard";

// ─── Route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview · NeuroCity" },
      {
        name: "description",
        content: "Executive overview of city health, sustainability, and AI insights.",
      },
    ],
  }),
  component: OverviewPage,
});

// ─── Cosmetic trend data (visual backdrop only — not operational KPIs) ────────

const CITY_TREND = [
  { t: "Mon", health: 82, sust: 71 },
  { t: "Tue", health: 84, sust: 72 },
  { t: "Wed", health: 83, sust: 74 },
  { t: "Thu", health: 86, sust: 75 },
  { t: "Fri", health: 85, sust: 77 },
  { t: "Sat", health: 87, sust: 78 },
  { t: "Sun", health: 86, sust: 79 },
];

function metricSparkline(base: number, length = 9): number[] {
  return Array.from({ length }, (_, i) =>
    Math.round(base * (0.88 + (i / length) * 0.12 + Math.random() * 0.04)),
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatPill({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  tone: string;
  icon: typeof Gauge;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span
          className="grid h-7 w-7 place-items-center rounded-lg"
          style={{
            backgroundColor: `color-mix(in oklab, ${tone} 14%, transparent)`,
            color: tone,
          }}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function SkeletonPill() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-background/60 p-3">
      <div className="h-4 w-24 rounded bg-secondary" />
      <div className="mt-2 h-8 w-16 rounded bg-secondary" />
    </div>
  );
}

function FullPageLoader() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin" />
      <span className="text-sm">Connecting to NeuroCity…</span>
    </div>
  );
}

// ─── Sustainability Snapshot ──────────────────────────────────────────────────

function SustainabilitySnapshot({ score }: { score: number }) {
  const bars = [
    { label: "Renewable Mix",   pct: Math.min(100, Math.round(score * 0.72)), color: "var(--color-success)" },
    { label: "Carbon Index",    pct: Math.min(100, Math.round(score * 0.58)), color: "var(--color-environment)" },
    { label: "Water Efficiency",pct: Math.min(100, Math.round(score * 0.83)), color: "var(--color-info)" },
    { label: "Waste Diversion", pct: Math.min(100, Math.round(score * 0.64)), color: "var(--color-ai)" },
  ];
  return (
    <div className="space-y-3">
      {bars.map(({ label, pct, color }) => (
        <div key={label}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-semibold" style={{ color }}>{pct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-secondary">
            <div
              className="h-1.5 rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, backgroundColor: color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function OverviewPage() {
  const metrics   = useMetrics();
  const insights  = useInsights();
  const summary   = useSummary();
  const alerts    = useAlerts();   // used only for alert count summary pill

  const firstLoad =
    metrics.isLoading && !metrics.data;
  if (firstLoad) return <FullPageLoader />;

  const m           = metrics.data;
  const insightList = insights.data ?? [];
  const sum         = summary.data;
  const alertCount  = alerts.data?.length ?? 0;

  const trafficSparkline  = metricSparkline(m?.avg_traffic ?? 60);
  const aqiSparkline      = metricSparkline(m?.avg_aqi ?? 100);
  const energySparkline   = metricSparkline(m?.total_energy_usage ?? 400, 9).map(
    (v) => Math.round(v / 100) / 10,
  );
  const infraSparkline    = metricSparkline(m?.avg_infrastructure_health ?? 80);
  const populationSparkline = metricSparkline(
    (m?.total_population ?? 400000) / 1_000_000, 9,
  ).map((v) => v / 100);

  return (
    <div className="mx-auto max-w-[1400px] space-y-8">

      {/* ── 1. City Summary banner ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--color-ai) 35%, transparent), transparent)" }}
        />
        <div
          className="pointer-events-none absolute -left-32 bottom-0 h-64 w-64 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--color-info) 30%, transparent), transparent)" }}
        />

        <div className="relative grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long", day: "numeric", month: "long", year: "numeric",
              })}
            </div>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
              Good morning, City Administrator
            </h1>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
              NeuroCity is operating at{" "}
              <span className="font-medium text-foreground">
                {sum ? `${Math.round(sum.city_health)} / 100` : "…"}
              </span>{" "}
              health.{" "}
              {alertCount > 0
                ? `${alertCount} operational alert${alertCount > 1 ? "s" : ""} active — view in `
                : "All systems nominal."}
              {alertCount > 0 && (
                <Link to="/digital-twin" className="font-medium text-foreground underline underline-offset-2 hover:no-underline">
                  Digital Twin
                </Link>
              )}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {sum ? (
                <>
                  <StatPill label="City Health"    value={String(Math.round(sum.city_health))}    tone="var(--color-success)"     icon={Gauge} />
                  <StatPill label="Sustainability"  value={String(Math.round(sum.sustainability))}  tone="var(--color-environment)" icon={Leaf} />
                  <StatPill label="Active Alerts"   value={String(alertCount)}                     tone="var(--color-risk)"        icon={AlertTriangle} />
                  <StatPill label="AI Confidence"   value={`${Math.round(sum.ai_confidence)}%`}    tone="var(--color-ai)"          icon={Sparkles} />
                </>
              ) : (
                Array.from({ length: 4 }).map((_, i) => <SkeletonPill key={i} />)
              )}
            </div>
          </div>

          {/* City vital signs chart */}
          <div className="rounded-xl border border-border bg-background/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-medium">City vital signs</div>
              <div className="text-[11px] text-muted-foreground">Past 7 days</div>
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={CITY_TREND} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gh" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-ai)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--color-ai)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-environment)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--color-environment)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="t" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} domain={[60, 100]} />
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 12 }} />
                  <Area type="monotone" dataKey="health" stroke="var(--color-ai)" strokeWidth={2} fill="url(#gh)" name="Health" />
                  <Area type="monotone" dataKey="sust" stroke="var(--color-environment)" strokeWidth={2} fill="url(#gs)" name="Sustainability" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. KPI Metrics ──────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Live signals"
          title="City performance"
          description="Real-time indicators across mobility, environment, and infrastructure."
        />
        {metrics.isLoading && !m ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading metrics…
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard label="Traffic Index" value={String(m?.avg_traffic ?? "—")} delta={2.1}
              trend={trafficSparkline} icon={Activity} tone="traffic"
              status={(m?.avg_traffic ?? 0) > 80 ? "Critical" : (m?.avg_traffic ?? 0) > 60 ? "Moderate" : "Normal"} />
            <KpiCard label="AQI" value={String(m?.avg_aqi ?? "—")} delta={-1.8}
              trend={aqiSparkline} icon={Wind} tone="environment"
              status={(m?.avg_aqi ?? 0) > 150 ? "Hazardous" : (m?.avg_aqi ?? 0) > 100 ? "Unhealthy" : "Good"} />
            <KpiCard label="Energy Demand" value={m ? String(Math.round(m.total_energy_usage)) : "—"} unit="kWh"
              delta={1.4} trend={energySparkline} icon={Zap} tone="ai" status="Live" />
            <KpiCard label="Infra Health" value={m ? `${Math.round(m.avg_infrastructure_health)}%` : "—"}
              delta={0.3} trend={infraSparkline} icon={Building2}
              tone={(m?.avg_infrastructure_health ?? 100) < 70 ? "risk" : "success"}
              status={(m?.avg_infrastructure_health ?? 100) < 70 ? "Degraded" : "Stable"} />
            <KpiCard label="Population"
              value={m ? m.total_population >= 1_000_000
                ? `${(m.total_population / 1_000_000).toFixed(2)}M`
                : `${(m.total_population / 1_000).toFixed(0)}K` : "—"}
              delta={0.2} trend={populationSparkline} icon={Users} tone="infrastructure" status="Forecast" />
          </div>
        )}
      </section>

      {/* ── 3. Sustainability Snapshot + Digital Twin CTA ───────────────────── */}
      <section className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <SectionHeader
            eyebrow="Sustainability"
            title="Sustainability snapshot"
            description="Derived from live energy, AQI, and infrastructure metrics."
          />
          <div className="mt-4">
            {sum ? (
              <SustainabilitySnapshot score={sum.sustainability} />
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            )}
          </div>
        </div>

        {/* Digital Twin CTA card */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div
            className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-30 blur-3xl"
            style={{ background: "radial-gradient(closest-side, var(--color-ai), transparent)" }}
          />
          <div className="relative">
            <div className="flex items-center gap-2">
              <Globe2 className="h-5 w-5" style={{ color: "var(--color-ai)" }} />
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Operations Center
              </div>
            </div>
            <h3 className="mt-2 text-xl font-semibold">Digital Twin</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Interactive city map, live alerts, AI predictions, and layer controls. The full operational view.
            </p>
            <Link
              to="/digital-twin"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 transition-opacity"
            >
              Open Digital Twin <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 5. AI Highlights ────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeader
          eyebrow="AI Urban Intelligence"
          title="AI highlights"
          description="Backend-generated insights ranked by impact and confidence."
          action={
            <Link
              to="/ai-insights"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-secondary"
            >
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        <div className="grid gap-4 lg:grid-cols-3">
          <InsightsPanel
            insights={insightList}
            loading={insights.isLoading && insightList.length === 0}
            error={!!insights.error}
          />
        </div>
      </section>

    </div>
  );
}
