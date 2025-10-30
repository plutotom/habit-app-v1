import { NextResponse } from "next/server";

import { getHabitAnalyticsRange, getHabitOrThrow } from "@/lib/habits-service";
import { ApiError, jsonError } from "@/lib/errors";
import { getRequestId, logInfo } from "@/lib/log";
import { requireCurrentAppUser } from "@/lib/users";

type Params = { params: { habitId: string } };

export async function GET(request: Request, { params }: Params) {
  const requestId = getRequestId(request);
  try {
    const user = await requireCurrentAppUser();
    await getHabitOrThrow(params.habitId, user.id);
    const url = new URL(request.url);
    const start = url.searchParams.get("start");
    const end = url.searchParams.get("end");

    if (!start || !end) {
      throw new ApiError(400, "start and end query params are required (yyyy-mm-dd)");
    }

    const analytics = await getHabitAnalyticsRange({
      habitId: params.habitId,
      userId: user.id,
      start,
      end,
    });
    logInfo("analytics.daily", {
      requestId,
      userId: user.id,
      habitId: params.habitId,
      count: analytics.length,
    });

    return NextResponse.json({ analytics, requestId });
  } catch (error) {
    return jsonError(error, requestId);
  }
}

