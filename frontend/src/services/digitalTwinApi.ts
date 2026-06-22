import type {
  CityAlert,
  CityPrediction,
  DashboardResponse,
  DigitalTwinMetrics,
} from "@/types/city";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function get<T>(path: string): Promise<T> {
  const city = localStorage.getItem("selectedCity") || "Mumbai";
  const sep = path.includes("?") ? "&" : "?";
  const finalPath = `${path}${sep}city=${encodeURIComponent(city)}`;
  const res = await fetch(`${BASE_URL}${finalPath}`);
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const digitalTwinApi = {
  /** GET /digital-twin — full sector list for the Digital Twin page */
  getSectors: () => get<DashboardResponse>("/digital-twin"),

  /** GET /digital-twin/metrics — header KPIs (health, alert count, sector breakdown) */
  getMetrics: () => get<DigitalTwinMetrics>("/digital-twin/metrics"),

  /** GET /digital-twin/predictions — AI operational forecasts with time horizons */
  getPredictions: () => get<CityPrediction[]>("/digital-twin/predictions"),

  /** GET /alerts — active alerts (shared with dashboard) */
  getAlerts: () => get<CityAlert[]>("/alerts"),
};
