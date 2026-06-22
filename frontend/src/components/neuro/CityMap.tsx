import { useState } from "react";
import { Activity, Building2, Users, Wind, X } from "lucide-react";
import type { CityAlert, Sector } from "@/types/city";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sectorHealthScore(s: Sector): number {
  const trafficScore = Math.max(0, 100 - s.traffic);
  const aqiScore = Math.max(0, 100 - s.aqi / 3);
  return Math.round(s.infrastructure_health * 0.45 + trafficScore * 0.30 + aqiScore * 0.25);
}

function sectorStatus(score: number): {
  label: "Healthy" | "Warning" | "Critical";
  bg: string;
  border: string;
  text: string;
  dot: string;
} {
  if (score >= 80)
    return {
      label: "Healthy",
      bg: "color-mix(in oklab, var(--color-success) 12%, transparent)",
      border: "var(--color-success)",
      text: "var(--color-success)",
      dot: "var(--color-success)",
    };
  if (score >= 60)
    return {
      label: "Warning",
      bg: "color-mix(in oklab, var(--color-traffic) 12%, transparent)",
      border: "var(--color-traffic)",
      text: "var(--color-traffic)",
      dot: "var(--color-traffic)",
    };
  return {
    label: "Critical",
    bg: "color-mix(in oklab, var(--color-risk) 12%, transparent)",
    border: "var(--color-risk)",
    text: "var(--color-risk)",
    dot: "var(--color-risk)",
  };
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function SectorDetail({
  sector,
  alerts,
  onClose,
}: {
  sector: Sector;
  alerts: CityAlert[];
  onClose: () => void;
}) {
  const health = sectorHealthScore(sector);
  const status = sectorStatus(health);
  const sectorAlerts = alerts.filter((a) => a.sector_id === sector.sector_id);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-elevated)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {sector.sector_id}
          </div>
          <h4 className="text-base font-semibold">{sector.sector_name}</h4>
        </div>
        <button
          onClick={onClose}
          className="grid h-7 w-7 place-items-center rounded-lg border border-border bg-background hover:bg-secondary"
          aria-label="Close sector detail"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Status badge */}
      <div className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
        style={{ backgroundColor: status.bg, color: status.text }}>
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: status.dot }} />
        {status.label} · {health}/100
      </div>

      {/* Metrics grid */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[
          { icon: Activity, label: "Traffic", value: String(sector.traffic), color: "var(--color-traffic)" },
          { icon: Wind, label: "AQI", value: String(sector.aqi), color: "var(--color-environment)" },
          { icon: Users, label: "Population", value: sector.population.toLocaleString(), color: "var(--color-info)" },
          { icon: Building2, label: "Infra Health", value: `${sector.infrastructure_health}%`, color: "var(--color-success)" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div
            key={label}
            className="rounded-lg border border-border bg-background/60 px-3 py-2"
          >
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Icon className="h-3 w-3" style={{ color }} />
              {label}
            </div>
            <div className="mt-0.5 text-sm font-semibold">{value}</div>
          </div>
        ))}
      </div>

      {/* Active alerts */}
      <div className="mt-3">
        <div className="text-xs font-medium text-muted-foreground">
          Active Alerts ({sectorAlerts.length})
        </div>
        {sectorAlerts.length === 0 ? (
          <p className="mt-1 text-xs text-[var(--color-success)]">No alerts — all clear.</p>
        ) : (
          <ul className="mt-1 space-y-1">
            {sectorAlerts.map((a, i) => (
              <li
                key={i}
                className="rounded-lg border border-border bg-background/60 px-2.5 py-1.5 text-xs"
              >
                <span className="font-medium text-foreground">{a.type}</span>
                <span className="ml-1 text-muted-foreground">— {a.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Map Cell ─────────────────────────────────────────────────────────────────

function MapCell({
  sector,
  selected,
  onClick,
}: {
  sector: Sector;
  selected: boolean;
  onClick: () => void;
}) {
  const health = sectorHealthScore(sector);
  const status = sectorStatus(health);

  return (
    <button
      onClick={onClick}
      aria-label={`View ${sector.sector_name} details`}
      aria-pressed={selected}
      className={[
        "relative flex flex-col items-center justify-center rounded-xl border-2 p-3 text-center",
        "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]",
        selected ? "ring-2 ring-offset-2 ring-foreground/20" : "",
      ].join(" ")}
      style={{
        backgroundColor: status.bg,
        borderColor: status.border,
      }}
    >
      {/* Pulsing dot for critical */}
      {status.label === "Critical" && (
        <span className="absolute right-2 top-2 flex h-2.5 w-2.5">
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
            style={{ backgroundColor: status.dot }}
          />
          <span
            className="relative inline-flex h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: status.dot }}
          />
        </span>
      )}

      <span
        className="text-[10px] font-bold uppercase tracking-widest"
        style={{ color: status.text }}
      >
        {sector.sector_id}
      </span>
      <span className="mt-0.5 text-xs font-semibold leading-tight text-foreground">
        {sector.sector_name}
      </span>
      <span
        className="mt-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase"
        style={{ backgroundColor: `color-mix(in oklab, ${status.dot} 20%, transparent)`, color: status.text }}
      >
        {status.label}
      </span>
    </button>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function MapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">Map Legend:</span>
      {[
        { label: "Healthy", color: "var(--color-success)" },
        { label: "Warning", color: "var(--color-traffic)" },
        { label: "Critical", color: "var(--color-risk)" },
      ].map(({ label, color }) => (
        <span key={label} className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm border-2" style={{ borderColor: color, backgroundColor: `color-mix(in oklab, ${color} 15%, transparent)` }} />
          {label}
        </span>
      ))}
    </div>
  );
}

// ─── CityMap ──────────────────────────────────────────────────────────────────

interface CityMapProps {
  sectors: Sector[];
  alerts: CityAlert[];
}

export function CityMap({ sectors, alerts }: CityMapProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedSector = sectors.find((s) => s.sector_id === selectedId) ?? null;

  const handleSelect = (id: string) =>
    setSelectedId((prev) => (prev === id ? null : id));

  return (
    <div className="space-y-4">
      <MapLegend />

      <div className="grid gap-4 md:grid-cols-[1fr_320px]">
        {/* Grid map */}
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${Math.min(sectors.length, 3)}, 1fr)`,
          }}
        >
          {sectors.map((s) => (
            <MapCell
              key={s.sector_id}
              sector={s}
              selected={selectedId === s.sector_id}
              onClick={() => handleSelect(s.sector_id)}
            />
          ))}
        </div>

        {/* Detail panel */}
        {selectedSector ? (
          <SectorDetail
            sector={selectedSector}
            alerts={alerts}
            onClose={() => setSelectedId(null)}
          />
        ) : (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-background/40 p-6 text-center text-xs text-muted-foreground">
            Click a sector cell to inspect its live metrics and active alerts.
          </div>
        )}
      </div>
    </div>
  );
}
