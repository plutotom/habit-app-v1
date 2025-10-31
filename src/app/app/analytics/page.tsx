import Link from "next/link";

import { getHabitAnalyticsRange, listHabits } from "@/lib/habits-service";
import { requireCurrentAppUser } from "@/lib/users";
import { format, subDays } from "date-fns";

export default async function AnalyticsPage() {
  const user = await requireCurrentAppUser();
  const habits = await listHabits(user.id);
  const today = new Date();
  const start = format(subDays(today, 29), "yyyy-MM-dd");
  const end = format(today, "yyyy-MM-dd");

  const rows = await Promise.all(
    habits.map(async (habit) => {
      const data = await getHabitAnalyticsRange({
        habitId: habit.id,
        userId: user.id,
        start,
        end,
      });

      const completions = data.reduce((total, row) => total + (row.completions ?? 0), 0);
      const targets = data.reduce((total, row) => total + (row.target ?? 0), 0);
      const avgStrength =
        data.length > 0
          ? data.reduce((total, row) => total + Number(row.strengthScore ?? 0), 0) / data.length
          : 0;

      return {
        habit,
        completions,
        targets,
        avgStrength,
        data,
      };
    }),
  );

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-border bg-card/70 p-6">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted">Overview of the last 30 days of habit performance.</p>
      </header>

      <section className="space-y-4">
        {rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card/70 p-6 text-center text-muted">
            No habits to analyse yet.
          </p>
        ) : (
          rows.map(({ habit, completions, targets, avgStrength, data }) => (
            <div key={habit.id} className="rounded-2xl border border-border bg-card/70 p-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <Link href={`/app/habits/${habit.id}`} className="text-lg font-semibold text-accent">
                    {habit.title}
                  </Link>
                  <p className="text-xs text-muted">
                    {habit.scheduleType} · {habit.trackType}
                  </p>
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="rounded-full bg-surface px-3 py-1 text-muted">
                    Completion rate: {targets > 0 ? Math.round((completions / targets) * 100) : 0}%
                  </span>
                  <span className="rounded-full bg-surface px-3 py-1 text-muted">
                    Avg strength: {avgStrength.toFixed(1)}
                  </span>
                </div>
              </div>
              <div className="mt-4 grid gap-2 text-xs text-muted md:grid-cols-2">
                {data.map((row) => (
                  <div
                    key={row.date}
                    className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3"
                  >
                    <span>{row.date}</span>
                    <span>
                      {row.completions}/{row.target ?? 0} · {Math.round((Number(row.completionRate ?? 0)) * 100)}% · {Number(row.strengthScore ?? 0).toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

