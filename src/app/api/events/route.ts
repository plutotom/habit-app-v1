import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { eventsLog } from "@/db/schema";
import { jsonError } from "@/lib/errors";
import { getRequestId, logInfo } from "@/lib/log";
import { requireCurrentAppUser } from "@/lib/users";
import { desc, eq } from "drizzle-orm";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    const user = await requireCurrentAppUser();
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? 50);

    const events = await db
      .select()
      .from(eventsLog)
      .where(eq(eventsLog.userId, user.id))
      .orderBy(desc(eventsLog.occurredAt))
      .limit(Math.min(limit, 200));
    logInfo("events.list", { requestId, userId: user.id, count: events.length });
    return NextResponse.json({ events, requestId });
  } catch (error) {
    return jsonError(error, requestId);
  }
}

