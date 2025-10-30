import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { userCounters } from "@/db/schema";
import { activateFreezeToken } from "@/lib/freeze";
import { getHabitOrThrow, recomputeStreaksAndAnalytics } from "@/lib/habits-service";
import { jsonError } from "@/lib/errors";
import { getRequestId, logInfo } from "@/lib/log";
import { assertRateLimit } from "@/lib/rate-limit";
import { requireCurrentAppUser } from "@/lib/users";
import { freezeActivateSchema } from "@/lib/validators";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    const user = await requireCurrentAppUser();
    const body = await request.json();
    const payload = freezeActivateSchema.parse(body);
    await assertRateLimit({
      userId: user.id,
      bucket: "freeze:activate",
      limit: 10,
      windowMs: 86_400_000,
    });

    const token = await activateFreezeToken({
      userId: user.id,
      habitId: payload.habitId,
      coveredLocalDay: payload.coveredLocalDay,
    });

    if (payload.habitId) {
      const habit = await getHabitOrThrow(payload.habitId, user.id);
      await recomputeStreaksAndAnalytics({
        habit,
        user,
        localDay: payload.coveredLocalDay,
      });
    }

    const counters = await db.query.userCounters.findFirst({
      where: eq(userCounters.userId, user.id),
    });
    logInfo("freeze.activate", {
      requestId,
      userId: user.id,
      tokenId: token.id,
      habitId: payload.habitId,
      coveredLocalDay: payload.coveredLocalDay,
    });

    return NextResponse.json({ token, counters, requestId });
  } catch (error) {
    return jsonError(error, requestId);
  }
}

