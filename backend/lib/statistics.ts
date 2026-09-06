import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { isLocalDay } from "../../shared/validation";

export async function setCompletedDay(
  ctx: MutationCtx,
  habitId: Id<"habits">,
  localDay: string,
  completed: boolean,
) {
  // Ignore invalid legacy dates during backfill; never rewrite source history.
  if (!isLocalDay(localDay)) return;
  const year = localDay.slice(0, 4);
  const bucket = await ctx.db
    .query("habitYears")
    .withIndex("by_habitId_and_year", (q) =>
      q.eq("habitId", habitId).eq("year", year),
    )
    .unique();
  const days = new Set(bucket?.completedDays ?? []);
  if (completed) days.add(localDay);
  else days.delete(localDay);
  const completedDays = [...days].sort();
  if (bucket) await ctx.db.patch(bucket._id, { completedDays });
  else if (completed)
    await ctx.db.insert("habitYears", { habitId, year, completedDays });
}
