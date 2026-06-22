import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import type { CityAlert } from "@/types/city";

const severityColor: Record<string, string> = {
  Critical: "var(--color-risk)",
  High:     "var(--color-traffic)",
  Medium:   "var(--color-ai)",
  Low:      "var(--color-success)",
};

const typeIcon: Record<string, string> = {
  Traffic:        "🚦",
  Pollution:      "💨",
  Infrastructure: "🏗️",
};

interface AlertsPanelProps {
  alerts: CityAlert[];
  loading?: boolean;
  error?: boolean;
}

export function AlertsPanel({ alerts, loading, error }: AlertsPanelProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading alerts…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 text-center text-sm text-muted-foreground">
        Failed to load alerts. Check backend connection.
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
        <CheckCircle className="h-6 w-6 text-[var(--color-success)]" />
        <span className="text-sm">No active alerts — city operating normally.</span>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {alerts.map((alert, idx) => {
        const color = severityColor[alert.severity] ?? "var(--color-info)";
        return (
          <li
            key={`${alert.sector_id}-${alert.type}-${idx}`}
            className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-soft)]"
          >
            <span
              className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-base"
              style={{ backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)` }}
            >
              {typeIcon[alert.type] ?? "⚠️"}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-foreground">{alert.sector}</span>
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{ backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)`, color }}
                >
                  {alert.severity}
                </span>
                <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {alert.type}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{alert.message}</p>
            </div>
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ color }} />
          </li>
        );
      })}
    </ul>
  );
}
