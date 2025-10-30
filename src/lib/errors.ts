import { NextResponse } from "next/server";

import { logError } from "@/lib/log";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function jsonError(error: unknown, requestId?: string) {
  if (error instanceof ApiError) {
    logError(error.message, { requestId, details: error.details, status: error.status });
    return NextResponse.json(
      {
        error: error.message,
        details: error.details,
        requestId,
      },
      { status: error.status },
    );
  }

  logError("Unhandled error", { requestId, error });
  return NextResponse.json(
    {
      error: "Internal Server Error",
      requestId,
    },
    { status: 500 },
  );
}

