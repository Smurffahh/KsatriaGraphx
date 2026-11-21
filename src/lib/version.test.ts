import { describe, it, expect } from "vitest";
import {
  APP_VERSION,
  formatVersionLabel,
  formatVersionBadge,
  compareSemver,
  isValidReleaseUrl,
  parseChangelogLines,
} from "./version";

describe("US-206: Application Versioning & Semantic Comparison Suite", () => {
  it("APP_VERSION harus terdefinisi dan mengikuti format semver", () => {
    expect(APP_VERSION).toBeDefined();
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/);
  });

  it("formatVersionLabel harus menghasilkan label ramah pengguna sesuai platform", () => {
    const webLabel = formatVersionLabel(false);
    expect(webLabel).toContain(`v${APP_VERSION}`);
    expect(webLabel).toContain("Web System");

    const apkLabel = formatVersionLabel(true);
    expect(apkLabel).toContain(`v${APP_VERSION}`);
    expect(apkLabel).toContain("Android APK");
  });

  it("formatVersionBadge harus menghasilkan badge ringkas untuk footer sidebar", () => {
    const webBadge = formatVersionBadge(false);
    expect(webBadge).toBe(`v${APP_VERSION} • Web`);

    const apkBadge = formatVersionBadge(true);
    expect(apkBadge).toBe(`v${APP_VERSION} • Android APK`);
  });

  it("compareSemver harus membandingkan major, minor, patch secara presisi", () => {
    // a > b
    expect(compareSemver("1.1.0", "1.0.3")).toBe(1);
    expect(compareSemver("2.0.0", "1.9.9")).toBe(1);
    expect(compareSemver("1.0.4", "1.0.3")).toBe(1);
    expect(compareSemver("v1.1.0", "1.0.3")).toBe(1);
    expect(compareSemver("v1.1.0", "v1.0.3")).toBe(1);

    // a < b
    expect(compareSemver("1.0.3", "1.1.0")).toBe(-1);
    expect(compareSemver("1.0.3", "2.0.0")).toBe(-1);
    expect(compareSemver("0.9.9", "1.0.0")).toBe(-1);
    expect(compareSemver("v1.0.0", "v1.0.1")).toBe(-1);

    // a == b
    expect(compareSemver("1.0.3", "1.0.3")).toBe(0);
    expect(compareSemver("v1.0.3", "1.0.3")).toBe(0);
    expect(compareSemver("v1.1.0", "V1.1.0")).toBe(0);
  });

  it("isValidReleaseUrl harus memvalidasi URL resmi dan menolak domain liar", () => {
    expect(
      isValidReleaseUrl(
        "https://github.com/Smurffahh/KsatriaGraphx/releases/tag/v1.1.0"
      )
    ).toBe(true);
    expect(
      isValidReleaseUrl(
        "https://github.com/Smurffahh/KsatriaGraphx/releases/download/v1.1.0/KsatriaGraphx-v1.1.0-release.apk"
      )
    ).toBe(true);

    // Domain berbahaya / spoofing
    expect(isValidReleaseUrl("https://malicious-site.com/apk.apk")).toBe(false);
    expect(isValidReleaseUrl("http://github.com/Smurffahh/KsatriaGraphx")).toBe(
      false
    );
    expect(isValidReleaseUrl("javascript:alert(1)")).toBe(false);
    expect(isValidReleaseUrl("")).toBe(false);
    expect(isValidReleaseUrl(null)).toBe(false);
  });

  it("parseChangelogLines harus membersihkan markdown dan mengembalikan baris yang aman", () => {
    const markdown = `
# Release Notes v1.1.0
---
- Perbaikan layout dashboard dan mode gelap
* Penambahan sistem in-app update
1. Optimasi performa render tabel
**Full Changelog**: https://github.com/Smurffahh/KsatriaGraphx/compare/v1.0.3...v1.1.0
    `;

    const lines = parseChangelogLines(markdown);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe("Perbaikan layout dashboard dan mode gelap");
    expect(lines[1]).toBe("Penambahan sistem in-app update");
    expect(lines[2]).toBe("Optimasi performa render tabel");
  });
});
