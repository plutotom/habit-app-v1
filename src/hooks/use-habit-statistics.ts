import { useMutation, useQuery } from "convex/react";
import { useEffect } from "react";

import { api } from "@backend/api";
import type { Id } from "@backend/dataModel";

export function useHabitStatistics(
  habitId: Id<"habits">,
  todayLocal: string,
  enabled = true,
) {
  const statistics = useQuery(
    api.checkins.streak,
    enabled ? { habitId, todayLocal } : "skip",
  );
  const ensureStatistics = useMutation(api.checkins.ensureStatistics);
  useEffect(() => {
    if (statistics !== null) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function advance() {
      try {
        if (await ensureStatistics({ habitId })) return;
      } catch (error) {
        console.warn("Statistics will retry when connected", error);
      }
      if (!cancelled) timer = setTimeout(() => void advance(), 1000);
    }
    void advance();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [statistics, habitId, ensureStatistics]);
  return statistics;
}
