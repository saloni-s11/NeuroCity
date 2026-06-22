import { useQuery } from "@tanstack/react-query";
import { digitalTwinApi } from "@/services/digitalTwinApi";
import { useCity } from "@/contexts/CityContext";

const REFETCH_INTERVAL = 20_000;

export function useDigitalTwinSectors() {
  const { selectedCity } = useCity();
  return useQuery({
    queryKey: ["digital-twin", "sectors", selectedCity],
    queryFn: digitalTwinApi.getSectors,
    refetchInterval: REFETCH_INTERVAL,
  });
}

export function useDigitalTwinMetrics() {
  const { selectedCity } = useCity();
  return useQuery({
    queryKey: ["digital-twin", "metrics", selectedCity],
    queryFn: digitalTwinApi.getMetrics,
    refetchInterval: REFETCH_INTERVAL,
  });
}

export function useDigitalTwinPredictions() {
  const { selectedCity } = useCity();
  return useQuery({
    queryKey: ["digital-twin", "predictions", selectedCity],
    queryFn: digitalTwinApi.getPredictions,
    refetchInterval: REFETCH_INTERVAL,
  });
}

export function useDigitalTwinAlerts() {
  const { selectedCity } = useCity();
  return useQuery({
    queryKey: ["digital-twin", "alerts", selectedCity],
    queryFn: digitalTwinApi.getAlerts,
    refetchInterval: REFETCH_INTERVAL,
  });
}
