import { revalidatePath } from "next/cache";

import { db } from "@/db/client";
import { users } from "@/db/schema";
import { grantFreezeTokensIfEligible } from "@/lib/freeze";
import { requireCurrentAppUser } from "@/lib/users";
import { profileUpdateSchema } from "@/lib/validators";
import { eq } from "drizzle-orm";

export default async function ProfilePage() {
  const user = await requireCurrentAppUser();
  const counters = await grantFreezeTokensIfEligible(user.id);

  const updateProfile = async (formData: FormData) => {
    "use server";

    const current = await requireCurrentAppUser();
    const payload = profileUpdateSchema.parse({
      timezone: formData.get("timezone") || undefined,
      weekStart: formData.get("weekStart") || undefined,
    });

    await db
      .update(users)
      .set({
        timezone: payload.timezone ?? current.timezone,
        weekStart: payload.weekStart ?? current.weekStart,
      })
      .where(eq(users.id, current.id));

    revalidatePath("/app/profile");
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card/70 p-6">
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-sm text-muted">Manage timezone and streak preferences.</p>
      </section>

      <section className="grid gap-6 md:grid-cols-[2fr,1fr]">
        <form action={updateProfile} className="flex flex-col gap-4 rounded-2xl border border-border bg-card/70 p-6">
          <h2 className="text-lg font-semibold">Preferences</h2>
          <label className="flex flex-col gap-2 text-sm">
            Timezone
            <input
              name="timezone"
              defaultValue={user.timezone}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            Week start
            <select
              name="weekStart"
              defaultValue={user.weekStart}
              className="rounded-lg border border-border bg-surface px-3 py-2"
            >
              <option value="mon">Monday</option>
              <option value="sun">Sunday</option>
            </select>
          </label>
          <button
            type="submit"
            className="w-fit rounded-full bg-accent px-4 py-2 text-sm font-semibold text-background transition hover:opacity-90"
          >
            Save changes
          </button>
        </form>

        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card/70 p-6 text-sm text-muted">
          <h2 className="text-lg font-semibold text-foreground">Account summary</h2>
          <p>Clerk ID: {user.clerkUserId}</p>
          <p>Email: {user.email ?? "—"}</p>
          <p>Timezone: {user.timezone}</p>
          <p>Freeze tokens available: {counters.freezeTokensAvailable}</p>
          <p>
            Last freeze grant: {counters.lastFreezeGrantAt ? new Date(counters.lastFreezeGrantAt).toLocaleDateString() : "—"}
          </p>
        </div>
      </section>
    </div>
  );
}

