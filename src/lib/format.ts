/** Memformat nominal bilangan bulat ke string mata uang Rupiah tanpa desimal. */
export function formatRupiah(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `Rp ${safe.toLocaleString("id-ID")}`;
}

/** Memformat stempel waktu menjadi format ringkas Bahasa Indonesia (misal: 27 Nov 2026, 21.30). */
export function formatShortDateTimeId(value: string | Date): string {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Memformat stempel waktu menjadi tanggal lengkap Bahasa Indonesia. */
export function formatLongDateTimeId(value: string | Date): string {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
