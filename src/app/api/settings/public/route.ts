import { NextResponse } from "next/server";
import { db } from "@/db";
import { storeSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/guard";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/api/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    await requireAuth(request);

    let [settings] = await db
      .select({
        id: storeSettings.id,
        storeName: storeSettings.storeName,
        tagline: storeSettings.tagline,
        address: storeSettings.address,
        phone: storeSettings.phone,
        paymentInfo: storeSettings.paymentInfo,
        receiptFooter: storeSettings.receiptFooter,
        invoicePrefix: storeSettings.invoicePrefix,
        defaultPaperWidth: storeSettings.defaultPaperWidth,
        maxCashierDiscountPercent: storeSettings.maxCashierDiscountPercent,
      })
      .from(storeSettings)
      .where(eq(storeSettings.id, 1))
      .limit(1);

    if (!settings) {
      settings = {
        id: 1,
        storeName: "Ksatria Graphx",
        tagline: null,
        address: null,
        phone: null,
        paymentInfo: null,
        receiptFooter: null,
        invoicePrefix: "KGX",
        defaultPaperWidth: "MM_58",
        maxCashierDiscountPercent: 10,
      };
    }

    return NextResponse.json({ success: true, data: settings }, { status: 200, headers: corsHeaders });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: "Autentikasi diperlukan", code: "UNAUTHORIZED" },
        { status: 401, headers: corsHeaders }
      );
    }
    console.error("[Settings Public GET Error]:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memuat info publik toko", code: "INTERNAL_SERVER_ERROR" },
      { status: 500, headers: corsHeaders }
    );
  }
}
