/**
 * trafficApi.ts
 * Centralised fetch layer for all Traffic Intelligence endpoints.
 * Keep all API calls here — never call fetch() directly from components.
 *
 * Future TomTom/HERE integration: swap out the fetch calls here and
 * the rest of the frontend picks up real data automatically.
 */

import type {
  TrafficForecast,
  TrafficHotspot,
  TrafficKPIs,
  TrafficOverview,
  RouteRecommendation,
} from "@/types/city";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function get<T>(path: string): Promise<T> {
  const city = localStorage.getItem("selectedCity") || "Mumbai";
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${BASE_URL}${path}${sep}city=${encodeURIComponent(city)}`);
  if (!res.ok) throw new Error(`[trafficApi] ${path} → ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const trafficApi = {
  getOverview:   () => get<TrafficOverview>("/traffic"),
  getKPIs:       () => get<TrafficKPIs>("/traffic/kpis"),
  getHotspots:   () => get<TrafficHotspot[]>("/traffic/hotspots"),
  getRoutes:     () => get<RouteRecommendation[]>("/traffic/routes"),
  getForecast:   (hours = 12) => get<TrafficForecast>(`/traffic/forecast?hours=${hours}`),
};
