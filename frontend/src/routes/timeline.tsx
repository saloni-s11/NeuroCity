import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { PageHeader, SectionHeader } from "@/components/neuro/SectionHeader";
import { useProjections, useScenarios, useMilestones } from "@/hooks/useTimeline";
import { Loader2, Calendar, Map, Activity, Zap, Leaf, Flag } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

export const Route = createFileRoute("/timeline")({
  head: () => ({ meta: [{ title: "Timeline · NeuroCity" }] }),
  component: TimelinePage,
});

function MetricMiniCard({ label, value, unit, icon: Icon, colorClass }: any) {
  return (
    <div className="card-surface p-4 flex items-center gap-4">
      <div className={`p-2.5 rounded-md bg-secondary ${colorClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
        <div className="text-xl font-semibold">{value} <span className="text-sm font-normal text-muted-foreground">{unit}</span></div>
      </div>
    </div>
  );
}

function TimelinePage() {
  const { data: projections, isLoading: projLoading } = useProjections();
  const { data: scenariosData, isLoading: scenLoading } = useScenarios();
  const { data: milestones, isLoading: mileLoading } = useMilestones();

  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [activeScenario, setActiveScenario] = useState<string>("Baseline");

  if (projLoading || scenLoading || mileLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="text-sm">Generating 15-year projections...</span>
      </div>
    );
  }

  if (!projections || !scenariosData || !milestones) return null;

  const currentScenario = scenariosData.scenarios.find(s => s.name === activeScenario) || scenariosData.scenarios[0];
  const yearData = currentScenario.data.find(d => d.year === selectedYear) || currentScenario.data[0];

  const chartData = currentScenario.data;

  const milestonesForYear = milestones.filter(m => m.year === selectedYear);

  return (
    <div className="mx-auto max-w-[1400px] space-y-8 pb-12">
      <PageHeader title="Timeline Engine" subtitle="15-year urban projections, scenario comparisons, and future milestone generation." />

      {/* Scenario Selector */}
      <div className="flex gap-2 p-1 bg-secondary rounded-lg inline-flex w-full overflow-x-auto">
        {scenariosData.scenarios.map(s => (
          <button
            key={s.name}
            onClick={() => setActiveScenario(s.name)}
            className={`flex-1 min-w-[150px] py-2 px-4 text-sm font-medium rounded-md transition-all ${
              activeScenario === s.name 
                ? "bg-background text-foreground shadow-sm ring-1 ring-border" 
                : "text-muted-foreground hover:text-foreground hover:bg-secondary-hover"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Year Slider */}
      <div className="card-surface p-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Projection Year</div>
            <div className="text-5xl font-light tracking-tight flex items-baseline gap-2">
              {selectedYear}
              {selectedYear === 2026 && <span className="text-sm font-medium text-[var(--color-info)] bg-[var(--color-info)]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Current</span>}
            </div>
          </div>
        </div>

        <div className="relative pt-4 pb-8">
          <input 
            type="range" 
            min={projections.start_year} 
            max={projections.end_year} 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-full appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-secondary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:-mt-2 cursor-pointer focus:outline-none"
          />
          <div className="absolute top-10 left-0 w-full flex justify-between text-[10px] font-semibold text-muted-foreground px-1">
            <span>{projections.start_year}</span>
            <span>2030</span>
            <span>2035</span>
            <span>{projections.end_year}</span>
          </div>
        </div>

        {/* Selected Year Data Dash */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-4 pt-8 border-t border-border">
          <MetricMiniCard label="Population" value={yearData.population_m} unit="M" icon={Map} colorClass="text-[var(--color-info)]" />
          <MetricMiniCard label="Sustainability" value={yearData.sustainability_score} unit="/100" icon={Leaf} colorClass="text-[var(--color-environment)]" />
          <MetricMiniCard label="Traffic Index" value={yearData.traffic_index} unit="" icon={Activity} colorClass="text-[var(--color-traffic)]" />
          <MetricMiniCard label="Energy Demand" value={yearData.energy_gw} unit="GW" icon={Zap} colorClass="text-[var(--color-warning)]" />
          <MetricMiniCard label="EV Adoption" value={yearData.ev_pct} unit="%" icon={Zap} colorClass="text-[var(--color-ai)]" />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 card-surface p-6">
          <SectionHeader eyebrow="Trajectory" title={`${activeScenario} Projection`} />
          <p className="text-sm text-muted-foreground mt-2 mb-6">{currentScenario.description}</p>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSust" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-environment)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--color-environment)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-traffic)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--color-traffic)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', borderRadius: '8px', fontSize: '12px' }}
                />
                <ReferenceLine x={selectedYear} stroke="var(--color-foreground)" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="sustainability_score" name="Sustainability" stroke="var(--color-environment)" fillOpacity={1} fill="url(#colorSust)" />
                <Area type="monotone" dataKey="traffic_index" name="Traffic" stroke="var(--color-traffic)" fillOpacity={0.5} fill="url(#colorTraffic)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 p-4 rounded bg-secondary/50 text-sm text-muted-foreground border border-border/50">
            {scenariosData.analysis}
          </div>
        </div>

        {/* Milestones Sidebar */}
        <div className="card-surface p-6 flex flex-col h-full">
          <SectionHeader eyebrow="Events" title="Key Milestones" />
          
          <div className="mt-6 flex-1 overflow-y-auto pr-2 space-y-6">
            {milestones.map((m, i) => {
              const isSelected = m.year === selectedYear;
              const isPast = m.year < selectedYear;
              
              return (
                <div key={i} className={`relative pl-6 border-l-2 ${isSelected ? 'border-foreground' : isPast ? 'border-muted' : 'border-border'}`}>
                  <div className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-background ${isSelected ? 'bg-foreground' : isPast ? 'bg-muted' : 'bg-border'}`} />
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold uppercase ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>{m.year}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-secondary text-muted-foreground">
                      {m.category}
                    </span>
                  </div>
                  <h4 className={`text-sm font-semibold mb-1 ${isSelected ? 'text-foreground' : 'text-foreground/80'}`}>{m.title}</h4>
                  <p className="text-xs text-muted-foreground">{m.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
