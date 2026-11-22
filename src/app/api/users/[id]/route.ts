import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { assertWebOwnerOnly, handleGuardError } from "@/lib/auth/guard";
import { updateUserSchema } from "@/lib/validators/user";
import { revokeAllUserSessions } from "@/lib/auth/session";
import { recordAuditLog } from "@/lib/security/audit";
import { getClientIp } from "@/lib/security/client-ip";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/api/cors";

export const dynamic = "force-dynamic";

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
    const errStr = error instanceof Error ? error.message : String(error);
    const errCode = (error as { code?: string })?.code;

    if (errStr.includes("users_single_owner_idx") || errCode === "23505") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Sistem sudah memiliki satu akun Owner aktif. Tidak dapat menambahkan atau mengubah akun menjadi Owner.",
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

    // Strict Single-Owner Guard: Tolak promosi akun mana pun menjadi OWNER
    if (rawBody && typeof rawBody === "object" && rawBody.role === "OWNER") {
      await recordAuditLog({
        userId: session.userId,
        action: "USER_UPDATE_REJECTED",
        entityType: "USER",
        entityId: id,
        platform: "WEB",
        ipAddress,
        userAgent,
        metadata: {
          reason: "Percobaan promosi akun menjadi Owner ditolak.",
          attemptedRole: "OWNER",
        },
      });
      return NextResponse.json(
        {
          success: false,
          error:
            "Sistem hanya mengizinkan satu akun Owner. Tidak dapat mempromosikan akun menjadi Owner.",
          code: "SINGLE_OWNER_PROMOTION_FORBIDDEN",
        },
        { status: 403, headers: corsHeaders }
      );
    }

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

    // Strict Single-Owner: Proteksi mutlak akun Owner
    if (targetUser.role === "OWNER") {
      if (updates.role) {
        await recordAuditLog({
          userId: session.userId,
          action: "USER_UPDATE_REJECTED",
          entityType: "USER",
          entityId: targetUser.id,
          platform: "WEB",
          ipAddress,
          userAgent,
          metadata: {
            reason: "Percobaan demosi akun Owner tunggal ditolak.",
            targetUsername: targetUser.username,
          },
        });
        return NextResponse.json(
          {
            success: false,
            error: "Akun Owner tunggal tidak dapat diubah perannya menjadi Kasir.",
            code: "SINGLE_OWNER_DEMOTION_FORBIDDEN",
          },
          { status: 403, headers: corsHeaders }
        );
      }

      if (updates.isActive === false) {
        await recordAuditLog({
          userId: session.userId,
          action: "USER_UPDATE_REJECTED",
          entityType: "USER",
          entityId: targetUser.id,
          platform: "WEB",
          ipAddress,
          userAgent,
          metadata: {
            reason: "Percobaan penonaktifan akun Owner tunggal ditolak.",
            targetUsername: targetUser.username,
          },
        });
        return NextResponse.json(
          {
            success: false,
            error: "Akun Owner tunggal tidak dapat dinonaktifkan.",
            code: "SINGLE_OWNER_DEACTIVATION_FORBIDDEN",
          },
          { status: 403, headers: corsHeaders }
        );
      }
    }

    if (targetUser.id === session.userId) {
      if (updates.isActive === false) {
        return NextResponse.json(
          { success: false, error: "Anda tidak dapat menonaktifkan akun Anda sendiri" },
          { status: 400, headers: corsHeaders }
        );
      }
      if (updates.role) {
        return NextResponse.json(
          { success: false, error: "Anda tidak dapat mengubah role akun Anda sendiri menjadi KASIR" },
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
    const errStr = error instanceof Error ? error.message : String(error);
    const errCode = (error as { code?: string })?.code;

    if (errStr.includes("users_single_owner_idx") || errCode === "23505") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Sistem sudah memiliki satu akun Owner aktif. Tidak dapat menambahkan atau mengubah akun menjadi Owner.",
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
      await recordAuditLog({
        userId: session.userId,
        action: "USER_DELETE_REJECTED",
        entityType: "USER",
        entityId: targetUser.id,
        platform: "WEB",
        ipAddress,
        userAgent,
        metadata: {
          reason: "Percobaan penghapusan akun Owner tunggal ditolak.",
          targetUsername: targetUser.username,
        },
      });
      return NextResponse.json(
        {
          success: false,
          error: "Akun Owner tunggal tidak dapat dinonaktifkan atau dihapus.",
          code: "SINGLE_OWNER_DELETION_FORBIDDEN",
        },
        { status: 403, headers: corsHeaders }
      );
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
    const errStr = error instanceof Error ? error.message : String(error);
    const errCode = (error as { code?: string })?.code;

    if (errStr.includes("users_single_owner_idx") || errCode === "23505") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Sistem sudah memiliki satu akun Owner aktif. Tidak dapat menambahkan atau mengubah akun menjadi Owner.",
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

    console.error("DELETE /api/users/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan internal pada server" },
      { status: 500, headers: corsHeaders }
    );
  }
}
