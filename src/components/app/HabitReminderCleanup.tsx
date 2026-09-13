import { useConvexAuth, useQuery } from "convex/react";
import { useEffect, useRef } from "react";

import { api } from "@backend/api";
import {
  cancelAllHabitReminders,
  reconcileHabitReminders,
} from "@/lib/habit-reminders";

const SIGNED_OUT = "signed-out";

/**
 * Habit reminders are scheduled with the OS and tracked on the device, so they
 * outlive the habits they belong to: signing out, wiped account data, or a
 * restored backup all leave reminders firing for habits the account no longer
 * has. This cancels those on launch and whenever the habit list changes.
 */
export function HabitReminderCleanup() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const habits = useQuery(api.habits.list, isAuthenticated ? {} : "skip");
  const lastCleanup = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading) return;

    function run(signature: string, cleanup: () => Promise<unknown>) {
      if (lastCleanup.current === signature) return;
      lastCleanup.current = signature;
      void cleanup().catch((error: unknown) => {
        lastCleanup.current = null;
        console.error("Failed to clean up habit reminders:", error);
      });
    }

    if (!isAuthenticated) {
      run(SIGNED_OUT, cancelAllHabitReminders);
      return;
    }
    if (habits === undefined) return;
    const habitIds = habits.map((habit) => habit._id).sort();
    run(`habits:${habitIds.join(",")}`, () =>
      reconcileHabitReminders(habitIds),
    );
  }, [isAuthenticated, isLoading, habits]);

  return null;
}
