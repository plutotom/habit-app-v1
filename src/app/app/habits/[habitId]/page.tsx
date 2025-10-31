import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import Link from "next/link";

import { db } from "@/db/client";
import { eventsLog } from "@/db/schema";
import {
  createCheckin,
  createSkip,
  getHabitAnalyticsRange,
  getHabitOrThrow,
  listCheckins,
  deleteHabit,
} from "@/lib/habits-service";
import { assertRateLimit } from "@/lib/rate-limit";
import { requireCurrentAppUser } from "@/lib/users";
import { format, subDays } from "date-fns";
import SubmitButton from "@/components/ui/SubmitButton";
import ConfirmSubmit from "@/components/forms/ConfirmSubmit";

type Params = { params: Promise<{ habitId: string }> };

export default async function HabitDetailPage({ params }: Params) {
  const { habitId } = await params;
  const user = await requireCurrentAppUser();
  const habit = await getHabitOrThrowSafe(habitId, user.id);

  const today = new Date();
  const start = format(subDays(today, 13), "yyyy-MM-dd");
  const end = format(today, "yyyy-MM-dd");

  const history = await listCheckins(habit.id, user.id, { start, end });
  const analytics = await getHabitAnalyticsRange({
    habitId: habit.id,
    userId: user.id,
    start,
    end,
  });

  const logCheckin = async (formData: FormData) => {
    "use server";

    const quantityRaw = formData.get("quantity");
    const quantity = quantityRaw ? Number(quantityRaw) : undefined;
    if (quantity !== undefined && Number.isNaN(quantity)) {
      throw new Error("Invalid quantity");
    }
    const note = String(formData.get("note") ?? "");
    const userInner = await requireCurrentAppUser();
    const { habitId: habitIdInner } = await params;
    const habitInner = await getHabitOrThrowSafe(habitIdInner, userInner.id);

    await assertRateLimit({
      userId: userInner.id,
      bucket: "checkin:create",
      limit: 60,
      windowMs: 60_000,
    });

    const checkin = await createCheckin({
      user: userInner,
      habit: habitInner,
      occurredAt: new Date(),
      quantity,
      note: note.length ? note : undefined,
    });

    await db.insert(eventsLog).values({
      userId: userInner.id,
      eventType: "checkin_created",
      payload: { habitId: habitInner.id, checkinId: checkin.id },
    });

    revalidatePath(`/app/habits/${habitIdInner}`);
  };

  const createSkipAction = async (formData: FormData) => {
    "use server";

    const localDayRaw = formData.get("localDay");
    if (!localDayRaw) {
      throw new Error("localDay is required");
    }
    const localDay = String(localDayRaw);
    const note = String(formData.get("note") ?? "");
    const userInner = await requireCurrentAppUser();
    const { habitId: habitIdInner } = await params;
    const habitInner = await getHabitOrThrowSafe(habitIdInner, userInner.id);

    await assertRateLimit({
      userId: userInner.id,
      bucket: "skip:create",
      limit: 30,
      windowMs: 60_000,
    });

    const skip = await createSkip({
      user: userInner,
      habit: habitInner,
      localDay,
      note: note.length ? note : undefined,
    });

    await db.insert(eventsLog).values({
      userId: userInner.id,
      eventType: "skip_created",
      payload: { habitId: habitInner.id, checkinId: skip.id },
    });

    revalidatePath(`/app/habits/${habitIdInner}`);
  };

  const deleteHabitAction = async () => {
    "use server";

    const userInner = await requireCurrentAppUser();
    const { habitId: habitIdInner } = await params;

    await db.insert(eventsLog).values({
      userId: userInner.id,
      eventType: "habit_deleted",
      payload: { habitId: habitIdInner },
    });

    await deleteHabit(habitIdInner, userInner.id);
    revalidatePath("/app/today");
    redirect("/app/today");
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-card/70 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">{habit.title}</h1>
            {habit.description ? (
              <p className="text-sm text-muted">{habit.description}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/app/habits/${habit.id}/edit`
              }
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:border-accent hover:text-accent"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"/>
                <path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>
              </svg>
              Edit
            </Link>
            <ConfirmSubmit
              action={deleteHabitAction}
              message="Delete this habit? This action cannot be undone."
              pendingText="Deleting..."
              variant="danger"
            >
              <span className="inline-flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M6 7h12M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-9 0l1 12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Delete
              </span>
            </ConfirmSubmit>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-surface px-3 py-1 text-muted">
            Track type: {habit.trackType}
          </span>
          <span className="rounded-full bg-surface px-3 py-1 text-muted">
            Schedule: {habit.scheduleType}
          </span>
          <span className="rounded-full bg-surface px-3 py-1 text-muted">
            Streak: {habit.streaksCache?.currentStreak ?? 0}
          </span>
          <span className="rounded-full bg-surface px-3 py-1 text-muted">
            Longest: {habit.streaksCache?.longestStreak ?? 0}
          </span>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-[2fr,1fr]">
        <form action={logCheckin} className="flex flex-col gap-4 rounded-2xl border border-border bg-card/70 p-6">
          <h2 className="text-lg font-semibold">Log check-in</h2>
          {habit.trackType !== "binary" ? (
            <label className="flex flex-col gap-2 text-sm">
              Quantity
              <input
                type="number"
                name="quantity"
                min={0}
                step={habit.trackType === "count" ? 1 : 5}
                defaultValue={habit.countTarget ?? 1}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </label>
          ) : null}
          <label className="flex flex-col gap-2 text-sm">
            Note
            <textarea
              name="note"
              rows={3}
              placeholder="Optional context"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </label>
          <SubmitButton variant="primary" pendingText="Saving...">
            Save check-in
          </SubmitButton>
        </form>

        <form action={createSkipAction} className="flex flex-col gap-4 rounded-2xl border border-border bg-card/70 p-6">
          <h2 className="text-lg font-semibold">Mark skip</h2>
          <label className="flex flex-col gap-2 text-sm">
            Local day
            <input
              type="date"
              name="localDay"
              defaultValue={format(today, "yyyy-MM-dd")}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            Note
            <textarea
              name="note"
              rows={3}
              placeholder="Optional context"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </label>
          <SubmitButton variant="secondary" pendingText="Creating...">
            Create skip
          </SubmitButton>
          <p className="text-xs text-muted">
            Skip records allow you to protect streaks on planned off days.
          </p>
        </form>
      </section>

      

      <section className="rounded-2xl border border-border bg-card/70 p-6">
        <h2 className="text-lg font-semibold">Check-in history</h2>
        <div className="mt-4 space-y-2 text-sm">
          {history.length === 0 ? (
            <p className="text-muted">No check-ins recorded in the last two weeks.</p>
          ) : (
            history.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3"
              >
                <div>
                  <p className="font-medium">{entry.localDay}</p>
                  {entry.note ? (
                    <p className="text-xs text-muted">{entry.note}</p>
                  ) : null}
                </div>
                <div className="text-right text-xs text-muted">
                  <p>{entry.isSkip ? "Skip" : `Quantity: ${entry.quantity ?? 1}`}</p>
                  <p>{new Date(entry.occurredAt).toLocaleString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card/70 p-6">
        <h2 className="text-lg font-semibold">Daily analytics</h2>
        <div className="mt-4 grid gap-2 text-xs text-muted md:grid-cols-2">
          {analytics.length === 0 ? (
            <p>No analytics yet. Log check-ins to build history.</p>
          ) : (
            analytics.map((row) => (
              <div
                key={row.date}
                className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3"
              >
                <span>{row.date}</span>
                <span>
                  {row.completions}/{row.target ?? 0} · {Math.round((Number(row.completionRate ?? 0)) * 100)}% · Strength {Number(row.strengthScore ?? 0).toFixed(1)}
                </span>
              </div>
            ))
          )}
        </div>
        <div className="mt-4 text-xs text-muted">
          Export full history as CSV via {" "}
          <Link
            href={`/api/exports/habits/${habit.id}?start=${start}&end=${end}`}
            className="text-accent underline"
          >
            download
          </Link>
          .
        </div>
      </section>
    </div>
  );
}

async function getHabitOrThrowSafe(habitId: string, userId: string) {
  try {
    return await getHabitOrThrow(habitId, userId);
  } catch {
    notFound();
  }
}

