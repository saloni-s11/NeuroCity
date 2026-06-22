import { Bell, Search, Sparkles } from "lucide-react";
import { useSummary, useAlerts } from "@/hooks/useDashboard";
import { useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCity, CITIES } from "@/contexts/CityContext";

export function Topbar() {
  const { data: summary } = useSummary();
  const { data: alerts } = useAlerts();
  const { selectedCity, setSelectedCity } = useCity();
  const queryClient = useQueryClient();

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    queryClient.invalidateQueries();
  };

  const cityHealth = summary ? Math.round(summary.city_health) : null;
  const activeAlerts = alerts?.length ?? 0;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl md:px-8">
      <Select value={selectedCity} onValueChange={handleCityChange}>
        <SelectTrigger className="w-[160px] h-9 border-border bg-card">
          <SelectValue placeholder="Select a city" />
        </SelectTrigger>
        <SelectContent>
          {CITIES.map((city) => (
            <SelectItem key={city} value={city}>
              {city}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative ml-2 hidden flex-1 max-w-xl md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          placeholder="Ask NeuroCity AI…"
          className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-20 text-sm placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Live city health — dynamic from API */}
        <div className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 sm:flex">
          <span
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor:
                cityHealth === null
                  ? "var(--color-muted-foreground)"
                  : cityHealth >= 80
                  ? "var(--color-success)"
                  : cityHealth >= 60
                  ? "var(--color-traffic)"
                  : "var(--color-risk)",
            }}
          />
          <span className="text-xs text-muted-foreground">City Health</span>
          <span className="text-xs font-semibold text-foreground">
            {cityHealth !== null ? cityHealth : "…"}
          </span>
        </div>

        <div
          className="hidden items-center gap-1.5 rounded-lg px-3 py-1.5 sm:flex"
          style={{
            color: "var(--color-ai)",
            backgroundColor: "color-mix(in oklab, var(--color-ai) 10%, transparent)",
          }}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">AI live</span>
        </div>

        {/* Alert bell — badge count from live API */}
        <button className="relative grid h-9 w-9 place-items-center rounded-lg border border-border bg-card hover:bg-secondary">
          <Bell className="h-4 w-4" />
          {activeAlerts > 0 && (
            <span
              className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-background"
              style={{ backgroundColor: "var(--color-risk)" }}
            >
              {activeAlerts > 9 ? "9+" : activeAlerts}
            </span>
          )}
        </button>

        <button className="flex items-center gap-2 rounded-lg border border-border bg-card pl-1 pr-3 py-1 hover:bg-secondary">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-foreground text-background text-[11px] font-semibold">
            CA
          </span>
          <span className="hidden text-sm font-medium sm:inline">Admin</span>
        </button>
      </div>
    </header>
  );
}
