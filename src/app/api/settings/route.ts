import { NextResponse } from "next/server";
import { db } from "@/db";
import { storeSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireOwner } from "@/lib/auth/guard";
import { validateCsrfOrigin } from "@/lib/security/csrf";
import { recordAuditLog } from "@/lib/security/audit";
import { getClientIp } from "@/lib/security/client-ip";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/api/cors";
import { updateStoreSettingsSchema } from "@/lib/validators/settings";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    await requireOwner(request);

    let [settings] = await db
      .select()
      .from(storeSettings)
      .where(eq(storeSettings.id, 1))
      .limit(1);

    if (!settings) {
      // Inisialisasi baris default singleton id = 1 jika belum ada
      const [inserted] = await db
        .insert(storeSettings)
        .values({
          id: 1,
          storeName: "Ksatria Graphx",
          invoicePrefix: "KGX",
          defaultPaperWidth: "MM_58",
          maxCashierDiscountPercent: 10,
        })
        .onConflictDoNothing()
        .returning();
      settings = inserted;
    }

    return NextResponse.json({ success: true, data: settings }, { status: 200, headers: corsHeaders });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json(
          { success: false, error: "Autentikasi diperlukan", code: "UNAUTHORIZED" },
          { status: 401, headers: corsHeaders }
        );
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json(
          { success: false, error: "Hanya Owner yang berhak mengakses pengaturan toko", code: "FORBIDDEN" },
          { status: 403, headers: corsHeaders }
        );
      }
    }
    console.error("[Settings GET Error]:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memuat pengaturan toko", code: "INTERNAL_SERVER_ERROR" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PATCH(request: Request) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const session = await requireOwner(request);

    if (session.platform === "WEB") {
      const isOriginValid = validateCsrfOrigin(request);
      if (!isOriginValid) {
        return NextResponse.json(
          { success: false, error: "Origin CSRF tidak valid", code: "CSRF_ORIGIN_INVALID" },
          { status: 403, headers: corsHeaders }
        );
      }
    }

    const rawBody = await request.json();
    const parseResult = updateStoreSettingsSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validasi data gagal",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const {
      storeName,
      tagline,
      address,
      phone,
      paymentInfo,
      receiptFooter,
      invoicePrefix,
      defaultPaperWidth,
      maxCashierDiscountPercent,
    } = parseResult.data;

    const settingsValues = {
      storeName,
      tagline,
      address,
      phone,
      paymentInfo,
      receiptFooter,
      invoicePrefix,
      defaultPaperWidth,
      maxCashierDiscountPercent,
    };

    const [updated] = await db
      .insert(storeSettings)
      .values({
        id: 1,
        ...settingsValues,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: storeSettings.id,
        set: {
          ...settingsValues,
          updatedAt: new Date(),
        },
      })
      .returning();

    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get("user-agent");

    await recordAuditLog({
      userId: session.userId,
      action: "SETTINGS_UPDATE",
      entityType: "store_settings",
      entityId: "1",
      platform: session.platform,
      ipAddress,
      userAgent,
      metadata: settingsValues,
    });

    return NextResponse.json(
      { success: true, message: "Pengaturan toko berhasil diperbarui", data: updated },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json(
          { success: false, error: "Autentikasi diperlukan", code: "UNAUTHORIZED" },
          { status: 401, headers: corsHeaders }
        );
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json(
          { success: false, error: "Hanya Owner yang berhak mengubah pengaturan toko", code: "FORBIDDEN" },
          { status: 403, headers: corsHeaders }
        );
      }
    }
    console.error("[Settings PATCH Error]:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memperbarui pengaturan toko", code: "INTERNAL_SERVER_ERROR" },
      { status: 500, headers: corsHeaders }
    );
  }
}
