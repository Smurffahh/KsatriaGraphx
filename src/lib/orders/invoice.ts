import { sql } from "drizzle-orm";
import { invoiceSequences } from "@/db/schema";

export function getWibDateKey(date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date).replace(/-/g, "");
}

/**
 * Menghasilkan nomor nota unik secara atomik menggunakan PostgreSQL ON CONFLICT DO UPDATE.
 * Format: [PREFIX]-YYYYMMDD-XXXX (4 digit zero padded).
 */
export async function generateAtomicInvoiceNumber(
  tx: any,
  prefix = "KGX"
): Promise<{ invoiceNumber: string; dateKey: string; seq: number }> {
  const dateKey = getWibDateKey();
  const cleanPrefix = (prefix || "KGX").trim().toUpperCase();

  const [row] = await tx
    .insert(invoiceSequences)
    .values({ dateKey, lastSeq: 1 })
    .onConflictDoUpdate({
      target: invoiceSequences.dateKey,
      set: { lastSeq: sql`${invoiceSequences.lastSeq} + 1` },
    })
    .returning({ lastSeq: invoiceSequences.lastSeq });

  const seq = row?.lastSeq ?? 1;
  const paddedSeq = String(seq).padStart(4, "0");
  const invoiceNumber = `${cleanPrefix}-${dateKey}-${paddedSeq}`;

  return { invoiceNumber, dateKey, seq };
}
