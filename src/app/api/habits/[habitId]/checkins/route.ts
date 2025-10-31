import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { eventsLog } from "@/db/schema";
import { createCheckin, getHabitOrThrow, listCheckins } from "@/lib/habits-service";
import { ApiError, jsonError } from "@/lib/errors";
import { getRequestId, logInfo } from "@/lib/log";
import { assertRateLimit } from "@/lib/rate-limit";
import { requireCurrentAppUser } from "@/lib/users";
import { checkinCreateSchema } from "@/lib/validators";

type Params = { params: Promise<{ habitId: string }> };

export async function GET(request: Request, { params }: Params) {
  const requestId = getRequestId(request);
  try {
    const user = await requireCurrentAppUser();
    const { habitId } = await params;
    const habit = await getHabitOrThrow(habitId, user.id);
    const url = new URL(request.url);
    const start = url.searchParams.get("start") ?? undefined;
    const end = url.searchParams.get("end") ?? undefined;

    const data = await listCheckins(habit.id, user.id, start && end ? { start, end } : undefined);
    logInfo("checkins.list", { requestId, userId: user.id, habitId: habit.id, count: data.length });
    return NextResponse.json({ checkins: data, requestId });
  } catch (error) {
    return jsonError(error, requestId);
  }
}

export async function POST(request: Request, { params }: Params) {
  const requestId = getRequestId(request);
  try {
    const user = await requireCurrentAppUser();
    const { habitId } = await params;
    const habit = await getHabitOrThrow(habitId, user.id);
    const body = await request.json();
    const payload = checkinCreateSchema.parse(body);

    if (payload.quantity !== undefined && payload.quantity < 0) {
      throw new ApiError(400, "quantity must be positive");
    }

    const occurredAt = payload.occurredAt ? new Date(payload.occurredAt) : new Date();
    await assertRateLimit({
      userId: user.id,
      bucket: "checkin:create",
      limit: 60,
      windowMs: 60_000,
    });
    const checkin = await createCheckin({
      user,
      habit,
      occurredAt,
      quantity: payload.quantity,
      note: payload.note,
      source: payload.source,
    });

    await db.insert(eventsLog).values({
      userId: user.id,
      eventType: "checkin_created",
      payload: { habitId: habit.id, checkinId: checkin.id },
    });
    logInfo("checkins.create", { requestId, userId: user.id, habitId: habit.id, checkinId: checkin.id });
    return NextResponse.json({ checkin, requestId }, { status: 201 });
  } catch (error) {
    return jsonError(error, requestId);
  }
}

