import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Sparkline } from "./Sparkline";

export interface KpiCardProps {
  label: string;
  value: string;
  unit?: string;
  delta: number;
  trend: number[];
  icon: LucideIcon;
  tone?: "traffic" | "environment" | "infrastructure" | "ai" | "risk" | "info" | "success";
  status?: string;
}

const toneMap: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  traffic: "var(--color-traffic)",
  environment: "var(--color-environment)",
  infrastructure: "var(--color-infrastructure)",
  ai: "var(--color-ai)",
  risk: "var(--color-risk)",
  info: "var(--color-info)",
  success: "var(--color-success)",
};

export function KpiCard({
  label,
  value,
  unit,
  delta,
  trend,
  icon: Icon,
  tone = "infrastructure",
  status,
}: KpiCardProps) {
  const color = toneMap[tone];
  const up = delta >= 0;
  return (
    <div className="group card-surface p-5 transition-all hover:shadow-[var(--shadow-elevated)] hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span
            className="grid h-8 w-8 place-items-center rounded-lg"
            style={{ backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)`, color }}
          >
            <Icon className="h-4 w-4" />
          </span>
          <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        </div>
        {status && (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{
              backgroundColor: `color-mix(in oklab, ${color} 12%, transparent)`,
              color,
            }}
          >
            {status}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-semibold tracking-tight text-foreground">{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>

      <div className="mt-1 flex items-center gap-1 text-xs">
        <span
          className="inline-flex items-center gap-0.5 font-medium"
          style={{ color: up ? "var(--color-success)" : "var(--color-risk)" }}
        >
          {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {up ? "+" : ""}
          {delta}%
        </span>
        <span className="text-muted-foreground">vs last week</span>
      </div>

      <div className="mt-2 -mx-1">
        <Sparkline data={trend} color={color} />
      </div>
    </div>
  );
}
