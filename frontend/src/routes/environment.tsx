import { createFileRoute } from "@tanstack/react-router";
import {
  CloudRain, Droplets, Leaf, Loader2,
  Sun, Thermometer, Volume2, Wind,
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ComposedChart,
  Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { PageHeader, SectionHeader } from "@/components/neuro/SectionHeader";
import { KpiCard } from "@/components/neuro/KpiCard";
import {
  useEnvForecast, useEnvHotspots,
  useEnvOverview, useEnvRisks, useEnvTrends,
} from "@/hooks/useEnvironment";
import type { AqiStatus, EnvForecastItem, EnvHotspot, EnvRisk } from "@/types/city";

// ─── Route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/environment")({
  head: () => ({ meta: [{ title: "Environment · NeuroCity" }] }),
  component: EnvPage,
});

// ─── AQI colour helpers ───────────────────────────────────────────────────────

function aqiColor(status: AqiStatus | string): string {
  switch (status) {
    case "Good":                               return "var(--color-success)";
    case "Moderate":                           return "var(--color-info)";
    case "Unhealthy for Sensitive Groups":     return "var(--color-traffic)";
    case "Unhealthy":                          return "var(--color-risk)";
    case "Very Unhealthy":                     return "#a855f7";
    case "Hazardous":                          return "#7c3aed";
    default:                                   return "var(--color-environment)";
  }
}

function aqiNumColor(aqi: number): string {
  if (aqi <= 50)  return "var(--color-success)";
  if (aqi <= 100) return "var(--color-info)";
  if (aqi <= 150) return "var(--color-traffic)";
  if (aqi <= 200) return "var(--color-risk)";
  return "#a855f7";
}

const SEVERITY_COLOR: Record<string, string> = {
  Critical: "var(--color-risk)",
  High:     "var(--color-traffic)",
  Medium:   "var(--color-info)",
  Low:      "var(--color-success)",
};

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
    <div className="rounded-xl border border-border bg-card p-5 text-center text-sm text-muted-foreground">
      {msg}
    </div>
  );
}

// ─── 1. KPI strip ─────────────────────────────────────────────────────────────

function EnvKPIs() {
  const { data: ov, isLoading, error } = useEnvOverview();
  const { data: trends } = useEnvTrends();

  if (isLoading) return <Spinner label="Loading KPIs…" />;
  if (error || !ov) return <ErrBox msg="Could not load environmental KPIs — check backend." />;

  // Build sparklines from 14-day trend data (last 8 days for sparkline width)
  const last8 = (trends ?? []).slice(-8);
  const aqiSpark   = last8.length ? last8.map((d) => d.aqi)         : [ov.aqi];
  const tempSpark  = last8.length ? last8.map((d) => d.temperature) : [ov.temperature];
  const humSpark   = last8.length ? last8.map((d) => d.humidity)    : [ov.humidity];
  const co2Spark   = last8.length ? last8.map((d) => d.co2)         : [ov.co2];

  const color = aqiColor(ov.aqi_status);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="City AQI" value={String(ov.aqi)} delta={-3.4}
        trend={aqiSpark} icon={Wind} tone="environment"
        status={ov.aqi_status.length > 16 ? ov.aqi_status.slice(0, 16) + "…" : ov.aqi_status}
      />
      <KpiCard
        label="Temperature" value={`${ov.temperature}°`} delta={1.6}
        trend={tempSpark} icon={Sun} tone="traffic"
        status={ov.temperature > 35 ? "Heat Risk" : "Normal"}
      />
      <KpiCard
        label="Humidity" value={`${ov.humidity}%`} delta={-2.1}
        trend={humSpark} icon={CloudRain} tone="info"
        status={ov.humidity > 80 ? "High" : "Normal"}
      />
      <KpiCard
        label="Carbon" value={String(ov.co2)} unit="ppm" delta={0.4}
        trend={co2Spark} icon={Leaf} tone="ai"
        status={ov.co2 > 500 ? "High" : ov.co2 > 450 ? "Elevated" : "Normal"}
      />
    </div>
  );
}

// ─── 2. AQI Classification Engine header badge ────────────────────────────────

function AqiBadge() {
  const { data: ov } = useEnvOverview();
  if (!ov) return null;
  const color = aqiColor(ov.aqi_status);
  return (
    <span className="rounded-full px-3 py-1 text-xs font-semibold"
      style={{ backgroundColor: `color-mix(in oklab, ${color} 15%, transparent)`, color }}>
      {ov.aqi_status}
    </span>
  );
}

