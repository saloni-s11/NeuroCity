import type {
  EnvironmentalMetrics,
  SustainabilityHealthScore,
  SustainabilityPerformance,
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

export const sustainabilityApi = {
  getHealthScore: () => get<SustainabilityHealthScore>("/sustainability/health-score"),
  getEnvironmentalMetrics: () => get<EnvironmentalMetrics>("/sustainability/environmental-metrics"),
  getPerformance: () => get<SustainabilityPerformance>("/sustainability/performance"),
};
