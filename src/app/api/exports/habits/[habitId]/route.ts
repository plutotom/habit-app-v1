import { NextResponse } from "next/server";

import { getHabitOrThrow, listCheckins } from "@/lib/habits-service";
import { ApiError, jsonError } from "@/lib/errors";
import { getRequestId, logInfo } from "@/lib/log";
import { assertRateLimit } from "@/lib/rate-limit";
import { requireCurrentAppUser } from "@/lib/users";

type Params = { params: { habitId: string } };

export async function GET(request: Request, { params }: Params) {
  const requestId = getRequestId(request);
  try {
    const user = await requireCurrentAppUser();
    const habit = await getHabitOrThrow(params.habitId, user.id);
    const url = new URL(request.url);
    const start = url.searchParams.get("start") ?? undefined;
    const end = url.searchParams.get("end") ?? undefined;
    const format = url.searchParams.get("format") ?? "csv";

    if (format !== "csv") {
      throw new ApiError(400, "Only CSV exports are supported");
    }

    await assertRateLimit({
      userId: user.id,
      bucket: "export:create",
      limit: 3,
      windowMs: 300_000,
    });

    const checkinRows = await listCheckins(
      habit.id,
      user.id,
      start && end ? { start, end } : undefined
    );

    const header = [
      "habit_id",
      "local_day",
      "occurred_at",
      "quantity",
      "is_skip",
      "note",
    ];

    const lines = checkinRows.map((row) => {
      return [
        row.habitId,
        row.localDay,
        row.occurredAt.toISOString(),
        row.quantity ?? "",
        row.isSkip,
        row.note?.replace(/"/g, '""') ?? "",
      ]
        .map((value) => `"${value}"`)
        .join(",");
    });

    const csv = [header.map((value) => `"${value}"`).join(","), ...lines].join(
      "\n"
    );

    logInfo("exports.csv", {
      requestId,
      userId: user.id,
      habitId: habit.id,
      rows: checkinRows.length,
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="habit-${habit.id}.csv"`,
        "X-Request-Id": requestId,
      },
    });
  } catch (error) {
    return jsonError(error, requestId);
  }
}
