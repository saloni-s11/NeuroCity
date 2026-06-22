import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Play, RotateCcw, AlertTriangle, TrendingUp, TrendingDown, ArrowRight, ServerCrash } from "lucide-react";
import { PageHeader, SectionHeader } from "@/components/neuro/SectionHeader";
import { useSimulationPresets, useRunSimulation } from "@/hooks/useSimulation";
import type { SimulationScenario } from "@/types/city";

export const Route = createFileRoute("/simulations")({
  head: () => ({ meta: [{ title: "Simulations · NeuroCity" }] }),
  component: SimulationsPage,
});

const TABS: { id: SimulationScenario; label: string }[] = [
  { id: "population_growth", label: "Population Growth" },
  { id: "ev_adoption", label: "EV Adoption" },
  { id: "renewable_energy", label: "Renewable Energy" },
  { id: "climate_event", label: "Climate Event" },
];

function SliderInput({ label, value, onChange, min, max, unit, description }: any) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <div className="text-sm text-muted-foreground">{value} {unit}</div>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        value={value} 
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-foreground"
      />
      <div className="text-[11px] text-muted-foreground">{description}</div>
    </div>
  );
}

function ImpactCard({ impact }: { impact: any }) {
  const isPositive = impact.tone === "positive";
  const isNegative = impact.tone === "negative";
  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : ArrowRight;
  const colorClass = isPositive ? "text-[var(--color-success)]" : isNegative ? "text-[var(--color-risk)]" : "text-muted-foreground";

  return (
    <div className="card-surface p-4 flex flex-col justify-between group hover:border-[var(--color-info)] transition-colors">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{impact.label}</div>
      <div className="mt-3 flex items-end gap-2">
        <span className="text-2xl font-semibold">{impact.value}</span>
        <span className="text-sm text-muted-foreground mb-1">{impact.unit}</span>
      </div>
      <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${colorClass}`}>
        <Icon className="h-3 w-3" />
        <span>{Math.abs(impact.delta_pct)}% from baseline</span>
      </div>
    </div>
  );
}

function SimulationsPage() {
  const [activeTab, setActiveTab] = useState<SimulationScenario>("population_growth");
  
  // Params state
  const [params, setParams] = useState<Record<string, number>>({
    growth_pct: 15, metro_expansion_km: 20, infra_budget_cr: 50,
    adoption_pct: 35, subsidy_cr: 200, charging_stations: 500,
    renewable_pct: 40, solar_capacity_mw: 500, wind_capacity_mw: 200,
    severity: 60, duration_days: 5,
  });
  
  const [eventType, setEventType] = useState("flood");

  const { data: presets } = useSimulationPresets();
  const runSim = useRunSimulation();

  // Run automatically when tab changes
  useEffect(() => {
    handleRun();
  }, [activeTab]);

  const handleParamChange = (key: string, val: number) => {
    setParams(prev => ({ ...prev, [key]: val }));
  };

  const handleRun = () => {
    let currentParams = {};
    if (activeTab === "population_growth") {
      currentParams = { growth_pct: params.growth_pct, metro_expansion_km: params.metro_expansion_km, infra_budget_cr: params.infra_budget_cr };
    } else if (activeTab === "ev_adoption") {
      currentParams = { adoption_pct: params.adoption_pct, subsidy_cr: params.subsidy_cr, charging_stations: params.charging_stations };
    } else if (activeTab === "renewable_energy") {
      currentParams = { renewable_pct: params.renewable_pct, solar_capacity_mw: params.solar_capacity_mw, wind_capacity_mw: params.wind_capacity_mw };
    } else if (activeTab === "climate_event") {
      currentParams = { event_type: eventType, severity: params.severity, duration_days: params.duration_days };
    }
    runSim.mutate({ scenario: activeTab, params: currentParams });
  };

  const applyPreset = (preset: any) => {
    setActiveTab(preset.scenario as SimulationScenario);
    if (preset.params.event_type) setEventType(preset.params.event_type);
    setParams(prev => ({ ...prev, ...preset.params }));
    runSim.mutate({ scenario: preset.scenario, params: preset.params });
  };

  const activePresets = presets?.filter(p => p.scenario === activeTab) || [];
  const result = runSim.data;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader title="City Simulation Engine" subtitle="Model future scenarios and quantify impacts on city infrastructure and environment." />

      <div className="flex border-b border-border mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab.id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Controls */}
        <div className="lg:col-span-4 space-y-6">
          <div className="card-surface p-5 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Parameters</h3>
              <button 
                onClick={() => setParams({
                  growth_pct: 15, metro_expansion_km: 20, infra_budget_cr: 50,
                  adoption_pct: 35, subsidy_cr: 200, charging_stations: 500,
                  renewable_pct: 40, solar_capacity_mw: 500, wind_capacity_mw: 200,
                  severity: 60, duration_days: 5,
                })}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Reset defaults"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>

            {activeTab === "population_growth" && (
              <>
                <SliderInput label="Population Growth" value={params.growth_pct} onChange={(v: number) => handleParamChange("growth_pct", v)} min={0} max={50} unit="%" description="Projected population surge" />
                <SliderInput label="Metro Expansion" value={params.metro_expansion_km} onChange={(v: number) => handleParamChange("metro_expansion_km", v)} min={0} max={100} unit="km" description="New metro line distance planned" />
                <SliderInput label="Infra Budget" value={params.infra_budget_cr} onChange={(v: number) => handleParamChange("infra_budget_cr", v)} min={10} max={200} unit="₹Cr" description="Additional infrastructure allocation" />
              </>
            )}

            {activeTab === "ev_adoption" && (
              <>
                <SliderInput label="EV Market Share" value={params.adoption_pct} onChange={(v: number) => handleParamChange("adoption_pct", v)} min={5} max={90} unit="%" description="Target electric vehicle penetration" />
                <SliderInput label="Purchase Subsidies" value={params.subsidy_cr} onChange={(v: number) => handleParamChange("subsidy_cr", v)} min={0} max={1000} unit="₹Cr" description="Total EV subsidy allocation" />
                <SliderInput label="Charging Network" value={params.charging_stations} onChange={(v: number) => handleParamChange("charging_stations", v)} min={100} max={5000} unit="stations" description="Level-3 public fast chargers" />
              </>
            )}

            {activeTab === "renewable_energy" && (
              <>
                <SliderInput label="Grid Renewable Mix" value={params.renewable_pct} onChange={(v: number) => handleParamChange("renewable_pct", v)} min={10} max={90} unit="%" description="Total renewable share of grid" />
                <SliderInput label="Solar Capacity" value={params.solar_capacity_mw} onChange={(v: number) => handleParamChange("solar_capacity_mw", v)} min={100} max={2000} unit="MW" description="Rooftop and utility-scale solar" />
                <SliderInput label="Wind Capacity" value={params.wind_capacity_mw} onChange={(v: number) => handleParamChange("wind_capacity_mw", v)} min={0} max={1000} unit="MW" description="Offshore and suburban wind" />
              </>
            )}

            {activeTab === "climate_event" && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Event Type</label>
                  <select 
                    value={eventType} 
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full bg-secondary border-none rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-info outline-none"
                  >
                    <option value="flood">Monsoon Flooding</option>
                    <option value="heatwave">Extreme Heatwave</option>
                    <option value="cyclone">Cyclonic Storm</option>
                  </select>
                </div>
                <SliderInput label="Event Severity" value={params.severity} onChange={(v: number) => handleParamChange("severity", v)} min={10} max={100} unit="idx" description="Intensity of the climate event" />
                <SliderInput label="Duration" value={params.duration_days} onChange={(v: number) => handleParamChange("duration_days", v)} min={1} max={30} unit="days" description="How long the event persists" />
              </>
            )}

            <button 
              onClick={handleRun}
              disabled={runSim.isPending}
              className="w-full py-2.5 bg-foreground text-background font-medium rounded-md hover:opacity-90 transition-opacity flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {runSim.isPending ? <RotateCcw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {runSim.isPending ? "Simulating..." : "Run Simulation"}
            </button>
          </div>

          {activePresets.length > 0 && (
            <div className="card-surface p-5">
              <h3 className="font-semibold text-sm mb-3">Quick Presets</h3>
              <div className="flex flex-col gap-2">
                {activePresets.map(preset => (
                  <button 
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className="text-left p-3 rounded-md bg-secondary hover:bg-secondary/70 transition-colors border border-border/50"
                  >
                    <div className="font-medium text-sm">{preset.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{preset.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-8 space-y-6">
          {runSim.isPending ? (
            <div className="card-surface p-12 flex flex-col items-center justify-center min-h-[400px] text-muted-foreground border border-dashed border-border">
              <ServerCrash className="h-10 w-10 animate-pulse mb-4 text-[var(--color-info)]" />
              <div className="text-lg font-medium">Computing scenario impacts...</div>
              <div className="text-sm max-w-sm text-center mt-2">Running polynomial models against current sector data to project urban dynamics.</div>
            </div>
          ) : result ? (
            <>
              <div className="card-surface p-6 relative overflow-hidden">
                <div 
                  className="absolute top-0 right-0 w-2 h-full" 
                  style={{ backgroundColor: `var(--color-${result.risk_level === 'Critical' ? 'risk' : result.risk_level === 'High' ? 'traffic' : result.risk_level === 'Medium' ? 'warning' : 'success'})` }} 
                />
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-secondary">{result.scenario_label}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" 
                        style={{ 
                          backgroundColor: `color-mix(in srgb, var(--color-${result.risk_level === 'Critical' ? 'risk' : result.risk_level === 'High' ? 'traffic' : result.risk_level === 'Medium' ? 'warning' : 'success'}) 20%, transparent)`,
                          color: `var(--color-${result.risk_level === 'Critical' ? 'risk' : result.risk_level === 'High' ? 'traffic' : result.risk_level === 'Medium' ? 'warning' : 'success'})`
                        }}
                      >
                        {result.risk_level} Risk
                      </span>
                    </div>
                    <h2 className="text-2xl font-semibold">Simulation Report</h2>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-light tracking-tight">{result.confidence}%</div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Confidence</div>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-muted-foreground border-l-2 border-[var(--color-info)] pl-4">
                  {result.narrative}
                </p>
              </div>

              <div>
                <SectionHeader eyebrow="Metrics" title="Projected Impacts" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
                  {result.impacts.map((impact, i) => (
                    <ImpactCard key={i} impact={impact} />
                  ))}
                </div>
              </div>

              <div className="card-surface p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-[var(--color-traffic)]" />
                  AI Recommendations
                </h3>
                <ul className="space-y-3">
                  {result.recommendations.map((rec, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <div className="mt-0.5 min-w-[20px] h-5 w-5 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold">{i+1}</div>
                      <span className="text-muted-foreground leading-relaxed">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="card-surface p-12 flex flex-col items-center justify-center min-h-[400px] text-muted-foreground border border-dashed border-border">
              <Play className="h-8 w-8 mb-4 opacity-50" />
              <div className="text-lg font-medium text-foreground">Ready to simulate</div>
              <div className="text-sm max-w-sm text-center mt-2">Adjust the parameters on the left and run the simulation to see projected impacts on NeuroCity.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
