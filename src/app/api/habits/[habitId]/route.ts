import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { streaksCache } from "@/db/schema";
import { getHabitOrThrow, updateHabit } from "@/lib/habits-service";
import { jsonError } from "@/lib/errors";
import { getRequestId, logInfo } from "@/lib/log";
import { requireCurrentAppUser } from "@/lib/users";
import { habitUpdateSchema } from "@/lib/validators";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ habitId: string }> };

export async function GET(request: Request, { params }: Params) {
  const requestId = getRequestId(request);
  try {
    const user = await requireCurrentAppUser();
    const { habitId } = await params;
    const habit = await getHabitOrThrow(habitId, user.id);
    const streak = await db.query.streaksCache.findFirst({
      where: eq(streaksCache.habitId, habit.id),
    });
    logInfo("habits.read", { requestId, userId: user.id, habitId: habit.id });
    return NextResponse.json({ habit, streak, requestId });
  } catch (error) {
    return jsonError(error, requestId);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const requestId = getRequestId(request);
  try {
    const user = await requireCurrentAppUser();
    const body = await request.json();
    const payload = habitUpdateSchema.parse(body);
    const { habitId } = await params;
    const habit = await updateHabit(habitId, user.id, payload);
    const streak = await db.query.streaksCache.findFirst({
      where: eq(streaksCache.habitId, habit.id),
    });
    logInfo("habits.update", { requestId, userId: user.id, habitId: habit.id });
    return NextResponse.json({ habit, streak, requestId });
  } catch (error) {
    return jsonError(error, requestId);
  }
}
