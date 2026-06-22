import { useQuery } from "@tanstack/react-query";
import { trafficApi } from "@/services/trafficApi";
import { useCity } from "@/contexts/CityContext";

const REFETCH_INTERVAL = 30_000;

export function useTrafficOverview() {
  const { selectedCity } = useCity();
  return useQuery({
    queryKey: ["traffic", "overview", selectedCity],
    queryFn: trafficApi.getOverview,
    refetchInterval: REFETCH_INTERVAL,
  });
}

export function useTrafficKPIs() {
  const { selectedCity } = useCity();
  return useQuery({
    queryKey: ["traffic", "kpis", selectedCity],
    queryFn: trafficApi.getKPIs,
    refetchInterval: REFETCH_INTERVAL,
  });
}

export function useTrafficHotspots() {
  const { selectedCity } = useCity();
  return useQuery({
    queryKey: ["traffic", "hotspots", selectedCity],
    queryFn: trafficApi.getHotspots,
    refetchInterval: REFETCH_INTERVAL,
  });
}

export function useTrafficRoutes() {
  const { selectedCity } = useCity();
  return useQuery({
    queryKey: ["traffic", "routes", selectedCity],
    queryFn: trafficApi.getRoutes,
    refetchInterval: REFETCH_INTERVAL,
  });
}

export function useTrafficForecast(hours = 12) {
  const { selectedCity } = useCity();
  return useQuery({
    queryKey: ["traffic", "forecast", hours, selectedCity],
    queryFn: () => trafficApi.getForecast(hours),
    refetchInterval: REFETCH_INTERVAL,
  });
}
