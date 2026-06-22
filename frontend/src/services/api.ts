import type {
  CityAlert,
  CityInsight,
  CityMetrics,
  DashboardResponse,
  DashboardSummary,
} from "@/types/city";

// Base URL — override with VITE_API_URL env var for production deployments
const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function get<T>(path: string): Promise<T> {
  const city = localStorage.getItem("selectedCity") || "Mumbai";
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${BASE_URL}${path}${sep}city=${encodeURIComponent(city)}`);
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ─── Endpoints ───────────────────────────────────────────────────────────────

export const api = {
  getDashboard: () => get<DashboardResponse>("/dashboard"),
  getMetrics: () => get<CityMetrics>("/metrics"),
  getAlerts: () => get<CityAlert[]>("/alerts"),
  getInsights: () => get<CityInsight[]>("/insights"),
  getSummary: () => get<DashboardSummary>("/summary"),
};
