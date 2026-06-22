/**
 * environmentApi.ts
 * Centralised fetch layer for all Environment Intelligence endpoints.
 *
 * Future real-data integration: swap the fetch calls here with
 * OpenAQ / CPCB / IQAir API calls and the rest of the UI updates automatically.
 */

import type {
  EnvForecastItem,
  EnvHotspot,
  EnvOverview,
  EnvRisk,
  EnvTrendPoint,
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

export const environmentApi = {
  /** GET /environment/overview — city-wide AQI, temperature, humidity, CO₂ */
  getOverview:  () => get<EnvOverview>("/environment/overview"),

  /** GET /environment/hotspots — sectors with AQI > 120, sorted desc */
  getHotspots:  () => get<EnvHotspot[]>("/environment/hotspots"),

  /** GET /environment/trends — 14-day daily AQI/temp/humidity/CO₂ history */
  getTrends:    () => get<EnvTrendPoint[]>("/environment/trends"),

  /** GET /environment/risks — generated risk alerts with severity and threshold info */
  getRisks:     () => get<EnvRisk[]>("/environment/risks"),

  /** GET /environment/forecast — AI risk and opportunity forecasts */
  getForecast:  () => get<EnvForecastItem[]>("/environment/forecast"),
};
