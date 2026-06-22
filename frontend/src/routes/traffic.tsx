import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity, AlertTriangle, ArrowRight, Clock,
  Loader2, Navigation, Route as RouteIcon,
  Gauge, TrendingDown, TrendingUp, Zap,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid,
  Cell, ComposedChart, Legend, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { PageHeader, SectionHeader } from "@/components/neuro/SectionHeader";
import { KpiCard } from "@/components/neuro/KpiCard";
import {
  useTrafficKPIs, useTrafficOverview,
  useTrafficHotspots, useTrafficRoutes, useTrafficForecast,
} from "@/hooks/useTraffic";
import type { CongestionLevel, TrafficHotspot, RouteRecommendation } from "@/types/city";

export const Route = createFileRoute("/traffic")({
  head: () => ({ meta: [{ title: "Traffic Intelligence · NeuroCity" }] }),
  component: TrafficPage,
});

// ─── Colour helpers ───────────────────────────────────────────────────────────

const LEVEL_COLOR: Record<CongestionLevel, string> = {
  Free:     "var(--color-success)",
  Moderate: "var(--color-info)",
  Heavy:    "var(--color-traffic)",
  Severe:   "var(--color-risk)",
};

const LEVEL_BG: Record<CongestionLevel, string> = {
  Free:     "color-mix(in oklab, var(--color-success) 14%, transparent)",
  Moderate: "color-mix(in oklab, var(--color-info) 14%, transparent)",
  Heavy:    "color-mix(in oklab, var(--color-traffic) 14%, transparent)",
  Severe:   "color-mix(in oklab, var(--color-risk) 14%, transparent)",
};

function ciColor(ci: number): string {
  if (ci < 25) return "var(--color-success)";
  if (ci < 50) return "var(--color-info)";
  if (ci < 75) return "var(--color-traffic)";
  return "var(--color-risk)";
}

// ─── Shared loading / error states ───────────────────────────────────────────

function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />{label}
    </div>
  );
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

// ─── Section 1 — KPI strip ────────────────────────────────────────────────────

function KPIStrip() {
  const { data: kpis, isLoading, error } = useTrafficKPIs();

  if (isLoading) return <LoadingBlock label="Loading KPIs…" />;
  if (error || !kpis) return <ErrorBlock message="Could not load KPIs — check backend connection." />;

  const speedTrend  = [kpis.avg_speed_kmh * 1.12, kpis.avg_speed_kmh * 1.08, kpis.avg_speed_kmh * 1.04,
                       kpis.avg_speed_kmh * 1.02, kpis.avg_speed_kmh, kpis.avg_speed_kmh * 0.98, kpis.avg_speed_kmh];
  const ciTrend     = [kpis.congestion_index * 0.9, kpis.congestion_index * 0.93, kpis.congestion_index * 0.96,
                       kpis.congestion_index * 0.98, kpis.congestion_index, kpis.congestion_index * 1.01, kpis.congestion_index];
  const commuteTrend = [kpis.avg_commute_minutes * 0.9, kpis.avg_commute_minutes * 0.93,
                        kpis.avg_commute_minutes * 0.96, kpis.avg_commute_minutes * 0.99,
                        kpis.avg_commute_minutes, kpis.avg_commute_minutes * 1.01, kpis.avg_commute_minutes];
  const effTrend    = [kpis.network_efficiency_pct * 1.03, kpis.network_efficiency_pct * 1.02,
                       kpis.network_efficiency_pct * 1.01, kpis.network_efficiency_pct,
                       kpis.network_efficiency_pct * 0.99, kpis.network_efficiency_pct, kpis.network_efficiency_pct];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      <KpiCard label="Avg Speed"       value={String(kpis.avg_speed_kmh)}            unit="km/h" delta={-2.3} trend={speedTrend}   icon={Activity}   tone="traffic"        status={kpis.avg_speed_kmh < 25 ? "Slow" : "Normal"} />
      <KpiCard label="Congestion"      value={String(kpis.congestion_index)}                      delta={3.1}  trend={ciTrend}       icon={Navigation} tone="risk"           status={kpis.congestion_index > 75 ? "Severe" : kpis.congestion_index > 50 ? "Heavy" : "Moderate"} />
      <KpiCard label="Avg Commute"     value={String(kpis.avg_commute_minutes)}       unit="min"  delta={1.8}  trend={commuteTrend}  icon={Clock}      tone="ai"             status="Live" />
      <KpiCard label="Active Incidents" value={String(kpis.active_incidents)}                      delta={0}    trend={[kpis.active_incidents]} icon={AlertTriangle} tone="risk" status={kpis.active_incidents > 3 ? "High" : "Low"} />
      <KpiCard label="Severe Corridors" value={String(kpis.corridors_severe)}                      delta={0}    trend={[kpis.corridors_severe]} icon={TrendingUp}  tone="risk"    status="Live" />
      <KpiCard label="Heavy Corridors"  value={String(kpis.corridors_heavy)}                       delta={0}    trend={[kpis.corridors_heavy]}  icon={Gauge}       tone="traffic" status="Live" />
      <KpiCard label="Net Efficiency"  value={String(kpis.network_efficiency_pct)}   unit="%"    delta={-1.1} trend={effTrend}      icon={Zap}        tone="info"           status={kpis.network_efficiency_pct > 80 ? "Good" : "Strained"} />
    </div>
  );
}

