import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/guard";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/api/cors";

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const session = await requireAuth(request);

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Pengguna tidak ditemukan" },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          user: {
            ...user,
            platform: session.platform,
          },
        },
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: "Sesi tidak valid atau telah kedaluwarsa" },
        { status: 401, headers: corsHeaders }
      );
    }

    console.error("Auth me route error:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan internal pada server" },
      { status: 500, headers: corsHeaders }
    );
  }
}
