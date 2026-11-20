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
    return NextResponse.json(
      {
        success: false,
        error: "Validasi data gagal",
        details: err.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const errorObj = err as { message?: string; status?: number };
  const status = typeof errorObj?.status === "number" ? errorObj.status : 500;
  const message = errorObj?.message || "Terjadi kesalahan pada server";
  return errorResponse(message, status);
}
