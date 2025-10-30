import { eq } from "drizzle-orm";
import { clerkClient, currentUser } from "@clerk/nextjs/server";

import { ApiError } from "@/lib/errors";
import { db } from "@/db/client";
import { users } from "@/db/schema";

export async function ensureUser(userId: string) {
  const existing = await db.query.users.findFirst({
    where: eq(users.clerkUserId, userId),
  });

  if (existing) {
    await db
      .update(users)
      .set({ lastActiveAt: new Date() })
      .where(eq(users.id, existing.id));
    return existing;
  }

  const clerkUser = await clerkClient().users.getUser(userId);

  const inserted = await db
    .insert(users)
    .values({
      clerkUserId: userId,
      email: clerkUser.emailAddresses[0]?.emailAddress ?? null,
      timezone: clerkUser.timezone ?? "UTC",
      preferences: {},
      weekStart: "mon",
    })
    .returning();

  return inserted[0];
}

export type AppUser = Awaited<ReturnType<typeof ensureUser>>;

export async function getCurrentAppUser() {
  const authUser = await currentUser();

  if (!authUser) {
    return null;
  }

  return ensureUser(authUser.id);
}

export async function requireCurrentAppUser() {
  const user = await getCurrentAppUser();

  if (!user) {
    throw new ApiError(401, "Authentication required");
  }

  return user;
}

