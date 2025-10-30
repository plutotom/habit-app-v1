import { NextResponse } from "next/server";

import { createHabit, listHabits } from "@/lib/habits-service";
import { jsonError } from "@/lib/errors";
import { getRequestId, logInfo } from "@/lib/log";
import { assertRateLimit } from "@/lib/rate-limit";
import { requireCurrentAppUser } from "@/lib/users";
import { habitCreateSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    const user = await requireCurrentAppUser();
    const data = await listHabits(user.id);
    logInfo("habits.list", { requestId, userId: user.id, count: data.length });
    return NextResponse.json({ habits: data, requestId });
  } catch (error) {
    return jsonError(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    const user = await requireCurrentAppUser();
    const body = await request.json();
    const payload = habitCreateSchema.parse(body);
    await assertRateLimit({
      userId: user.id,
      bucket: "habit:create",
      limit: 20,
      windowMs: 60_000,
    });
    const habit = await createHabit(user.id, payload);
    logInfo("habits.create", { requestId, userId: user.id, habitId: habit.id });
    return NextResponse.json({ habit, requestId }, { status: 201 });
  } catch (error) {
    return jsonError(error, requestId);
  }
}

