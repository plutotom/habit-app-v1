import { useCallback, useEffect, useMemo, useState } from "react";

import { useLocalData } from "@/local/provider";
import type {
  Checkin,
  Habit,
  HabitFields,
  HabitId,
  HabitStatistics,
  Preferences,
} from "@/local/types";

function useRepositoryQuery<T>(
  load: () => Promise<T>,
  dependencies: readonly unknown[],
): T | undefined {
  const { reportReadError } = useLocalData();
  const [value, setValue] = useState<T>();

  useEffect(() => {
    let active = true;
    void load()
      .then((result) => {
        if (active) setValue(result);
      })
      .catch((error: unknown) => {
        if (active) reportReadError(error);
      });
    return () => {
      active = false;
    };
    // The callers provide the complete primitive dependency list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return value;
}

export function useLocalPreferences(): Preferences | undefined {
  const { repository, revision } = useLocalData();
  return useRepositoryQuery(
    () => repository.getPreferences(),
    [repository, revision],
  );
}

export function useLocalHabits(): Habit[] | undefined {
  const { repository, revision } = useLocalData();
  return useRepositoryQuery(
    () => repository.listHabits(),
    [repository, revision],
  );
}

export function useLocalHabit(habitId: HabitId): Habit | null | undefined {
  const { repository, revision } = useLocalData();
  return useRepositoryQuery(
    () => repository.getHabit(habitId),
    [repository, revision, habitId],
  );
}

export function useLocalCheckinsForDays(days: string[]): Checkin[] | undefined {
  const { repository, revision } = useLocalData();
  const dayKey = days.join("|");
  return useRepositoryQuery(
    () => repository.getCheckinsForDays(days),
    [repository, revision, dayKey],
  );
}

export function useLocalHabitCheckins(
  habitId: HabitId,
  limit: number,
): Checkin[] | undefined {
  const { repository, revision } = useLocalData();
  return useRepositoryQuery(
    () => repository.getCheckinsForHabit(habitId, limit),
    [repository, revision, habitId, limit],
  );
}

export function useLocalHabitStatistics(
  habitId: HabitId,
  todayLocal: string,
  enabled = true,
): HabitStatistics | null | undefined {
  const { repository, revision } = useLocalData();
  return useRepositoryQuery(
    () =>
      enabled
        ? repository.getHabitStatistics(habitId, todayLocal)
        : Promise.resolve(null),
    [repository, revision, habitId, todayLocal, enabled],
  );
}

export function useLocalMutations() {
  const { repository, didWrite } = useLocalData();

  const afterWrite = useCallback(
    async <T>(write: () => Promise<T>): Promise<T> => {
      const result = await write();
      didWrite();
      return result;
    },
    [didWrite],
  );

  return useMemo(
    () => ({
      createHabit: (fields: HabitFields) =>
        afterWrite(() => repository.createHabit(fields)),
      updateHabit: (habitId: HabitId, fields: HabitFields) =>
        afterWrite(() => repository.updateHabit(habitId, fields)),
      reorderHabits: (habitIds: HabitId[]) =>
        afterWrite(() => repository.reorderHabits(habitIds)),
      archiveHabit: (habitId: HabitId) =>
        afterWrite(() => repository.archiveHabit(habitId)),
      completeHabit: (habitId: HabitId, localDay: string) =>
        afterWrite(() => repository.completeHabit(habitId, localDay)),
      undoCheckin: (habitId: HabitId, localDay: string) =>
        afterWrite(() => repository.undoCheckin(habitId, localDay)),
      updatePreferences: (fields: {
        timezone: string;
        weekStart: "mon" | "sun";
      }) => afterWrite(() => repository.updatePreferences(fields)),
    }),
    [afterWrite, repository],
  );
}
