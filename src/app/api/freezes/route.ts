import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { freezeTokens } from "@/db/schema";
import { grantFreezeTokensIfEligible } from "@/lib/freeze";
import { jsonError } from "@/lib/errors";
import { getRequestId, logInfo } from "@/lib/log";
import { requireCurrentAppUser } from "@/lib/users";
import { desc, eq } from "drizzle-orm";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    const user = await requireCurrentAppUser();
    const counters = await grantFreezeTokensIfEligible(user.id);

    const tokens = await db
      .select()
      .from(freezeTokens)
      .where(eq(freezeTokens.userId, user.id))
      .orderBy(desc(freezeTokens.grantedAt))
      .limit(100);
    logInfo("freeze.list", { requestId, userId: user.id, tokens: tokens.length });
    return NextResponse.json({ counters, tokens, requestId });
  } catch (error) {
    return jsonError(error, requestId);
  }
}

