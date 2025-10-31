import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { eventsLog } from "@/db/schema";
import { createSkip, getHabitOrThrow } from "@/lib/habits-service";
import { jsonError } from "@/lib/errors";
import { getRequestId, logInfo } from "@/lib/log";
import { assertRateLimit } from "@/lib/rate-limit";
import { requireCurrentAppUser } from "@/lib/users";
import { skipCreateSchema } from "@/lib/validators";

type Params = { params: Promise<{ habitId: string }> };

export async function POST(request: Request, { params }: Params) {
  const requestId = getRequestId(request);
  try {
    const user = await requireCurrentAppUser();
    const { habitId } = await params;
    const habit = await getHabitOrThrow(habitId, user.id);
    const body = await request.json();
    const payload = skipCreateSchema.parse(body);
    await assertRateLimit({
      userId: user.id,
      bucket: "skip:create",
      limit: 30,
      windowMs: 60_000,
    });

    const skip = await createSkip({
      user,
      habit,
      localDay: payload.localDay,
      note: payload.note,
    });

    await db.insert(eventsLog).values({
      userId: user.id,
      eventType: "skip_created",
      payload: { habitId: habit.id, checkinId: skip.id },
    });
    logInfo("skip.create", {
      requestId,
      userId: user.id,
      habitId: habit.id,
      checkinId: skip.id,
    });
    return NextResponse.json({ skip, requestId }, { status: 201 });
  } catch (error) {
    return jsonError(error, requestId);
  }
}
