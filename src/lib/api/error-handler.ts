import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: "Validasi data gagal",
        details: error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const message = error instanceof Error ? error.message : "Terjadi kesalahan internal pada server";

  const isDev = process.env.NODE_ENV === "development";

  return NextResponse.json(
    {
      success: false,
      error: "Terjadi kesalahan pada sistem. Silakan coba beberapa saat lagi.",
      ...(isDev ? { debugMessage: message } : {}),
    },
    { status: 500 }
  );
}
