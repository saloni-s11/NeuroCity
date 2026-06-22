import { createFileRoute } from "@tanstack/react-router";
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from "recharts";
import { PageHeader, SectionHeader } from "@/components/neuro/SectionHeader";
import { useHealthScore, useEnvironmentalMetrics, useSustainabilityPerformance } from "@/hooks/useSustainability";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/sustainability")({
  head: () => ({ meta: [{ title: "Sustainability · NeuroCity" }] }),
  component: SustainabilityPage,
});

function Ring({ value, color }: { value: number; color: string }) {
  const data = [{ name: "v", value, fill: color }];
  return (
    <div className="relative h-32 w-32">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart data={data} startAngle={90} endAngle={-270} innerRadius="78%" outerRadius="100%">
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" cornerRadius={12} background={{ fill: "var(--color-secondary)" }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-2xl font-semibold tracking-tight">{Math.round(value)}</div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">/ 100</div>
        </div>
      </div>
    </div>
  );
}

function PillarRing({ label, value, benchmark, color }: { label: string; value: number; benchmark: number; color: string }) {
  return (
    <div className="card-surface flex flex-col items-center p-5">
      <Ring value={value} color={color} />
      <div className="mt-3 text-sm font-semibold">{label}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">
        vs benchmark {value >= benchmark ? `+${Math.round(value - benchmark)}` : `−${Math.round(benchmark - value)}`}
      </div>
    </div>
  );
}

function ProgressBar({ label, value, color, suffix = "%" }: { label: string; value: number; color: string; suffix?: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-semibold text-muted-foreground">{value}{suffix}</span>
      </div>
      <div className="mt-1.5 h-2 w-full rounded-full bg-secondary">
        <div className="h-2 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function SustainabilityPage() {
  const { data: healthScore, isLoading: healthLoading } = useHealthScore();
  const { data: envMetrics, isLoading: envLoading } = useEnvironmentalMetrics();
  const { data: performance, isLoading: perfLoading } = useSustainabilityPerformance();

  if (healthLoading || envLoading || perfLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="text-sm">Loading sustainability data...</span>
      </div>
    );
  }

  if (!healthScore || !envMetrics || !performance) return null;

  return (
    <div className="mx-auto max-w-[1400px] space-y-8">
      <PageHeader title="Sustainability" subtitle="A composite view of how the city is performing for its future." />

      <div className="card-surface relative overflow-hidden p-8">
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-50 blur-3xl"
          style={{ background: `radial-gradient(closest-side, color-mix(in oklab, var(--color-${healthScore.overall_score >= 80 ? 'environment' : healthScore.overall_score >= 65 ? 'traffic' : 'risk'}) 35%, transparent), transparent)` }}
        />
        <div className="relative flex flex-wrap items-center gap-8">
          <Ring value={healthScore.overall_score} color={`var(--color-${healthScore.overall_score >= 80 ? 'environment' : healthScore.overall_score >= 65 ? 'traffic' : 'risk'})`} />
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
              Overall sustainability 
              <span className="px-1.5 py-0.5 rounded bg-secondary font-bold text-[10px]">{healthScore.grade} GRADE</span>
            </div>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight">NeuroCity scores {healthScore.overall_score} / 100</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground leading-relaxed">
              {healthScore.description}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-surface p-6 space-y-6">
          <SectionHeader eyebrow="Metrics" title="Environmental targets" />
          <div className="space-y-5">
            <ProgressBar label="Renewable Energy Mix" value={envMetrics.renewable_mix_pct} color="var(--color-success)" />
            <ProgressBar label="Water Efficiency" value={envMetrics.water_efficiency_pct} color="var(--color-info)" />
            <ProgressBar label="Waste Diversion" value={envMetrics.waste_diversion_pct} color="var(--color-ai)" />
            <ProgressBar label="EV Penetration" value={envMetrics.ev_penetration_pct} color="var(--color-infrastructure)" />
          </div>
          
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-6">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Carbon Footprint</div>
              <div className="mt-1 text-2xl font-semibold">{envMetrics.carbon_footprint} <span className="text-sm text-muted-foreground">ktCO₂e</span></div>
              <div className="text-[11px] text-muted-foreground mt-1">Target: {envMetrics.carbon_target} ktCO₂e</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Energy Per Capita</div>
              <div className="mt-1 text-2xl font-semibold">{envMetrics.energy_per_capita} <span className="text-sm text-muted-foreground">MWh/yr</span></div>
            </div>
          </div>
        </div>

        <div className="card-surface p-6">
          <SectionHeader eyebrow="Performance" title="12-Month Trend" />
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performance.trend_12m} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-environment)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--color-environment)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
                <YAxis domain={['dataMin - 5', 'dataMax + 5']} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ color: 'var(--color-foreground)' }}
                />
                <Area type="monotone" dataKey="sustainability_score" stroke="var(--color-environment)" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" name="Score" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{performance.narrative}</p>
        </div>
      </div>

      <SectionHeader eyebrow="Pillars" title="Score breakdown" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {performance.pillars.map((p) => {
          let color = "var(--color-info)";
          if (p.name === "Environmental") color = "var(--color-environment)";
          if (p.name === "Mobility") color = "var(--color-traffic)";
          if (p.name === "Infrastructure") color = "var(--color-infrastructure)";
          
          return (
            <PillarRing 
              key={p.name} 
              label={p.name} 
              value={p.score} 
              benchmark={p.benchmark} 
              color={color} 
            />
          );
        })}
      </div>

      <div className="card-surface p-6">
        <SectionHeader eyebrow="Benchmarks" title="Peer comparison" />
        <div className="mt-6 space-y-4">
          {performance.peer_comparison.map((peer) => (
            <div key={peer.name}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className={`font-medium ${peer.name === "NeuroCity" ? "text-foreground" : "text-muted-foreground"}`}>
                  {peer.rank}. {peer.name}
                </span>
                <span className="font-semibold">{peer.score}/100</span>
              </div>
              <div className="h-2 rounded-full bg-secondary">
                <div 
                  className="h-full rounded-full transition-all duration-1000" 
                  style={{ 
                    width: `${peer.score}%`, 
                    background: peer.name === "NeuroCity" ? "var(--color-foreground)" : "var(--color-muted-foreground)" 
                  }} 
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