// ─── 4. AQI Trend chart ───────────────────────────────────────────────────────

function AqiTrendChart() {
  const { data: trends, isLoading, error } = useEnvTrends();
  const { data: ov } = useEnvOverview();

  if (isLoading) return <Spinner label="Loading trend data…" />;
  if (error || !trends) return <ErrBox msg="Trend data unavailable." />;

  const chartData = trends.map((d) => ({
    d: d.day,
    aqi: d.aqi,
    temp: d.temperature,
    co2: d.co2,
  }));

  return (
    <div className="card-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <SectionHeader
          eyebrow="14-day history"
          title="Air quality trend"
          description="Daily city-wide AQI, temperature overlay, and CO₂ level."
        />
        {ov && <AqiBadge />}
      </div>
      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="aqGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-environment)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="var(--color-environment)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="d" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} interval={2} />
            <YAxis yAxisId="aqi"  stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis yAxisId="temp" orientation="right" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} domain={[20, 45]} />
            <Tooltip
              contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 12 }}
              formatter={(v: number, name: string) => {
                if (name === "aqi")  return [`${v}`, "AQI"];
                if (name === "temp") return [`${v}°C`, "Temperature"];
                if (name === "co2")  return [`${v} ppm`, "CO₂"];
                return [v, name];
              }}
            />
            <Area  yAxisId="aqi"  type="monotone" dataKey="aqi"  stroke="var(--color-environment)" strokeWidth={2.5} fill="url(#aqGrad)" name="aqi" />
            <Line  yAxisId="temp" type="monotone" dataKey="temp" stroke="var(--color-traffic)"      strokeWidth={1.5} dot={false} strokeDasharray="4 3" name="temp" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── 3. Pollution Hotspots panel ──────────────────────────────────────────────

