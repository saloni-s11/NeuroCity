import { useQuery } from "@tanstack/react-query";
import { infrastructureApi } from "@/services/infrastructureApi";
import { useCity } from "@/contexts/CityContext";

const REFETCH = 30_000;

export function useInfraOverview() {
  const { selectedCity } = useCity();
  return useQuery({ queryKey: ["infra", "overview", selectedCity],    queryFn: infrastructureApi.getOverview,    refetchInterval: REFETCH });
}
export function useInfraAssets() {
  const { selectedCity } = useCity();
  return useQuery({ queryKey: ["infra", "assets", selectedCity],      queryFn: infrastructureApi.getAssets,      refetchInterval: REFETCH });
}
export function useInfraHotspots() {
  const { selectedCity } = useCity();
  return useQuery({ queryKey: ["infra", "hotspots", selectedCity],    queryFn: infrastructureApi.getHotspots,    refetchInterval: REFETCH });
}
export function useInfraMaintenance() {
  const { selectedCity } = useCity();
  return useQuery({ queryKey: ["infra", "maintenance", selectedCity], queryFn: infrastructureApi.getMaintenance, refetchInterval: REFETCH });
}
export function useInfraUtilities() {
  const { selectedCity } = useCity();
  return useQuery({ queryKey: ["infra", "utilities", selectedCity],   queryFn: infrastructureApi.getUtilities,   refetchInterval: REFETCH });
}
export function useInfraRisks() {
  const { selectedCity } = useCity();
  return useQuery({ queryKey: ["infra", "risks", selectedCity],       queryFn: infrastructureApi.getRisks,       refetchInterval: REFETCH });
}
export function useInfraForecast() {
  const { selectedCity } = useCity();
  return useQuery({ queryKey: ["infra", "forecast", selectedCity],    queryFn: infrastructureApi.getForecast,    refetchInterval: REFETCH });
}
