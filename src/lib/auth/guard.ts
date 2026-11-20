import { cookies } from "next/headers";
import { verifyAccessToken } from "./jwt";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { validateCsrfOrigin } from "@/lib/security/csrf";
import type { UserRole, ClientPlatform } from "@/types";

export interface SessionResult {
  userId: string;
  name: string;
  username: string;
  role: UserRole;
  platform: ClientPlatform;
  tokenVersion: number;
}

export async function getSession(request: Request): Promise<SessionResult | null> {
  let token: string | null = null;
  let sourcePlatform: ClientPlatform = "WEB";

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get("kgx_access_token")?.value;

  if (cookieToken) {
    token = cookieToken;
    sourcePlatform = "WEB";
  } else {
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
      sourcePlatform = "APK";
    }
  }

  if (!token) {
    return null;
  }

  const payload = await verifyAccessToken(token);
  if (!payload || !payload.sub) {
    return null;
  }

  const [dbUser] = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      role: users.role,
      isActive: users.isActive,
      tokenVersion: users.tokenVersion,
      lockedUntil: users.lockedUntil,
    })
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);

  if (!dbUser || !dbUser.isActive) {
    return null;
  }

  if (dbUser.tokenVersion !== payload.tokenVersion) {
    return null;
  }

  if (dbUser.lockedUntil && dbUser.lockedUntil > new Date()) {
    return null;
  }

  return {
    userId: dbUser.id,
    name: dbUser.name,
    username: dbUser.username,
    role: dbUser.role,
    platform: payload.platform || sourcePlatform,
    tokenVersion: dbUser.tokenVersion,
  };
}

export async function requireAuth(request: Request): Promise<SessionResult> {
  const session = await getSession(request);
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function requireOwner(request: Request): Promise<SessionResult> {
  const session = await requireAuth(request);
  if (session.role !== "OWNER") {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export async function assertWebOwnerOnly(request: Request): Promise<SessionResult> {
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    throw new Error("FORBIDDEN_BEARER_NOT_ALLOWED");
  }

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get("kgx_access_token")?.value;
  if (!cookieToken) {
    throw new Error("UNAUTHORIZED_NO_COOKIE");
  }

  const payload = await verifyAccessToken(cookieToken);
  if (!payload || !payload.sub) {
    throw new Error("UNAUTHORIZED_INVALID_TOKEN");
  }

  if (payload.platform !== "WEB") {
    throw new Error("FORBIDDEN_PLATFORM_NOT_WEB");
  }

  const method = request.method.toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const isValidOrigin = validateCsrfOrigin(request);
    if (!isValidOrigin) {
      throw new Error("FORBIDDEN_INVALID_ORIGIN");
    }

    const origin = request.headers.get("origin");
    if (origin === "capacitor://localhost" || origin === "https://localhost") {
      throw new Error("FORBIDDEN_CAPACITOR_ORIGIN");
    }
  }

  const [dbUser] = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      role: users.role,
      isActive: users.isActive,
      tokenVersion: users.tokenVersion,
      lockedUntil: users.lockedUntil,
    })
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);

  if (!dbUser || !dbUser.isActive) {
    throw new Error("UNAUTHORIZED_USER_INACTIVE");
  }

  if (dbUser.role !== "OWNER") {
    throw new Error("FORBIDDEN_NOT_OWNER");
  }

  if (dbUser.tokenVersion !== payload.tokenVersion) {
    throw new Error("UNAUTHORIZED_SESSION_REVOKED");
  }

  if (dbUser.lockedUntil && dbUser.lockedUntil > new Date()) {
    throw new Error("FORBIDDEN_ACCOUNT_LOCKED");
  }

  return {
    userId: dbUser.id,
    name: dbUser.name,
    username: dbUser.username,
    role: dbUser.role,
    platform: "WEB",
    tokenVersion: dbUser.tokenVersion,
  };
}

export function handleGuardError(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);

  const status403 = [
    "FORBIDDEN",
    "FORBIDDEN_BEARER_NOT_ALLOWED",
    "FORBIDDEN_PLATFORM_NOT_WEB",
    "FORBIDDEN_INVALID_ORIGIN",
    "FORBIDDEN_CAPACITOR_ORIGIN",
    "FORBIDDEN_NOT_OWNER",
    "FORBIDDEN_ACCOUNT_LOCKED",
  ];

  const status401 = [
    "UNAUTHORIZED",
    "UNAUTHORIZED_NO_COOKIE",
    "UNAUTHORIZED_INVALID_TOKEN",
    "UNAUTHORIZED_USER_INACTIVE",
    "UNAUTHORIZED_SESSION_REVOKED",
  ];

  const errorMessages: Record<string, string> = {
    FORBIDDEN_BEARER_NOT_ALLOWED: "Akses ditolak: API ini hanya dapat diakses melalui antarmuka Web.",
    FORBIDDEN_PLATFORM_NOT_WEB: "Akses ditolak: Operasi ini hanya diizinkan melalui browser Web.",
    FORBIDDEN_INVALID_ORIGIN: "Akses ditolak: Permintaan berasal dari sumber tidak tepercaya.",
    FORBIDDEN_CAPACITOR_ORIGIN: "Akses ditolak: Manajemen pengguna tidak diizinkan melalui aplikasi Android/Capacitor.",
    FORBIDDEN_NOT_OWNER: "Akses ditolak: Hanya pemilik usaha (Owner) yang dapat mengakses fitur ini.",
    FORBIDDEN_ACCOUNT_LOCKED: "Akun Anda sedang terkunci sementara.",
    FORBIDDEN: "Akses ditolak: Anda tidak memiliki izin untuk tindakan ini.",
    UNAUTHORIZED_NO_COOKIE: "Sesi tidak ditemukan. Silakan login kembali.",
    UNAUTHORIZED_INVALID_TOKEN: "Sesi tidak valid. Silakan login kembali.",
    UNAUTHORIZED_USER_INACTIVE: "Akun Anda dinonaktifkan.",
    UNAUTHORIZED_SESSION_REVOKED: "Sesi Anda telah dicabut. Silakan login kembali.",
    UNAUTHORIZED: "Sesi tidak valid atau telah kedaluwarsa. Silakan login kembali.",
  };

  const status = status403.includes(msg) ? 403 : status401.includes(msg) ? 401 : 500;
  const clientMessage = errorMessages[msg] || (status === 500 ? "Terjadi kesalahan internal pada server" : "Akses ditolak");

  return {
    isHandled: status403.includes(msg) || status401.includes(msg),
    status,
    message: clientMessage,
    code: msg,
  };
}
