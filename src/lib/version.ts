/**
 * Single Source of Truth for Application Versioning & Semantic Comparison.
 */

export const APP_VERSION =
  process.env.NEXT_PUBLIC_APP_VERSION || "1.3.4";

export interface AppVersionResponse {
  currentServerVersion: string;
  latestVersion: string;
  tagName: string;
  title: string;
  publishedAt: string | null;
  changelogLines: string[];
  downloadUrl: string | null;
  releaseUrl: string;
  hasUpdate: boolean;
  source: "github" | "fallback" | "server-fallback";
  serverVersion?: string;
}

/**
 * Format label versi lengkap dengan platform.
 * Contoh: "Ksatria Graphx v1.0.3 • Web System"
 */
export function formatVersionLabel(isNative: boolean = false): string {
  const platformLabel = isNative ? "Android APK" : "Web System";
  return `Ksatria Graphx v${APP_VERSION} • ${platformLabel}`;
}

/**
 * Format badge versi ringkas untuk sidebar / footer.
 * Contoh: "v1.0.3 • Web"
 */
export function formatVersionBadge(isNative: boolean = false): string {
  const platformLabel = isNative ? "Android APK" : "Web";
  return `v${APP_VERSION} • ${platformLabel}`;
}

/**
 * Membandingkan dua string semver (misal "1.1.0" vs "1.0.3" atau "v1.2.0" vs "v1.1.5").
 * Return:
 *   1  jika a > b (a lebih baru dari b)
 *  -1  jika a < b (a lebih lama dari b)
 *   0  jika a == b
 */
export function compareSemver(a: string, b: string): number {
  const cleanA = a.replace(/^[vV]/, "").trim();
  const cleanB = b.replace(/^[vV]/, "").trim();

  const partsA = cleanA.split(".").map((n) => parseInt(n, 10) || 0);
  const partsB = cleanB.split(".").map((n) => parseInt(n, 10) || 0);

  const maxLen = Math.max(partsA.length, partsB.length, 3);

  for (let i = 0; i < maxLen; i++) {
    const valA = partsA[i] ?? 0;
    const valB = partsB[i] ?? 0;

    if (valA > valB) return 1;
    if (valA < valB) return -1;
  }

  return 0;
}

/**
 * Validasi apakah URL berasal dari repository resmi KsatriaGraphx di GitHub.
 * Mencegah Open Redirect dan pemalsuan tautan unduhan APK.
 */
export function isValidReleaseUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    if (
      parsed.hostname === "github.com" &&
      parsed.pathname.startsWith("/Smurffahh/KsatriaGraphx/")
    ) {
      return true;
    }
    // GitHub release assets download CDN (objects.githubusercontent.com)
    if (
      parsed.hostname === "objects.githubusercontent.com" &&
      parsed.pathname.includes("Smurffahh/KsatriaGraphx")
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Mengurai catatan rilis markdown menjadi baris-baris poin yang rapi dan aman (anti-XSS).
 */
export function parseChangelogLines(
  rawBody: string | null | undefined,
  maxLines: number = 10
): string[] {
  if (!rawBody) return [];

  const lines = rawBody
    .split(/\r?\n/)
    .map((l) => l.trim())
    // Buang baris kosong, header markdown, atau divider horizontal
    .filter(
      (l) =>
        l.length > 0 &&
        !l.startsWith("#") &&
        !l.startsWith("---") &&
        !l.startsWith("===") &&
        !l.toLowerCase().includes("full changelog")
    )
    // Bersihkan prefix markdown bullet seperti "- ", "* ", "1. "
    .map((l) => l.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "").trim())
    .filter((l) => l.length > 0);

  return lines.slice(0, maxLines);
}
