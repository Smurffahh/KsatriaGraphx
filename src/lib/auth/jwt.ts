import * as jose from "jose";
import crypto from "crypto";
import type { UserRole, ClientPlatform } from "@/types";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_DAYS = 30;

function getAccessSecretKey(): Uint8Array {
  const secret = process.env.JWT_ACCESS_SECRET || "default-dev-jwt-access-secret-min-32-chars-long";
  return new TextEncoder().encode(secret);
}

export interface AccessTokenPayload extends jose.JWTPayload {
  sub: string;
  role: UserRole;
  platform: ClientPlatform;
  tokenVersion: number;
}

export async function signAccessToken(payload: {
  userId: string;
  role: UserRole;
  platform: ClientPlatform;
  tokenVersion: number;
}): Promise<string> {
  const secret = getAccessSecretKey();

  return new jose.SignJWT({
    role: payload.role,
    platform: payload.platform,
    tokenVersion: payload.tokenVersion,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const secret = getAccessSecretKey();
    const { payload } = await jose.jwtVerify(token, secret);
    return payload as AccessTokenPayload;
  } catch {
    return null;
  }
}

export function generateOpaqueRefreshToken(): {
  token: string;
  hash: string;
  expiresAt: Date;
} {
  const token = crypto.randomBytes(32).toString("hex");
  const hash = hashRefreshToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);

  return { token, hash, expiresAt };
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
