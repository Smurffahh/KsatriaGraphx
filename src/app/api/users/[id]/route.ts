import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and, ne, count } from "drizzle-orm";
import { assertWebOwnerOnly, handleGuardError } from "@/lib/auth/guard";
import { updateUserSchema } from "@/lib/validators/user";
import { revokeAllUserSessions } from "@/lib/auth/session";
import { recordAuditLog } from "@/lib/security/audit";
import { getClientIp } from "@/lib/security/client-ip";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/api/cors";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function GET(request: Request, { params }: RouteParams) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    await assertWebOwnerOnly(request);
    const { id } = await params;

    const [targetUser] = await db
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
      .where(eq(users.id, id))
      .limit(1);

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "Pengguna tidak ditemukan" },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, data: { user: targetUser } },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    const handled = handleGuardError(error);
    if (handled.isHandled) {
      return NextResponse.json(
        { success: false, error: handled.message, code: handled.code },
        { status: handled.status, headers: corsHeaders }
      );
    }

    console.error("GET /api/users/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan internal pada server" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const session = await assertWebOwnerOnly(request);
    const { id } = await params;
    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get("user-agent");

    const rawBody = await request.json().catch(() => ({}));
    const parseResult = updateUserSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Format input tidak valid",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const [targetUser] = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "Pengguna tidak ditemukan" },
        { status: 404, headers: corsHeaders }
      );
    }

    const updates = parseResult.data;

    if (targetUser.id === session.userId) {
      if (updates.isActive === false) {
        return NextResponse.json(
          { success: false, error: "Anda tidak dapat menonaktifkan akun Anda sendiri" },
          { status: 400, headers: corsHeaders }
        );
      }
      if (updates.role && updates.role !== "OWNER") {
        return NextResponse.json(
          { success: false, error: "Anda tidak dapat mengubah role akun Anda sendiri menjadi KASIR" },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    if (
      targetUser.role === "OWNER" &&
      (updates.isActive === false || (updates.role && updates.role !== "OWNER"))
    ) {
      const [activeOwnerCount] = await db
        .select({ total: count() })
        .from(users)
        .where(and(eq(users.role, "OWNER"), eq(users.isActive, true)));

      if ((activeOwnerCount?.total || 0) <= 1) {
        return NextResponse.json(
          {
            success: false,
            error: "Tidak dapat menonaktifkan atau mengubah role pemilik (Owner) terakhir di sistem",
          },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    if (updates.username && updates.username.toLowerCase() !== targetUser.username.toLowerCase()) {
      const cleanUsername = updates.username.trim().toLowerCase();
      const [conflict] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.username, cleanUsername), ne(users.id, targetUser.id)))
        .limit(1);

      if (conflict) {
        return NextResponse.json(
          { success: false, error: "Username sudah digunakan oleh akun lain" },
          { status: 400, headers: corsHeaders }
        );
      }
      updates.username = cleanUsername;
    }

    if (updates.email && updates.email !== targetUser.email) {
      const cleanEmail = updates.email.trim().toLowerCase();
      const [conflict] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, cleanEmail), ne(users.id, targetUser.id)))
        .limit(1);

      if (conflict) {
        return NextResponse.json(
          { success: false, error: "Email sudah digunakan oleh akun lain" },
          { status: 400, headers: corsHeaders }
        );
      }
      updates.email = cleanEmail;
    }

    const isDeactivating = updates.isActive === false && targetUser.isActive === true;
    const isRoleChanging = updates.role && updates.role !== targetUser.role;

    if (isDeactivating || isRoleChanging) {
      await revokeAllUserSessions(targetUser.id, isDeactivating ? "USER_DEACTIVATED" : "ROLE_CHANGED");
    }

    const payloadToUpdate: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (updates.name !== undefined) payloadToUpdate.name = updates.name.trim();
    if (updates.username !== undefined) payloadToUpdate.username = updates.username;
    if (updates.email !== undefined) payloadToUpdate.email = updates.email || null;
    if (updates.role !== undefined) payloadToUpdate.role = updates.role;
    if (updates.isActive !== undefined) payloadToUpdate.isActive = updates.isActive;

    const [updatedUser] = await db
      .update(users)
      .set(payloadToUpdate)
      .where(eq(users.id, targetUser.id))
      .returning({
        id: users.id,
        name: users.name,
        username: users.username,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        updatedAt: users.updatedAt,
      });

    await recordAuditLog({
      userId: session.userId,
      action: isDeactivating
        ? "USER_DEACTIVATED"
        : updates.isActive === true && !targetUser.isActive
        ? "USER_ACTIVATED"
        : isRoleChanging
        ? "USER_ROLE_CHANGED"
        : "USER_UPDATED",
      entityType: "USER",
      entityId: targetUser.id,
      platform: "WEB",
      ipAddress,
      userAgent,
      metadata: {
        changes: updates,
        sessionsRevoked: isDeactivating || isRoleChanging,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Data pengguna berhasil diperbarui",
        data: { user: updatedUser },
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    const handled = handleGuardError(error);
    if (handled.isHandled) {
      return NextResponse.json(
        { success: false, error: handled.message, code: handled.code },
        { status: handled.status, headers: corsHeaders }
      );
    }

    console.error("PATCH /api/users/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan internal pada server" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const session = await assertWebOwnerOnly(request);
    const { id } = await params;
    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get("user-agent");

    const [targetUser] = await db
      .select({
        id: users.id,
        role: users.role,
        isActive: users.isActive,
        username: users.username,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "Pengguna tidak ditemukan" },
        { status: 404, headers: corsHeaders }
      );
    }

    if (targetUser.id === session.userId) {
      return NextResponse.json(
        { success: false, error: "Anda tidak dapat menonaktifkan akun Anda sendiri" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (targetUser.role === "OWNER") {
      const [activeOwnerCount] = await db
        .select({ total: count() })
        .from(users)
        .where(and(eq(users.role, "OWNER"), eq(users.isActive, true)));

      if ((activeOwnerCount?.total || 0) <= 1) {
        return NextResponse.json(
          {
            success: false,
            error: "Tidak dapat menonaktifkan pemilik (Owner) terakhir di sistem",
          },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    await db
      .update(users)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, targetUser.id));

    await revokeAllUserSessions(targetUser.id, "USER_DELETED_BY_OWNER");

    await recordAuditLog({
      userId: session.userId,
      action: "USER_DEACTIVATED",
      entityType: "USER",
      entityId: targetUser.id,
      platform: "WEB",
      ipAddress,
      userAgent,
      metadata: {
        actionNote: "Akun dinonaktifkan dan seluruh sesi aktif diputus seketika.",
        targetUsername: targetUser.username,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Pengguna berhasil dinonaktifkan dan seluruh sesinya telah diputus",
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    const handled = handleGuardError(error);
    if (handled.isHandled) {
      return NextResponse.json(
        { success: false, error: handled.message, code: handled.code },
        { status: handled.status, headers: corsHeaders }
      );
    }

    console.error("DELETE /api/users/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan internal pada server" },
      { status: 500, headers: corsHeaders }
    );
  }
}
