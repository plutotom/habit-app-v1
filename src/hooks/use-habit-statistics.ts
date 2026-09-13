import { useLocalHabitStatistics } from "@/local/hooks";
import type { HabitId } from "@/local/types";

export function useHabitStatistics(
  habitId: HabitId,
  todayLocal: string,
  enabled = true,
) {
  return useLocalHabitStatistics(habitId, todayLocal, enabled);
}
