import { NextResponse } from "next/server";

import { grantFreezeTokensIfEligible } from "@/lib/freeze";
import { jsonError } from "@/lib/errors";
import { getRequestId, logInfo } from "@/lib/log";
import { requireCurrentAppUser } from "@/lib/users";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    const user = await requireCurrentAppUser();
    const counters = await grantFreezeTokensIfEligible(user.id);
    logInfo("counters.get", { requestId, userId: user.id, freezeTokens: counters.freezeTokensAvailable });
    return NextResponse.json({ counters, requestId });
  } catch (error) {
    return jsonError(error, requestId);
  }
}

