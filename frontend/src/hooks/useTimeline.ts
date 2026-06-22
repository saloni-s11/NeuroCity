import { useQuery } from "@tanstack/react-query";
import { timelineApi } from "@/services/timelineApi";
import { useCity } from "@/contexts/CityContext";

// Per city, cache for 5 minutes — timeline projections change only when city changes
const STALE_TIME = 1000 * 60 * 5;

export function useProjections() {
  const { selectedCity } = useCity();
  return useQuery({
    queryKey: ["timeline", "projections", selectedCity],
    queryFn: timelineApi.getProjections,
    staleTime: STALE_TIME,
  });
}

export function useScenarios() {
  const { selectedCity } = useCity();
  return useQuery({
    queryKey: ["timeline", "scenarios", selectedCity],
    queryFn: timelineApi.getScenarios,
    staleTime: STALE_TIME,
  });
}

export function useMilestones() {
  const { selectedCity } = useCity();
  return useQuery({
    queryKey: ["timeline", "milestones", selectedCity],
    queryFn: timelineApi.getMilestones,
    staleTime: STALE_TIME,
  });
}
