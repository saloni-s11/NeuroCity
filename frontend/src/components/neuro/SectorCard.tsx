import { Activity, Building2, Users, Wind, Zap } from "lucide-react";
import type { Sector } from "@/types/city";

interface SectorCardProps {
  sector: Sector;
  onClick?: (sector: Sector) => void;
  isSelected?: boolean;
}

function StatusBadge({ value, label }: { value: number; label: string }) {
  const color =
    value >= 80 ? "var(--color-success)" :
    value >= 60 ? "var(--color-traffic)" :
    "var(--color-risk)";
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ backgroundColor: `color-mix(in oklab, ${color} 15%, transparent)`, color }}
    >
      {label}
    </span>
  );
}

function MetricRow({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3 w-3" style={{ color }} />
        {label}
      </div>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

/** Returns a 0–100 sector health score based on its metrics */
function sectorHealthScore(s: Sector): number {
  const trafficScore = Math.max(0, 100 - s.traffic);
  const aqiScore = Math.max(0, 100 - s.aqi / 3);
  return Math.round(s.infrastructure_health * 0.45 + trafficScore * 0.30 + aqiScore * 0.25);
}

function sectorStatus(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Healthy", color: "var(--color-success)" };
  if (score >= 60) return { label: "Warning", color: "var(--color-traffic)" };
  return { label: "Critical", color: "var(--color-risk)" };
}

export function SectorCard({ sector, onClick, isSelected }: SectorCardProps) {
  const health = sectorHealthScore(sector);
  const status = sectorStatus(health);

  return (
    <article
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={() => onClick?.(sector)}
      onKeyDown={(e) => e.key === "Enter" && onClick?.(sector)}
      className={[
        "relative overflow-hidden rounded-xl border bg-card p-4 shadow-[var(--shadow-soft)]",
        "transition-all duration-200",
        onClick ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]" : "",
        isSelected ? "ring-2 ring-foreground/30" : "",
      ].join(" ")}
      style={{ borderColor: isSelected ? status.color : undefined }}
    >
      {/* Status accent bar */}
      <div
        className="absolute inset-x-0 top-0 h-0.5"
        style={{ background: status.color }}
      />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {sector.sector_id}
          </div>
          <h3 className="mt-0.5 text-sm font-semibold leading-tight">{sector.sector_name}</h3>
        </div>
        <StatusBadge value={health} label={status.label} />
      </div>

      {/* Metrics */}
      <div className="mt-3 space-y-2">
        <MetricRow
          icon={Activity}
          label="Traffic"
          value={String(sector.traffic)}
          color="var(--color-traffic)"
        />
        <MetricRow
          icon={Wind}
          label="AQI"
          value={String(sector.aqi)}
          color="var(--color-environment)"
        />
        <MetricRow
          icon={Users}
          label="Population"
          value={sector.population.toLocaleString()}
          color="var(--color-info)"
        />
        <MetricRow
          icon={Zap}
          label="Energy Usage"
          value={`${sector.energy_usage} kWh`}
          color="var(--color-ai)"
        />
        <MetricRow
          icon={Building2}
          label="Infra Health"
          value={`${sector.infrastructure_health}%`}
          color="var(--color-success)"
        />
      </div>

      {/* Health score bar */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">Sector Health</span>
          <span className="font-semibold" style={{ color: status.color }}>
            {health}/100
          </span>
        </div>
        <div className="h-1 w-full rounded-full bg-secondary">
          <div
            className="h-1 rounded-full transition-all duration-500"
            style={{ width: `${health}%`, backgroundColor: status.color }}
          />
        </div>
      </div>
    </article>
  );
}
