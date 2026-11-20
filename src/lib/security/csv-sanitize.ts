/**
 * Modul Sanitasi CSV Anti-Formula Injection (RFC 4180 Compliant).
 * Mencegah eksekusi rumus arbitrer di Microsoft Excel, LibreOffice Calc, dan Google Sheets.
 */

const DANGEROUS_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

/**
 * Membersihkan satu sel nilai CSV dari potensi eksekusi formula injection.
 * Jika nilai diawali oleh '=', '+', '-', '@', '\t', atau '\r', beri prefix tanda kutip tunggal (').
 * Karakter tanda kutip ganda (") digandakan ("") dan seluruh teks dibungkus dalam ("").
 */
export function sanitizeCsvCell(val: string | number | null | undefined): string {
  if (val === null || val === undefined) {
    return '""';
  }

  let str = String(val);

  // Periksa apakah diawali karakter formula injection
  const firstChar = str.charAt(0);
  if (DANGEROUS_PREFIXES.includes(firstChar)) {
    str = `'${str}`;
  }

  // Escape tanda kutip ganda RFC 4180
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Membentuk string CSV lengkap dengan UTF-8 BOM (\uFEFF) untuk kompatibilitas Windows Excel.
 */
export function buildSafeCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][]
): string {
  const bom = "\uFEFF";
  const headerLine = headers.map(sanitizeCsvCell).join(",");
  const rowLines = rows.map((row) => row.map(sanitizeCsvCell).join(","));

  return `${bom}${headerLine}\r\n${rowLines.join("\r\n")}\r\n`;
}
