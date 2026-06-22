import type {
  SimulationPreset,
  SimulationRequest,
  SimulationResult,
} from "@/types/city";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// Reads city from localStorage so it works inside API service layer
// without needing React context (services are plain TS, not components).
function getCity(): string {
  return localStorage.getItem("selectedCity") || "Mumbai";
}

async function get<T>(path: string): Promise<T> {
  const city = getCity();
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${BASE_URL}${path}${sep}city=${encodeURIComponent(city)}`);
  if (!res.ok) throw new Error(`[simulationApi] GET ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  // Always inject the currently selected city into the POST body
  const city = getCity();
  const enriched = { ...(body as object), city };
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(enriched),
  });
  if (!res.ok) throw new Error(`[simulationApi] POST ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export const simulationApi = {
  /** GET /simulation/presets?city=<city> — city-specific scenario presets */
  getPresets: () => get<SimulationPreset[]>("/simulation/presets"),

  /** POST /simulation/run — body includes { scenario, params, city } */
  runSimulation: (req: SimulationRequest) => post<SimulationResult>("/simulation/run", req),
};
