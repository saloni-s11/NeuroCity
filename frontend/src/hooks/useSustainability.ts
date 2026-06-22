import { useQuery } from "@tanstack/react-query";
import { sustainabilityApi } from "@/services/sustainabilityApi";
import { useCity } from "@/contexts/CityContext";

const REFETCH_INTERVAL = 30_000;

export function useHealthScore() {
  const { selectedCity } = useCity();
  return useQuery({
    queryKey: ["sustainability", "health-score", selectedCity],
    queryFn: sustainabilityApi.getHealthScore,
    refetchInterval: REFETCH_INTERVAL,
  });
}

export function useEnvironmentalMetrics() {
  const { selectedCity } = useCity();
  return useQuery({
    queryKey: ["sustainability", "environmental-metrics", selectedCity],
    queryFn: sustainabilityApi.getEnvironmentalMetrics,
    refetchInterval: REFETCH_INTERVAL,
  });
}

export function useSustainabilityPerformance() {
  const { selectedCity } = useCity();
  return useQuery({
    queryKey: ["sustainability", "performance", selectedCity],
    queryFn: sustainabilityApi.getPerformance,
    refetchInterval: REFETCH_INTERVAL,
  });
}
