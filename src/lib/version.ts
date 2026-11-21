/**
 * Single Source of Truth for Application Versioning & Semantic Comparison.
 * PRD v1.1.0 (US-206)
 */

export const APP_VERSION =
  process.env.NEXT_PUBLIC_APP_VERSION || "1.0.3";

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
