import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useCity } from "@/contexts/CityContext";

const REFETCH_INTERVAL = 30_000;

export function useDashboard() {
  const { selectedCity } = useCity();
  return useQuery({
    queryKey: ["dashboard", selectedCity],
    queryFn: api.getDashboard,
    refetchInterval: REFETCH_INTERVAL,
  });
}

export function useMetrics() {
  const { selectedCity } = useCity();
  return useQuery({
    queryKey: ["metrics", selectedCity],
    queryFn: api.getMetrics,
    refetchInterval: REFETCH_INTERVAL,
  });
}

export function useAlerts() {
  const { selectedCity } = useCity();
  return useQuery({
    queryKey: ["alerts", selectedCity],
    queryFn: api.getAlerts,
    refetchInterval: REFETCH_INTERVAL,
  });
}

export function useInsights() {
  const { selectedCity } = useCity();
  return useQuery({
    queryKey: ["insights", selectedCity],
    queryFn: api.getInsights,
    refetchInterval: REFETCH_INTERVAL,
  });
}

export function useSummary() {
  const { selectedCity } = useCity();
  return useQuery({
    queryKey: ["summary", selectedCity],
    queryFn: api.getSummary,
    refetchInterval: REFETCH_INTERVAL,
  });
}
