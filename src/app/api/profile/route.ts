import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { users } from "@/db/schema";
import { jsonError } from "@/lib/errors";
import { getRequestId, logInfo } from "@/lib/log";
import { requireCurrentAppUser } from "@/lib/users";
import { profileUpdateSchema } from "@/lib/validators";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    const user = await requireCurrentAppUser();
    logInfo("profile.get", { requestId, userId: user.id });
    return NextResponse.json({ profile: user, requestId });
  } catch (error) {
    return jsonError(error, requestId);
  }
}

export async function PATCH(request: Request) {
  const requestId = getRequestId(request);
  try {
    const user = await requireCurrentAppUser();
    const payload = profileUpdateSchema.parse(await request.json());

    await db
      .update(users)
      .set({
        timezone: payload.timezone ?? user.timezone,
        weekStart: payload.weekStart ?? user.weekStart,
        preferences: payload.preferences ?? user.preferences,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    const updated = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    logInfo("profile.update", { requestId, userId: user.id });

    return NextResponse.json({ profile: updated, requestId });
  } catch (error) {
    return jsonError(error, requestId);
  }
}
