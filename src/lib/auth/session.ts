import { db } from "@/db";
import { users, userSessions } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import {
  generateOpaqueRefreshToken,
  hashRefreshToken,
  signAccessToken,
} from "./jwt";
import type { UserRole, ClientPlatform } from "@/types";
import { recordAuditLog } from "@/lib/security/audit";

export interface CreateSessionParams {
  userId: string;
  role: UserRole;
  platform: ClientPlatform;
  tokenVersion: number;
  deviceName?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function createSession(params: CreateSessionParams) {
  const { token, hash, expiresAt } = generateOpaqueRefreshToken();

  const [session] = await db
    .insert(userSessions)
    .values({
      userId: params.userId,
      refreshTokenHash: hash,
      platform: params.platform,
      deviceName: params.deviceName,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      expiresAt,
    })
    .returning({ id: userSessions.id });

  const accessToken = await signAccessToken({
    userId: params.userId,
    role: params.role,
    platform: params.platform,
    tokenVersion: params.tokenVersion,
  });

  return {
    sessionId: session.id,
    accessToken,
    refreshToken: token,
    expiresAt,
  };
}

export async function rotateSession(params: {
  refreshToken: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const tokenHash = hashRefreshToken(params.refreshToken);

  const [existingSession] = await db
    .select({
      id: userSessions.id,
      userId: userSessions.userId,
      platform: userSessions.platform,
      expiresAt: userSessions.expiresAt,
      revokedAt: userSessions.revokedAt,
      deviceName: userSessions.deviceName,
    })
    .from(userSessions)
    .where(eq(userSessions.refreshTokenHash, tokenHash))
    .limit(1);

  if (!existingSession) {
    return { success: false, reason: "NOT_FOUND" } as const;
  }

  if (existingSession.revokedAt !== null) {
    await revokeAllUserSessions(existingSession.userId, "REFRESH_TOKEN_REUSE_DETECTED");

    await recordAuditLog({
      userId: existingSession.userId,
      action: "SECURITY_REFRESH_TOKEN_REUSE",
      entityType: "USER_SESSION",
      entityId: existingSession.id,
      platform: existingSession.platform,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: {
        warning: "Refresh token yang sudah dicabut dikirim ulang. Seluruh sesi user telah diputus seketika.",
      },
    });

    return { success: false, reason: "REUSE_DETECTED" } as const;
  }

  if (existingSession.expiresAt < new Date()) {
    return { success: false, reason: "EXPIRED" } as const;
  }

  const [targetUser] = await db
    .select({
      id: users.id,
      role: users.role,
      isActive: users.isActive,
      tokenVersion: users.tokenVersion,
    })
    .from(users)
    .where(eq(users.id, existingSession.userId))
    .limit(1);

  if (!targetUser || !targetUser.isActive) {
    await revokeSession(existingSession.id);
    return { success: false, reason: "USER_INACTIVE" } as const;
  }

  await db
    .update(userSessions)
    .set({ revokedAt: new Date() })
    .where(eq(userSessions.id, existingSession.id));

  const { token, hash, expiresAt } = generateOpaqueRefreshToken();

  const [newSession] = await db
    .insert(userSessions)
    .values({
      userId: targetUser.id,
      refreshTokenHash: hash,
      platform: existingSession.platform,
      deviceName: existingSession.deviceName,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      expiresAt,
    })
    .returning({ id: userSessions.id });

  const accessToken = await signAccessToken({
    userId: targetUser.id,
    role: targetUser.role,
    platform: existingSession.platform,
    tokenVersion: targetUser.tokenVersion,
  });

  return {
    success: true,
    sessionId: newSession.id,
    accessToken,
    refreshToken: token,
    expiresAt,
    user: {
      id: targetUser.id,
      role: targetUser.role,
      platform: existingSession.platform,
    },
  } as const;
}

async function revokeSession(sessionId: string) {
  await db
    .update(userSessions)
    .set({ revokedAt: new Date() })
    .where(eq(userSessions.id, sessionId));
}

export async function revokeAllUserSessions(userId: string, _reason?: string) {
  void _reason;
  await db
    .update(userSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt)));

  await db
    .update(users)
    .set({
      tokenVersion: sql`${users.tokenVersion} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}
