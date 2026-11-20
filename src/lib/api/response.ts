import { NextResponse } from "next/server";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: Record<string, unknown>;
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

export function errorResponse(error: string, status = 400, meta?: Record<string, unknown>) {
  return NextResponse.json(
    {
      success: false,
      error,
      meta,
    },
    { status }
  );
}
