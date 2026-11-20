import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/guard";
import { validateCsrfOrigin } from "@/lib/security/csrf";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { recordAuditLog } from "@/lib/security/audit";
import { getClientIp } from "@/lib/security/client-ip";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/api/cors";
import {
  validateAndProcessImage,
  ImageValidationError,
  MAX_IMAGE_SIZE_BYTES,
} from "@/lib/security/image-validator";
import { uploadProductImage } from "@/lib/storage/blob";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    // 1. Guard Autentikasi & Role: Khusus OWNER
    const session = await requireOwner(request);

    // 2. Proteksi CSRF untuk request berbasis cookie Web
    if (session.platform === "WEB") {
      const isOriginValid = validateCsrfOrigin(request);
      if (!isOriginValid) {
        return NextResponse.json(
          {
            success: false,
            error: "Permintaan ditolak karena Origin CSRF tidak valid",
            code: "CSRF_ORIGIN_INVALID",
          },
          { status: 403, headers: corsHeaders }
        );
      }
    }

    // 3. Distributed Rate Limiter: Maksimal 20 upload / 10 menit per user
    const rateLimitKey = `upload:${session.userId}`;
    const rateLimitResult = await checkRateLimit(rateLimitKey, 20, 10 * 60);

    if (!rateLimitResult.allowed) {
      const retryAfterSeconds = rateLimitResult.retryAfterSec ?? 60;
      return NextResponse.json(
        {
          success: false,
          error: "Batas frekuensi upload tercapai. Silakan coba beberapa saat lagi.",
          code: "RATE_LIMIT_EXCEEDED",
        },
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Retry-After": String(retryAfterSeconds),
          },
        }
      );
    }

    // 4. Ekstraksi file dari multipart/form-data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Format request harus berupa multipart/form-data",
          code: "INVALID_FORM_DATA",
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const file = formData.get("file");
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        {
          success: false,
          error: "File gambar wajib dilampirkan pada field 'file'",
          code: "FILE_REQUIRED",
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Quick size pre-check sebelum buffering
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `Ukuran file (${(file.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas maksimal 2 MB`,
          code: "PAYLOAD_TOO_LARGE",
        },
        { status: 413, headers: corsHeaders }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const rawBuffer = Buffer.from(arrayBuffer);

    // 5. Validasi Magic Bytes & Sanitasi Sharp -> WebP
    const { processedBuffer, originalType } = await validateAndProcessImage(rawBuffer);

    // 6. Upload ke Vercel Blob store
    const uploadResult = await uploadProductImage(processedBuffer);

    // 7. Catat aksi upload ke audit_logs (tanpa buffer mentah)
    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get("user-agent");

    await recordAuditLog({
      userId: session.userId,
      action: "PRODUCT_IMAGE_UPLOAD",
      entityType: "product_image",
      entityId: uploadResult.imageKey,
      platform: session.platform,
      ipAddress,
      userAgent,
      metadata: {
        imageKey: uploadResult.imageKey,
        sizeBytes: processedBuffer.length,
        originalType,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Foto produk berhasil diunggah",
        data: uploadResult,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    if (error instanceof ImageValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
        },
        { status: error.statusCode, headers: corsHeaders }
      );
    }

    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json(
          {
            success: false,
            error: "Autentikasi diperlukan untuk mengunggah foto",
            code: "UNAUTHORIZED",
          },
          { status: 401, headers: corsHeaders }
        );
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json(
          {
            success: false,
            error: "Hanya Pemilik Usaha (Owner) yang berhak mengunggah foto produk",
            code: "FORBIDDEN",
          },
          { status: 403, headers: corsHeaders }
        );
      }
    }

    console.error("[Upload Product Image Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Terjadi kesalahan internal saat memproses upload foto",
        code: "INTERNAL_SERVER_ERROR",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
