import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/api/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  const headers = getCorsHeaders(origin);

  let isDatabaseHealthy = false;

  if (!process.env.DATABASE_URL) {
    isDatabaseHealthy = true;
  } else {
    try {
      await db.execute(sql`SELECT 1`);
      isDatabaseHealthy = true;
    } catch {
      isDatabaseHealthy = false;
    }
  }

  return NextResponse.json(
    {
      status: isDatabaseHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
    },
    {
      status: isDatabaseHealthy ? 200 : 503,
      headers,
    }
  );
}
