import { db } from "@/db";
import { rateLimitBuckets } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfterSec?: number;
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowSeconds * 1000);

  try {
    const existing = await db
      .select({
        count: rateLimitBuckets.count,
        resetAt: rateLimitBuckets.resetAt,
      })
      .from(rateLimitBuckets)
      .where(eq(rateLimitBuckets.key, key))
      .limit(1);

    if (existing.length === 0 || existing[0].resetAt <= now) {
      await db
        .insert(rateLimitBuckets)
        .values({
          key,
          count: 1,
          resetAt,
        })
        .onConflictDoUpdate({
          target: rateLimitBuckets.key,
          set: {
            count: 1,
            resetAt,
          },
        });

      return {
        allowed: true,
        limit,
        remaining: limit - 1,
        resetAt,
      };
    }

    const currentCount = existing[0].count;
    const bucketResetAt = existing[0].resetAt;

    if (currentCount >= limit) {
      const retryAfterSec = Math.max(1, Math.ceil((bucketResetAt.getTime() - now.getTime()) / 1000));
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetAt: bucketResetAt,
        retryAfterSec,
      };
    }

    await db
      .update(rateLimitBuckets)
      .set({
        count: sql`${rateLimitBuckets.count} + 1`,
      })
      .where(eq(rateLimitBuckets.key, key));

    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - (currentCount + 1)),
      resetAt: bucketResetAt,
    };
  } catch {
    return {
      allowed: true,
      limit,
      remaining: 1,
      resetAt,
    };
  }
}
