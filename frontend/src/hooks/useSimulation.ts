import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { simulationApi } from "@/services/simulationApi";
import { useCity } from "@/contexts/CityContext";
import type { SimulationRequest } from "@/types/city";

export function useSimulationPresets() {
  const { selectedCity } = useCity();
  return useQuery({
    queryKey: ["simulation", "presets", selectedCity],
    queryFn: simulationApi.getPresets,
    // Presets are stable per city — no auto-refetch needed
    staleTime: 1000 * 60 * 10,
  });
}

export function useRunSimulation() {
  const { selectedCity } = useCity();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: SimulationRequest) => simulationApi.runSimulation(req),
    // After a simulation run, invalidate anything city-related that might shift
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["simulation", selectedCity] });
    },
  });
}