// ─── Section 2 — Congestion Analysis Engine ───────────────────────────────────

function CongestionAnalysis() {
  const { data, isLoading, error } = useTrafficOverview();

  if (isLoading) return <LoadingBlock label="Loading congestion data…" />;
  if (error || !data) return <ErrorBlock message="Could not load congestion analysis." />;

  const hourlyData = data.hourly_flow.map((h) => ({
    hour: h.hour,
    volume: h.volume,
    speed: h.avg_speed,
    ci: Math.round(Math.max(0, (1 - h.avg_speed / 65) * 100)),
  }));

  const weeklyData = data.weekly_trend.map((w) => ({
    day: w.day,
    ci: w.avg_index,
    incidents: w.incidents,
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      {/* 24h hourly flow + congestion overlay */}
      <div className="card-surface p-5">
        <SectionHeader
          eyebrow="Congestion Engine · Today"
          title="24-hour traffic flow & congestion"
          description="Vehicle volume (bars) vs congestion index (line) across all monitored corridors."
        />
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={hourlyData} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="hour" stroke="var(--color-muted-foreground)" fontSize={9} tickLine={false} axisLine={false} interval={3} />
              <YAxis yAxisId="vol" stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis yAxisId="ci"  orientation="right" domain={[0, 100]} stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 12 }}
                formatter={(v: number, name: string) =>
                  name === "volume" ? [`${v} vehicles`, "Volume"] : [`${v}`, "Congestion Index"]
                }
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="vol" dataKey="volume" name="volume" fill="var(--color-traffic)" opacity={0.55} radius={[3, 3, 0, 0]} />
              <Line yAxisId="ci"  dataKey="ci"     name="ci"     stroke="var(--color-risk)" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weekly trend */}
      <div className="card-surface p-5">
        <SectionHeader
          eyebrow="Weekly pattern"
          title="Day-by-day congestion trend"
          description="Average congestion index and incidents per weekday."
        />
        <div className="mt-4 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="ci" name="Congestion Index" radius={[4, 4, 0, 0]}>
                {weeklyData.map((d, i) => (
                  <Cell key={i} fill={ciColor(d.ci)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Corridor congestion bars */}
        <div className="mt-4 space-y-2">
          {data.corridors.slice(0, 4).map((c) => (
            <div key={c.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium truncate max-w-[180px]">{c.name}</span>
                <span style={{ color: LEVEL_COLOR[c.congestion_level as CongestionLevel] }}
                  className="text-[10px] font-semibold">{c.congestion_level}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-secondary">
                <div className="h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${c.congestion_index}%`, backgroundColor: LEVEL_COLOR[c.congestion_level as CongestionLevel] }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Section 3 — Hotspot Detection ───────────────────────────────────────────

function HotspotCard({ hotspot }: { hotspot: TrafficHotspot }) {
  const c = LEVEL_COLOR[hotspot.severity as CongestionLevel];
  const bg = LEVEL_BG[hotspot.severity as CongestionLevel];
  const vtc = Math.round(hotspot.volume_to_capacity * 100);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{hotspot.corridor_id}</p>
          <h4 className="mt-0.5 text-sm font-semibold leading-tight truncate">{hotspot.corridor_name}</h4>
        </div>
        <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold"
          style={{ backgroundColor: bg, color: c }}>{hotspot.severity}</span>
      </div>

      {/* Metrics row */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[
          { label: "CI",           value: String(hotspot.congestion_index) },
          { label: "Delay",        value: `+${hotspot.delay_minutes}m` },
          { label: "V/C",          value: `${vtc}%` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg bg-secondary/60 py-1.5">
            <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="text-sm font-semibold" style={{ color: c }}>{value}</div>
          </div>
        ))}
      </div>

      {/* CI progress bar */}
      <div className="mt-3 h-1.5 rounded-full bg-secondary">
        <div className="h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${hotspot.congestion_index}%`, backgroundColor: c }} />
      </div>

      {/* Incidents + recommendation */}
      {hotspot.incidents > 0 && (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <AlertTriangle className="h-3 w-3 shrink-0" style={{ color: "var(--color-risk)" }} />
          {hotspot.incidents} active incident{hotspot.incidents > 1 ? "s" : ""}
        </div>
      )}
      <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed border-t border-border pt-2">
        {hotspot.recommendation}
      </p>
    </div>
  );
}

function HotspotDetection() {
  const { data: hotspots, isLoading, error } = useTrafficHotspots();

  if (isLoading) return <LoadingBlock label="Detecting hotspots…" />;
  if (error || !hotspots) return <ErrorBlock message="Hotspot detection unavailable." />;

  if (hotspots.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
        <Activity className="h-6 w-6 text-[var(--color-success)]" />
        <span className="text-sm">No active hotspots — network flowing freely.</span>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {hotspots.map((h) => <HotspotCard key={h.corridor_id} hotspot={h} />)}
    </div>
  );
}

// ─── Section 4 — Route Recommendations ───────────────────────────────────────

function RouteCard({ route }: { route: RouteRecommendation }) {
  const saving = route.time_saving_min;
  const savingColor = saving > 0 ? "var(--color-success)" : "var(--color-muted-foreground)";

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
      {/* Journey header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span>{route.origin}</span>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{route.destination}</span>
        </div>
        <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold"
          style={{ backgroundColor: `color-mix(in oklab, ${savingColor} 15%, transparent)`, color: savingColor }}>
          −{saving} min
        </span>
      </div>

      {/* Route comparison */}
      <div className="mt-3 space-y-2">
        {/* Current (congested) */}
        <div className="flex items-start gap-2 rounded-lg border border-border bg-background/60 p-2.5">
          <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-risk)]" />
          <div className="min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground truncate">{route.current_route}</span>
              <span className="ml-2 shrink-0 text-xs text-[var(--color-risk)] font-semibold">{route.current_duration_min}m</span>
            </div>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Current route</p>
          </div>
        </div>

        {/* Recommended */}
        <div className="flex items-start gap-2 rounded-lg border bg-card p-2.5"
          style={{ borderColor: "var(--color-success)" }}>
          <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-success)]" />
          <div className="min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground truncate">{route.recommended_route}</span>
              <span className="ml-2 shrink-0 text-xs text-[var(--color-success)] font-semibold">{route.recommended_duration_min}m</span>
            </div>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Recommended</p>
          </div>
        </div>
      </div>

      {/* AI reason + validity */}
      <p className="mt-2.5 text-[11px] text-muted-foreground leading-relaxed border-t border-border pt-2">
        {route.reason}
      </p>
      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
        <Clock className="h-3 w-3" />
        Valid: {route.valid_until}
      </div>
    </div>
  );
}

function RouteRecommendations() {
  const { data: routes, isLoading, error } = useTrafficRoutes();

  if (isLoading) return <LoadingBlock label="Computing route recommendations…" />;
  if (error || !routes) return <ErrorBlock message="Route system unavailable." />;
  if (routes.length === 0) return (
    <div className="py-6 text-center text-sm text-muted-foreground">No alternate routes needed — all corridors clear.</div>
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {routes.map((r) => <RouteCard key={r.id} route={r} />)}
    </div>
  );
}

// ─── Section 5 — Traffic Forecast ────────────────────────────────────────────

function ForecastHorizonSelector({
  hours, onChange,
}: { hours: number; onChange: (h: number) => void }) {
  return (
    <div className="flex gap-1">
      {[6, 12, 24].map((h) => (
        <button key={h} onClick={() => onChange(h)}
          className={["rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            hours === h ? "bg-foreground text-background" : "border border-border text-muted-foreground hover:text-foreground"].join(" ")}>
          {h}h
        </button>
      ))}
    </div>
  );
}

function TrafficForecastSection() {
  const [hours, setHours] = useState(12);
  const { data: forecast, isLoading, error } = useTrafficForecast(hours);

  if (isLoading) return <LoadingBlock label="Generating forecast…" />;
  if (error || !forecast) return <ErrorBlock message="Forecast unavailable." />;

  const chartData = forecast.points.map((p) => ({
    hour:   p.hour,
    volume: p.predicted_volume,
    speed:  p.predicted_speed,
    ci:     p.congestion_index,
    conf:   Math.round(p.confidence * 100),
  }));

  return (
    <div className="card-surface p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeader
          eyebrow={`Forecast · model: ${forecast.model} · generated ${forecast.generated_at.slice(11, 16)}`}
          title={`${hours}-hour traffic forecast`}
          description={`Peak congestion expected at ${forecast.peak_hour} (CI: ${forecast.peak_congestion_index}). Confidence decays with forecast distance.`}
        />
        <ForecastHorizonSelector hours={hours} onChange={setHours} />
      </div>

      {/* Main forecast chart */}
      <div className="mt-5 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-traffic)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="var(--color-traffic)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="ciGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-risk)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--color-risk)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="hour" stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} axisLine={false} interval={Math.floor(chartData.length / 6)} />
            <YAxis yAxisId="vol" stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis yAxisId="ci" orientation="right" domain={[0, 100]} stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 12 }}
              formatter={(v: number, name: string) => {
                if (name === "volume")   return [`${v} veh`, "Volume"];
                if (name === "ci")       return [`${v}`, "Congestion Index"];
                if (name === "conf")     return [`${v}%`, "Confidence"];
                return [v, name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area yAxisId="vol" type="monotone" dataKey="volume" name="volume"
              stroke="var(--color-traffic)" strokeWidth={2} fill="url(#volGrad)" />
            <Area yAxisId="ci"  type="monotone" dataKey="ci"     name="ci"
              stroke="var(--color-risk)"    strokeWidth={2} fill="url(#ciGrad)" />
            <Line  yAxisId="ci"  type="monotone" dataKey="conf"   name="conf"
              stroke="var(--color-info)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Forecast point table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-left text-[10px] uppercase tracking-wide text-muted-foreground">
              {["Hour", "Volume", "Speed (km/h)", "CI", "Confidence"].map((h) => (
                <th key={h} className="pb-2 pr-4 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chartData.map((p) => (
              <tr key={p.hour} className="border-b border-border/50 hover:bg-secondary/40 transition-colors">
                <td className="py-1.5 pr-4 font-medium">{p.hour}</td>
                <td className="py-1.5 pr-4 text-muted-foreground">{p.volume.toLocaleString()}</td>
                <td className="py-1.5 pr-4 text-muted-foreground">{p.speed}</td>
                <td className="py-1.5 pr-4 font-semibold" style={{ color: ciColor(p.ci) }}>{p.ci}</td>
                <td className="py-1.5 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 rounded-full bg-secondary">
                      <div className="h-1.5 rounded-full bg-[var(--color-info)]"
                        style={{ width: `${p.conf}%` }} />
                    </div>
                    <span className="text-muted-foreground">{p.conf}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Page root ────────────────────────────────────────────────────────────────

function TrafficPage() {
  const { data: kpis } = useTrafficKPIs();
  const { data: forecast } = useTrafficForecast(12);

  return (
    <div className="mx-auto max-w-[1400px] space-y-8">

      {/* Page header */}
      <PageHeader
        title="Traffic Intelligence"
        subtitle={
          kpis
            ? `Avg speed ${kpis.avg_speed_kmh} km/h · CI ${kpis.congestion_index} · ${kpis.active_incidents} active incidents · data source: simulated`
            : "Real-time congestion, peak analysis, hotspot detection, and route recommendations."
        }
        action={
          forecast ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-[var(--color-success)] animate-pulse" />
              Next peak: {forecast.peak_hour} · CI {forecast.peak_congestion_index}
            </div>
          ) : undefined
        }
      />

      {/* 1. KPI strip */}
      <section>
        <KPIStrip />
      </section>

      {/* 2. Congestion Analysis Engine */}
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Congestion Analysis Engine"
          title="Network congestion patterns"
          description="24-hour flow volume, speed, and day-of-week congestion breakdown."
        />
        <CongestionAnalysis />
      </section>

      {/* 3. Hotspot Detection */}
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Hotspot Detection"
          title="Active congestion hotspots"
          description="Corridors with Moderate or worse congestion — sorted by severity. Each includes an AI-generated operational recommendation."
        />
        <HotspotDetection />
      </section>

      {/* 4. Route Recommendations */}
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Route Recommendation System"
          title="Recommended alternate routes"
          description="Ranked by time saving. AI-generated from live corridor speed data. Ready for TomTom/HERE integration."
        />
        <RouteRecommendations />
      </section>

      {/* 5. Traffic Forecasting */}
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Traffic Forecasting"
          title="Congestion forecast"
          description="Wave-pattern model anchored to historical hourly flow. Confidence decays with forecast distance. ML pipeline integration ready."
        />
        <TrafficForecastSection />
      </section>

    </div>
  );
}
