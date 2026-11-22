import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, or, asc } from "drizzle-orm";
import { assertWebOwnerOnly, handleGuardError } from "@/lib/auth/guard";
import { createUserSchema } from "@/lib/validators/user";
import { hashPassword } from "@/lib/auth/password";
import { recordAuditLog } from "@/lib/security/audit";
import { getClientIp } from "@/lib/security/client-ip";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/api/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    await assertWebOwnerOnly(request);

    const userList = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        failedLoginAttempts: users.failedLoginAttempts,
        lockedUntil: users.lockedUntil,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .orderBy(asc(users.role), asc(users.createdAt));

    return NextResponse.json(
      { success: true, data: { users: userList } },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    const errStr = error instanceof Error ? error.message : String(error);
    const errCode = (error as { code?: string })?.code;

    if (errStr.includes("users_single_owner_idx") || errCode === "23505") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Sistem sudah memiliki satu akun Owner aktif. Tidak dapat menambahkan akun Owner lain.",
          code: "SINGLE_OWNER_CONFLICT",
        },
        { status: 409, headers: corsHeaders }
      );
    }

    const handled = handleGuardError(error);
    if (handled.isHandled) {
      return NextResponse.json(
        { success: false, error: handled.message, code: handled.code },
        { status: handled.status, headers: corsHeaders }
      );
    }

    console.error("GET /api/users error:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan internal pada server" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const session = await assertWebOwnerOnly(request);
    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get("user-agent");

    const rawBody = await request.json().catch(() => ({}));

    // Strict Single-Owner Guard: Tolak eksplisit jika payload meminta role OWNER
    if (rawBody && typeof rawBody === "object" && rawBody.role === "OWNER") {
      await recordAuditLog({
        userId: session.userId,
        action: "USER_CREATE_REJECTED",
        entityType: "USER",
        platform: "WEB",
        ipAddress,
        userAgent,
        metadata: {
          reason: "Percobaan pembuatan akun Owner kedua ditolak.",
          attemptedRole: "OWNER",
        },
      });
      return NextResponse.json(
        {
          success: false,
          error:
            "Sistem hanya mengizinkan satu akun Owner. Akun baru hanya dapat dibuat dengan peran Kasir.",
          code: "SINGLE_OWNER_VIOLATION",
        },
        { status: 403, headers: corsHeaders }
      );
    }

    const parseResult = createUserSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Data pengguna tidak valid",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const { name, username, email, password } = parseResult.data;
    // Paksa peran akun baru selalu KASIR
    const role = "KASIR" as const;
    const cleanEmail = email ? email.trim().toLowerCase() : null;
    const cleanUsername = username.trim().toLowerCase();

    const existingUser = await db
      .select({ id: users.id, username: users.username, email: users.email })
      .from(users)
      .where(
        cleanEmail
          ? or(eq(users.username, cleanUsername), eq(users.email, cleanEmail))
          : eq(users.username, cleanUsername)
      )
      .limit(1);

    if (existingUser.length > 0) {
      const match = existingUser[0];
      const conflictMsg =
        match.username.toLowerCase() === cleanUsername
          ? "Username sudah digunakan oleh akun lain"
          : "Email sudah digunakan oleh akun lain";

      return NextResponse.json(
        { success: false, error: conflictMsg },
        { status: 400, headers: corsHeaders }
      );
    }

    const passwordHash = await hashPassword(password);

    const [newUser] = await db
      .insert(users)
      .values({
        name: name.trim(),
        username: cleanUsername,
        email: cleanEmail,
        passwordHash,
        role,
        isActive: true,
        tokenVersion: 1,
        failedLoginAttempts: 0,
      })
      .returning({
        id: users.id,
        name: users.name,
        username: users.username,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });

    await recordAuditLog({
      userId: session.userId,
      action: "USER_CREATED",
      entityType: "USER",
      entityId: newUser.id,
      platform: "WEB",
      ipAddress,
      userAgent,
      metadata: {
        targetUsername: newUser.username,
        targetRole: newUser.role,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Pengguna berhasil ditambahkan",
        data: { user: newUser },
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    const errStr = error instanceof Error ? error.message : String(error);
    const errCode = (error as { code?: string })?.code;

    if (errStr.includes("users_single_owner_idx") || errCode === "23505") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Sistem sudah memiliki satu akun Owner aktif. Tidak dapat menambahkan akun Owner lain.",
          code: "SINGLE_OWNER_CONFLICT",
        },
        { status: 409, headers: corsHeaders }
      );
    }

    const handled = handleGuardError(error);
    if (handled.isHandled) {
      return NextResponse.json(
        { success: false, error: handled.message, code: handled.code },
        { status: handled.status, headers: corsHeaders }
      );
    }

    console.error("POST /api/users error:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan internal pada server" },
      { status: 500, headers: corsHeaders }
    );
  }
}
