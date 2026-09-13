import { useEffect, useRef } from "react";

import { reconcileHabitReminders } from "@/lib/habit-reminders";
import { useLocalHabits } from "@/local/hooks";

/**
 * Habit reminders are scheduled with the OS and tracked on the device, so they
 * outlive the habits they belong to whenever habits are deleted without the app
 * cancelling their reminders first. This cancels orphaned reminders on launch
 * and whenever the local habit list changes.
 */
export function HabitReminderCleanup() {
  const habits = useLocalHabits();
  const lastCleanup = useRef<string | null>(null);

  useEffect(() => {
    if (habits === undefined) return;

    const habitIds = habits.map((habit) => habit.id).sort();
    const signature = habitIds.join(",");
    if (lastCleanup.current === signature) return;
    lastCleanup.current = signature;

    void reconcileHabitReminders(habitIds).catch((error: unknown) => {
      lastCleanup.current = null;
      console.error("Failed to clean up habit reminders:", error);
    });
  }, [habits]);

  return null;
}
