import { useState } from "react";
import { MessageSquare, Send, Sparkles, X } from "lucide-react";

const suggestions = [
  "Why is traffic increasing in Sector 3?",
  "Which region is at highest risk this week?",
  "What happens if EV adoption reaches 60%?",
  "Where should we invest next year?",
];

export function AIChat() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-40 flex h-12 items-center gap-2 rounded-full px-4 text-sm font-medium text-background shadow-[var(--shadow-elevated)] transition-transform hover:scale-105"
        style={{
          background:
            "linear-gradient(135deg, var(--color-ai), color-mix(in oklab, var(--color-ai) 60%, var(--color-info)))",
        }}
      >
        {open ? <X className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        {open ? "Close" : "Ask NeuroCity"}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-40 flex w-[min(380px,calc(100vw-3rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-elevated)]">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <div
              className="grid h-7 w-7 place-items-center rounded-lg text-background"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-ai), var(--color-info))",
              }}
            >
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="text-sm font-semibold">NeuroCity Assistant</div>
              <div className="text-[11px] text-muted-foreground">Reasoning over live city data</div>
            </div>
          </div>

          <div className="max-h-[320px] space-y-3 overflow-y-auto px-4 py-4">
            <div className="rounded-xl bg-secondary px-3 py-2 text-sm">
              Good morning. I'm tracking <strong>3 emerging risks</strong> across the city. Ask me
              anything about traffic, environment, or future scenarios.
            </div>
            <div className="space-y-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  className="flex w-full items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-border p-3">
            <input
              placeholder="Ask anything…"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-foreground/30"
            />
            <button
              className="grid h-9 w-9 place-items-center rounded-lg bg-foreground text-background hover:opacity-90"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
