import Link from "next/link";
import LoadingLinkCard from "@/components/ui/LoadingLinkCard";

import { db } from "@/db/client";
import { checkins } from "@/db/schema";
import { toLocalDay } from "@/lib/dates";
import { grantFreezeTokensIfEligible } from "@/lib/freeze";
import { computeCompletions, listHabits } from "@/lib/habits-service";
import { requireCurrentAppUser } from "@/lib/users";
import { and, eq, or } from "drizzle-orm";

export default async function TodayPage() {
  const user = await requireCurrentAppUser();
  const counters = await grantFreezeTokensIfEligible(user.id);
  const habits = await listHabits(user.id);
  const now = new Date();

  // Batch fetch: compute each habit's local day, then query all pairs in one go
  const habitLocalPairs = habits.map((habit) => ({
    habit,
    localDay: toLocalDay(now, user.timezone, habit.dayBoundaryOffsetMinutes ?? 0),
  }));

  let todayRows: typeof checkins.$inferSelect[] = [];
  if (habitLocalPairs.length > 0) {
    const pairConditions = habitLocalPairs.map(({ habit, localDay }) =>
      and(eq(checkins.habitId, habit.id), eq(checkins.localDay, localDay)),
    );
    todayRows = await db
      .select()
      .from(checkins)
      .where(and(eq(checkins.userId, user.id), eq(checkins.isSkip, false), or(...pairConditions)));
  }

  const rowsByHabitId = new Map<string, typeof checkins.$inferSelect[]>();
  for (const row of todayRows) {
    const list = rowsByHabitId.get(row.habitId) ?? [];
    list.push(row);
    rowsByHabitId.set(row.habitId, list);
  }

  const cards = habitLocalPairs.map(({ habit, localDay }) => {
    const rows = (rowsByHabitId.get(habit.id) ?? []).filter((r) => r.localDay === localDay);
    const completions = computeCompletions(habit.trackType, rows, habit.countTarget);
    const target = habit.trackType === "binary" ? 1 : habit.countTarget ?? 1;
    const progress = target > 0 ? Math.min(1, completions / target) : 0;
    const streak = habit.streaksCache?.currentStreak ?? 0;

    return { habit, localDay, progress, completions, target, streak };
  });

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card/70 p-6">
        <div>
          <h1 className="text-3xl font-semibold">Today</h1>
          <p className="text-sm text-muted">
            {new Intl.DateTimeFormat("en", {
              dateStyle: "full",
              timeZone: user.timezone,
            }).format(now)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="rounded-full bg-surface px-4 py-1 text-muted">
            Freeze tokens available: {counters.freezeTokensAvailable}
          </span>
          {counters.lastFreezeGrantAt ? (
            <span className="rounded-full bg-surface px-4 py-1 text-muted">
              Last grant: {new Date(counters.lastFreezeGrantAt).toLocaleDateString()}
            </span>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {cards.map(({ habit, localDay, progress, completions, target, streak }) => (
          <LoadingLinkCard
            key={habit.id}
            href={`/app/habits/${habit.id}`}
            className="group flex flex-col gap-4 rounded-2xl border border-border bg-card/70 p-6 transition hover:border-accent hover:shadow-lg hover:shadow-black/30"
            overlayLabel="Opening habit"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">{habit.title}</h2>
                <p className="text-xs uppercase tracking-wide text-muted">
                  {habit.scheduleType.toUpperCase()} · Today: {localDay}
                </p>
              </div>
              <span className="rounded-full bg-accent/20 px-3 py-1 text-sm text-accent">
                Streak {streak}
              </span>
            </div>
            {habit.description ? (
              <p className="text-sm text-muted">{habit.description}</p>
            ) : null}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">
                Progress {Math.round(progress * 100)}% ({completions}/{target})
              </span>
              <span className="text-accent-secondary">
                {habit.trackType === "binary" ? (completions >= 1 ? "Done" : "Mark complete") : "Log"}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${Math.min(progress, 1) * 100}%` }}
              />
            </div>
          </LoadingLinkCard>
        ))}
      </section>

      {cards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center text-muted">
          No habits yet. <Link href="/app/habits/new" className="text-accent underline">Create your first habit</Link>.
        </div>
      ) : null}
    </div>
  );
}

