import { NextResponse } from "next/server";
import { ZodError } from "zod";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: Record<string, unknown>;
  details?: Record<string, string[]>;
}

export function successResponse<T>(
  data: T,
  message?: string,
  meta?: Record<string, unknown>,
  status = 200
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

  const errorObj = err as { message?: string; status?: number };
  const status = typeof errorObj?.status === "number" ? errorObj.status : 500;
  const message = errorObj?.message || "Terjadi kesalahan pada server";
  return errorResponse(message, status);
}
