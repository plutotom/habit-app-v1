import { differenceInMilliseconds } from "date-fns";
import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { rateLimits } from "@/db/schema";
import { ApiError } from "@/lib/errors";

type RateLimitOptions = {
  userId: string;
  bucket: string;
  limit: number;
  windowMs: number;
};

export async function assertRateLimit({
  userId,
  bucket,
  limit,
  windowMs,
}: RateLimitOptions) {
  const record = await db.query.rateLimits.findFirst({
    where: and(eq(rateLimits.userId, userId), eq(rateLimits.bucket, bucket)),
  });

  const now = new Date();

  if (!record) {
    await db.insert(rateLimits).values({
      userId,
      bucket,
      count: 1,
      windowStart: now,
    });
    return;
  }

  const elapsed = differenceInMilliseconds(now, record.windowStart ?? now);

  if (elapsed > windowMs) {
    await db
      .update(rateLimits)
      .set({ count: 1, windowStart: now, updatedAt: now })
      .where(and(eq(rateLimits.userId, userId), eq(rateLimits.bucket, bucket)));
    return;
  }

  if (record.count >= limit) {
    throw new ApiError(429, "Too many requests");
  }

  await db
    .update(rateLimits)
    .set({ count: record.count + 1, updatedAt: now })
    .where(and(eq(rateLimits.userId, userId), eq(rateLimits.bucket, bucket)));
}

