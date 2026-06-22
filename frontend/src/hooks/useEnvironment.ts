import { useQuery } from "@tanstack/react-query";
import { environmentApi } from "@/services/environmentApi";
import { useCity } from "@/contexts/CityContext";

const REFETCH_INTERVAL = 30_000;

export function useEnvOverview() {
  const { selectedCity } = useCity();
  return useQuery({
    queryKey: ["environment", "overview", selectedCity],
    queryFn: environmentApi.getOverview,
    refetchInterval: REFETCH_INTERVAL,
  });
}

export function useEnvHotspots() {
  const { selectedCity } = useCity();
  return useQuery({
    queryKey: ["environment", "hotspots", selectedCity],
    queryFn: environmentApi.getHotspots,
    refetchInterval: REFETCH_INTERVAL,
  });
}

export function useEnvTrends() {
  const { selectedCity } = useCity();
  return useQuery({
    queryKey: ["environment", "trends", selectedCity],
    queryFn: environmentApi.getTrends,
    refetchInterval: REFETCH_INTERVAL,
  });
}

export function useEnvRisks() {
  const { selectedCity } = useCity();
  return useQuery({
    queryKey: ["environment", "risks", selectedCity],
    queryFn: environmentApi.getRisks,
    refetchInterval: REFETCH_INTERVAL,
  });
}

export function useEnvForecast() {
  const { selectedCity } = useCity();
  return useQuery({
    queryKey: ["environment", "forecast", selectedCity],
    queryFn: environmentApi.getForecast,
    refetchInterval: REFETCH_INTERVAL,
  });
}
