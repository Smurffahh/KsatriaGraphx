import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { handleGuardError } from "@/lib/auth/guard";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: Record<string, unknown>;
  details?: Record<string, string[]>;
}

export function jsonResponse<T>(
  data: T,
  status = 200,
  message?: string,
  meta?: Record<string, unknown>
) {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      meta,
    },
    { status }
  );
}

export function errorResponse(
  error: string,
  status = 400,
  meta?: Record<string, unknown>
) {
  return NextResponse.json(
    {
      success: false,
      error,
      meta,
    },
    { status }
  );
}

export function handleApiError(err: unknown) {
  if (err instanceof SyntaxError) {
    return errorResponse("Format JSON request tidak valid", 400, {
      code: "INVALID_JSON",
    });
  }

  if (err instanceof ZodError) {
    const flat = err.flatten();
    let firstMsg: string | undefined = flat.formErrors?.[0];
    if (!firstMsg) {
      const fieldErrors = flat.fieldErrors as Record<string, string[] | undefined>;
      const fieldKeys = Object.keys(fieldErrors);
      if (fieldKeys.length > 0) {
        firstMsg = fieldErrors[fieldKeys[0]]?.[0];
      }
    }
    const message = firstMsg ? `Validasi gagal: ${firstMsg}` : "Validasi data gagal";
    return NextResponse.json(
      {
        success: false,
        error: message,
        details: flat.fieldErrors,
      },
      { status: 400 }
    );
  }

  const guard = handleGuardError(err);
  if (guard.isHandled) {
    return errorResponse(guard.message, guard.status, { code: guard.code });
  }

  const errorObj = err as { message?: string; status?: number; name?: string; code?: string };
  const rawStatus = typeof errorObj?.status === "number" ? errorObj.status : 500;
  const status = rawStatus >= 400 && rawStatus <= 599 ? rawStatus : 500;

  if (status >= 500) {
    console.error("[API_INTERNAL_ERROR]", {
      status,
      name: errorObj?.name || (err instanceof Error ? err.name : "UnknownError"),
      code: errorObj?.code,
      message: errorObj?.message || (err instanceof Error ? err.message : String(err)),
    });
    return errorResponse("Terjadi kesalahan internal pada server", status);
  }

  const safeClientMessage = errorObj?.message?.trim() || "Permintaan tidak dapat diproses";
  return errorResponse(safeClientMessage, status);
}
