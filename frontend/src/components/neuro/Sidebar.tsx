import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Brain,
  Building2,
  Cpu,
  Gauge,
  Globe2,
  Leaf,
  LineChart,
  Settings as SettingsIcon,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

const items = [
  { to: "/", label: "Overview", icon: Gauge },
  { to: "/digital-twin", label: "Digital Twin", icon: Globe2 },
  { to: "/traffic", label: "Traffic Intelligence", icon: Activity },
  { to: "/environment", label: "Environment", icon: Leaf },
  { to: "/infrastructure", label: "Infrastructure", icon: Building2 },
  { to: "/sustainability", label: "Sustainability", icon: LineChart },
  { to: "/simulations", label: "Simulations", icon: SlidersHorizontal },
  { to: "/ai-insights", label: "AI Insights", icon: Brain },
  { to: "/timeline", label: "Timeline Explorer", icon: Cpu },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="hidden md:flex md:w-64 lg:w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-2 px-6 py-5">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-foreground text-background">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold tracking-tight">NeuroCity</div>
          <div className="text-[11px] text-muted-foreground">Urban AI OS</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-6">
        <div className="px-3 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Workspace
        </div>
        <ul className="space-y-0.5">
          {items.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <li key={to}>
                <Link
                  to={to}
                  className={[
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  ].join(" ")}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-foreground"
                    />
                  )}
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="m-4 rounded-xl border border-sidebar-border bg-secondary/60 p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-foreground">
          <span className="relative flex h-2 w-2">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
              style={{ backgroundColor: "var(--color-success)" }}
            />
            <span
              className="relative inline-flex h-2 w-2 rounded-full"
              style={{ backgroundColor: "var(--color-success)" }}
            />
          </span>
          AI Core online
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          Models healthy · 12ms latency
        </div>
      </div>
    </aside>
  );
}