function HotspotsPanel() {
  const { data: hotspots, isLoading, error } = useEnvHotspots();

  if (isLoading) return <Spinner label="Detecting hotspots…" />;
  if (error)     return <ErrBox msg="Hotspot detection unavailable." />;

  return (
    <div className="card-surface p-5">
      <SectionHeader eyebrow="Hotspot Detection" title="Pollution hotspots" />
      {(!hotspots || hotspots.length === 0) ? (
        <div className="mt-4 flex flex-col items-center gap-2 py-6 text-muted-foreground">
          <Wind className="h-6 w-6 text-[var(--color-success)]" />
          <span className="text-sm">All sectors within safe limits.</span>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {hotspots.map((h: EnvHotspot) => {
            const c = aqiNumColor(h.aqi);
            return (
              <li key={h.sector_id}
                className="rounded-xl border border-border bg-background/60 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-lg"
                      style={{ backgroundColor: `color-mix(in oklab, ${c} 14%, transparent)`, color: c }}>
                      <Droplets className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="text-sm font-medium">{h.sector}</div>
                      <div className="text-[11px] text-muted-foreground">{h.aqi_status}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold" style={{ color: c }}>{h.aqi}</div>
                    <div className="text-[10px] text-muted-foreground">AQI</div>
                  </div>
                </div>
                {/* Risk score bar */}
                <div className="mt-2 h-1 w-full rounded-full bg-secondary">
                  <div className="h-1 rounded-full transition-all duration-500"
                    style={{ width: `${h.risk_score}%`, backgroundColor: c }} />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>PM2.5: {h.pm25} µg/m³ · CO₂: {h.co2} ppm</span>
                  <span>Risk {h.risk_score}/100</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── 5. Risk & Forecast cards ─────────────────────────────────────────────────

function RiskCard({ risk }: { risk: EnvRisk }) {
  const c = SEVERITY_COLOR[risk.severity] ?? "var(--color-info)";
  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: c }}>
          Risk · {risk.type}
        </div>
        <span className="rounded-full px-2 py-0.5 text-[9px] font-bold"
          style={{ backgroundColor: `color-mix(in oklab, ${c} 14%, transparent)`, color: c }}>
          {risk.severity}
        </span>
      </div>
      <p className="mt-2 text-sm text-foreground">{risk.message}</p>
      <div className="mt-2 text-[10px] text-muted-foreground">
        {risk.sector} · {risk.value} &gt; {risk.threshold} threshold
      </div>
    </div>
  );
}

function ForecastCard({ item }: { item: EnvForecastItem }) {
  const isOpportunity = item.type === "Opportunity";
  const c = isOpportunity ? "var(--color-success)" : "var(--color-traffic)";
  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: c }}>
          {isOpportunity ? "Opportunity" : "Risk"} · {item.tag}
        </div>
        <span className="text-[10px] text-muted-foreground">{item.confidence}% conf.</span>
      </div>
      <p className="mt-2 text-sm font-medium text-foreground">{item.title}</p>
      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{item.description}</p>
      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border pt-2">
        <span>{item.horizon}</span>
        <div className="h-1 w-16 rounded-full bg-secondary">
          <div className="h-1 rounded-full" style={{ width: `${item.confidence}%`, backgroundColor: c }} />
        </div>
      </div>
    </div>
  );
}

function RisksAndForecast() {
  const { data: risks,    isLoading: rLoading,  error: rError  } = useEnvRisks();
  const { data: forecast, isLoading: fLoading,  error: fError  } = useEnvForecast();

  const loading = rLoading || fLoading;
  const error   = rError   || fError;

  if (loading) return <Spinner label="Generating risk assessment…" />;
  if (error)   return <ErrBox msg="Risk/forecast data unavailable." />;

  // Combine: show first 2 risks, then forecasts, cap total at 6 for a 3-col grid
  const riskCards     = (risks    ?? []).slice(0, 2);
  const forecastCards = (forecast ?? []).slice(0, 4);
  const combined = [
    ...riskCards.map((r) => ({ kind: "risk"     as const, data: r })),
    ...forecastCards.map((f) => ({ kind: "forecast" as const, data: f })),
  ].slice(0, 6);

  if (combined.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        No active risks or forecasts detected.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {combined.map((item, i) =>
        item.kind === "risk"
          ? <RiskCard    key={`risk-${i}`}     risk={item.data as EnvRisk}         />
          : <ForecastCard key={`forecast-${i}`} item={item.data as EnvForecastItem} />
      )}
    </div>
  );
}

// ─── Secondary metrics row (PM2.5, PM10, Noise, Wind) ────────────────────────

function SecondaryMetrics() {
  const { data: ov } = useEnvOverview();
  if (!ov) return null;

  const items = [
    { label: "PM2.5",      value: `${ov.pm25} µg/m³`,     icon: Wind,        color: aqiNumColor(ov.aqi) },
    { label: "PM10",       value: `${ov.pm10} µg/m³`,     icon: CloudRain,   color: "var(--color-info)" },
    { label: "Noise",      value: `${ov.noise_level} dB`,  icon: Volume2,     color: ov.noise_level > 80 ? "var(--color-risk)" : "var(--color-traffic)" },
    { label: "CO₂",        value: `${ov.co2} ppm`,         icon: Leaf,        color: ov.co2 > 500 ? "var(--color-risk)" : "var(--color-ai)" },
    { label: "Humidity",   value: `${ov.humidity}%`,        icon: Droplets,    color: "var(--color-info)" },
    { label: "Temp",       value: `${ov.temperature}°C`,   icon: Thermometer, color: ov.temperature > 35 ? "var(--color-risk)" : "var(--color-traffic)" },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
      {items.map(({ label, value, icon: Icon, color }) => (
        <div key={label}
          className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card py-3 px-2 text-center">
          <span className="grid h-8 w-8 place-items-center rounded-lg"
            style={{ backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)`, color }}>
            <Icon className="h-4 w-4" />
          </span>
          <div className="text-xs font-semibold text-foreground">{value}</div>
          <div className="text-[10px] text-muted-foreground">{label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Page root ────────────────────────────────────────────────────────────────

function EnvPage() {
  const { data: ov } = useEnvOverview();

  return (
    <div className="mx-auto max-w-[1400px] space-y-8">

      <PageHeader
        title="Environment"
        subtitle={
          ov
            ? `City AQI ${ov.aqi} · ${ov.aqi_status} · Temp ${ov.temperature}°C · CO₂ ${ov.co2} ppm · data: ${ov.data_source}`
            : "Air quality, temperature, emissions, and risk monitoring."
        }
      />

      {/* 1 — KPI Overview */}
      <section>
        <EnvKPIs />
      </section>

      {/* Secondary detail metrics */}
      <section>
        <SecondaryMetrics />
      </section>

      {/* 2+4 — Trend chart + Hotspots panel (matches original 2-column layout) */}
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <AqiTrendChart />
        <HotspotsPanel />
      </div>

      {/* 5+6 — Risks & Forecast (matches original 3-column card row) */}
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Risk Detection & Forecasting"
          title="Environmental risks and opportunities"
          description="Rule-based risk engine and AI forecast — ready for real sensor/ML pipeline integration."
        />
        <RisksAndForecast />
      </section>

    </div>
  );
}
