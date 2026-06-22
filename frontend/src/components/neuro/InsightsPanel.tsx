import { Brain, Loader2 } from "lucide-react";
import type { CityInsight } from "@/types/city";

const tagColor: Record<string, string> = {
  Traffic:        "var(--color-traffic)",
  Environment:    "var(--color-environment)",
  Infrastructure: "var(--color-infrastructure)",
  Energy:         "var(--color-ai)",
  "City Health":  "var(--color-success)",
  Scenario:       "var(--color-info)",
};

interface InsightsPanelProps {
  insights: CityInsight[];
  loading?: boolean;
  error?: boolean;
}

export function InsightsPanel({ insights, loading, error }: InsightsPanelProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground gap-2 text-sm col-span-3">
        <Loader2 className="h-4 w-4 animate-spin" /> Generating insights…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 text-center text-sm text-muted-foreground col-span-3">
        Failed to load insights. Check backend connection.
      </div>
    );
  }

  return (
    <>
      {insights.map((insight) => {
        const color = tagColor[insight.tag] ?? "var(--color-ai)";
        return (
          <article
            key={insight.title}
            className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]"
          >
            <div
              className="absolute inset-x-0 top-0 h-0.5"
              style={{ background: color }}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="grid h-7 w-7 place-items-center rounded-lg"
                  style={{
                    backgroundColor: `color-mix(in oklab, ${color} 15%, transparent)`,
                    color,
                  }}
                >
                  <Brain className="h-3.5 w-3.5" />
                </span>
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {insight.tag}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {insight.confidence}% conf.
              </span>
            </div>
            <h3 className="mt-3 text-base font-semibold leading-snug">{insight.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{insight.description}</p>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
              <span className="text-muted-foreground">AI generated · live data</span>
              <button className="font-medium text-foreground hover:underline">
                Investigate →
              </button>
            </div>
          </article>
        );
      })}
    </>
  );
}
