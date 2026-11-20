import { NextRequest } from "next/server";
import { eq, and, gte, lte, desc, count } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { requireOwner } from "@/lib/auth/guard";
import { jsonResponse, handleApiError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

const auditQuerySchema = z
  .object({
    action: z.string().optional(),
    entityType: z.string().optional(),
    userId: z.string().uuid().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(25),
  })
  .strict();

export async function GET(request: NextRequest) {
  try {
    // RBAC: Hanya Owner yang berhak mengakses audit trail forensik
    await requireOwner(request);

    const { searchParams } = new URL(request.url);
    const parsedQuery = auditQuerySchema.parse({
      action: searchParams.get("action") || undefined,
      entityType: searchParams.get("entityType") || undefined,
      userId: searchParams.get("userId") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "25",
    });

    const conditions = [];

    if (parsedQuery.action) {
      conditions.push(eq(auditLogs.action, parsedQuery.action));
    }
    if (parsedQuery.entityType) {
      conditions.push(eq(auditLogs.entityType, parsedQuery.entityType));
    }
    if (parsedQuery.userId) {
      conditions.push(eq(auditLogs.userId, parsedQuery.userId));
    }
    if (parsedQuery.startDate) {
      conditions.push(gte(auditLogs.createdAt, new Date(`${parsedQuery.startDate}T00:00:00+07:00`)));
    }
    if (parsedQuery.endDate) {
      conditions.push(lte(auditLogs.createdAt, new Date(`${parsedQuery.endDate}T23:59:59.999+07:00`)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Total count untuk pagination
    const [totalResult] = await db
      .select({ total: count() })
      .from(auditLogs)
      .where(whereClause);

    const total = totalResult?.total ?? 0;
    const offset = (parsedQuery.page - 1) * parsedQuery.limit;
    const totalPages = Math.ceil(total / parsedQuery.limit) || 1;

    // Ambil log dengan join aman ke actor user
    const items = await db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        actorName: users.name,
        actorUsername: users.username,
        actorRole: users.role,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        platform: auditLogs.platform,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(parsedQuery.limit)
      .offset(offset);

    return jsonResponse({
      auditLogs: items,
      pagination: {
        total,
        page: parsedQuery.page,
        limit: parsedQuery.limit,
        totalPages,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
