/**
 * infrastructureApi.ts
 * Centralised fetch layer for all Infrastructure Intelligence endpoints.
 * Swap fetch calls here for a live asset-management system API.
 */
import type {
  InfraAsset, InfraForecastItem, InfraHotspot,
  InfraOverview, InfraRisk, InfraUtilities, MaintenanceItem,
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

export const infrastructureApi = {
  getOverview:    () => get<InfraOverview>("/infrastructure/overview"),
  getAssets:      () => get<InfraAsset[]>("/infrastructure/assets"),
  getHotspots:    () => get<InfraHotspot[]>("/infrastructure/hotspots"),
  getMaintenance: () => get<MaintenanceItem[]>("/infrastructure/maintenance"),
  getUtilities:   () => get<InfraUtilities>("/infrastructure/utilities"),
  getRisks:       () => get<InfraRisk[]>("/infrastructure/risks"),
  getForecast:    () => get<InfraForecastItem[]>("/infrastructure/forecast"),
};
