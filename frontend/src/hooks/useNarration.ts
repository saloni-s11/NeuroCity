import { useQuery } from "@tanstack/react-query";
import { narrationApi } from "@/services/narrationApi";
import { useCity } from "@/contexts/CityContext";

// Narration uses Groq — longer stale time to avoid excessive API calls
const REFETCH_INTERVAL = 60_000;

export function useBriefing() {
  const { selectedCity } = useCity();
  return useQuery({
    queryKey: ["narration", "briefing", selectedCity],
    queryFn: narrationApi.getBriefing,
    refetchInterval: REFETCH_INTERVAL,
  });
}

export function useRecommendations() {
  const { selectedCity } = useCity();
  return useQuery({
    queryKey: ["narration", "recommendations", selectedCity],
    queryFn: narrationApi.getRecommendations,
    refetchInterval: REFETCH_INTERVAL,
  });
}
