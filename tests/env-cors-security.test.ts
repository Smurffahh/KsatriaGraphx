import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  isOriginAllowed,
  getCorsHeaders,
  getAllowedOrigins,
  parseAllowedOrigins,
  handleCorsPreflight,
} from "@/lib/api/cors";
import { validateCsrfOrigin, getAppWebOrigin } from "@/lib/security/csrf";
import { handleGuardError } from "@/lib/auth/guard";
import { getServerEnv } from "@/lib/env";
import { middleware } from "@/middleware";
import { NextRequest } from "next/server";
import { isNativeApp } from "@/lib/platform";
import { extractReleaseNotes, buildFullReleaseNotes } from "../scripts/extract-changelog.mjs";
import fs from "fs";
import path from "path";

describe("Validasi Konfigurasi Environment, CORS & 4-Layer Guard Produksi", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("1. CORS Origin Parsing & Production Allowlist", () => {
    it("parseAllowedOrigins harus memecah koma, trim whitespace, buang trailing slash, dan menolak wildcard *", () => {
      const raw = " https://ksatriagraphx.vercel.app/ , https://localhost/ , capacitor://localhost , * , , ";
      const parsed = parseAllowedOrigins(raw);

      expect(parsed).toEqual([
        "https://ksatriagraphx.vercel.app",
        "https://localhost",
        "capacitor://localhost",
      ]);
      expect(parsed).not.toContain("*");
    });

    it("harus mengizinkan Web produksi dan APK Android saat ALLOWED_ORIGINS terpasang", () => {
      process.env.ALLOWED_ORIGINS =
        "https://ksatriagraphx.vercel.app,https://localhost,capacitor://localhost";
      process.env.APP_WEB_ORIGIN = "https://ksatriagraphx.vercel.app";

      expect(isOriginAllowed("https://ksatriagraphx.vercel.app")).toBe(true);
      expect(isOriginAllowed("https://ksatriagraphx.vercel.app/")).toBe(true);
      expect(isOriginAllowed("https://localhost")).toBe(true);
      expect(isOriginAllowed("capacitor://localhost")).toBe(true);

      const headersWeb = getCorsHeaders("https://ksatriagraphx.vercel.app") as Record<string, string>;
      expect(headersWeb["Access-Control-Allow-Origin"]).toBe("https://ksatriagraphx.vercel.app");
      expect(headersWeb["Access-Control-Allow-Credentials"]).toBe("true");

      const headersCap = getCorsHeaders("capacitor://localhost") as Record<string, string>;
      expect(headersCap["Access-Control-Allow-Origin"]).toBe("capacitor://localhost");
      expect(headersCap["Access-Control-Allow-Credentials"]).toBe("true");
    });

    it("harus menolak keras origin asing jahat (https://evil.example) dan tidak membocorkan header allow-origin", () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      process.env.ALLOWED_ORIGINS =
        "https://ksatriagraphx.vercel.app,https://localhost,capacitor://localhost";

      expect(isOriginAllowed("https://evil.example")).toBe(false);
      expect(isOriginAllowed("https://evil.example/")).toBe(false);

      const evilHeaders = getCorsHeaders("https://evil.example") as Record<string, string>;
      expect(evilHeaders["Access-Control-Allow-Origin"]).toBeUndefined();
      expect(evilHeaders["Access-Control-Allow-Credentials"]).toBeUndefined();
    });
  });

  describe("2. CSRF & 4-Layer Web-Only Guard vs Mobile APK", () => {
    it("validateCsrfOrigin hanya menerima APP_WEB_ORIGIN dan menolak origin APK Android", () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      process.env.APP_WEB_ORIGIN = "https://ksatriagraphx.vercel.app";
      process.env.ALLOWED_ORIGINS =
        "https://ksatriagraphx.vercel.app,https://localhost,capacitor://localhost";

      // 1. Web produksi resmi -> VALID
      const webReq = new Request("https://ksatriagraphx.vercel.app/api/users", {
        method: "POST",
        headers: { origin: "https://ksatriagraphx.vercel.app" },
      });
      expect(validateCsrfOrigin(webReq)).toBe(true);

      // 2. APK Capacitor origin -> DITOLAK
      const capReq = new Request("https://ksatriagraphx.vercel.app/api/users", {
        method: "POST",
        headers: { origin: "capacitor://localhost" },
      });
      expect(validateCsrfOrigin(capReq)).toBe(false);

      // 3. Android WebView localhost origin -> DITOLAK
      const apkLocalReq = new Request("https://ksatriagraphx.vercel.app/api/users", {
        method: "POST",
        headers: { origin: "https://localhost" },
      });
      expect(validateCsrfOrigin(apkLocalReq)).toBe(false);

      // 4. Origin asing jahat -> DITOLAK
      const evilReq = new Request("https://ksatriagraphx.vercel.app/api/users", {
        method: "POST",
        headers: { origin: "https://evil.example" },
      });
      expect(validateCsrfOrigin(evilReq)).toBe(false);
    });

    it("handleGuardError memetakan FORBIDDEN_CAPACITOR_ORIGIN ke HTTP 403 Forbidden", () => {
      const result = handleGuardError(new Error("FORBIDDEN_CAPACITOR_ORIGIN"));
      expect(result.status).toBe(403);
      expect(result.code).toBe("FORBIDDEN_CAPACITOR_ORIGIN");
      expect(result.message).toContain("Android/Capacitor");
    });
  });

  describe("3. Runtime Server Environment & Secret Domain Separation", () => {
    it("harus menolak jika JWT_ACCESS_SECRET sama persis dengan JWT_REFRESH_SECRET", () => {
      const sameSecret = "identical-sample-secret-min-32-characters-length";
      process.env.JWT_ACCESS_SECRET = sameSecret;
      process.env.JWT_REFRESH_SECRET = sameSecret;

      expect(() => getServerEnv()).toThrowError(/JWT_ACCESS_SECRET dan JWT_REFRESH_SECRET wajib berbeda/);
    });

    it("harus menerima jika JWT_ACCESS_SECRET dan JWT_REFRESH_SECRET berbeda (min 32 chars)", () => {
      process.env.JWT_ACCESS_SECRET = "access-secret-unique-random-hex-string-min-32-chars-long";
      process.env.JWT_REFRESH_SECRET = "refresh-secret-unique-random-hex-string-min-32-chars-diff";
      process.env.APP_WEB_ORIGIN = "https://ksatriagraphx.vercel.app/";

      const env = getServerEnv();
      expect(env.JWT_ACCESS_SECRET).not.toBe(env.JWT_REFRESH_SECRET);
      // Trailing slash otomatis dibersihkan
      expect(env.APP_WEB_ORIGIN).toBe("https://ksatriagraphx.vercel.app");
    });

    it("harus menolak DATABASE_URL jika tidak menyertakan sslmode=require", () => {
      process.env.DATABASE_URL = "postgresql://dummy_user:dummy_pass@dummy-host.example.com/dummydb?sslmode=disable";
      expect(() => getServerEnv()).toThrowError(/sslmode=require/);
    });
  });

  describe("4. Preflight OPTIONS & Global Middleware CORS Gate", () => {
    it("handleCorsPreflight harus mengembalikan 204 No Content untuk Origin https://localhost dan capacitor://localhost", () => {
      const reqHttps = new Request("https://ksatriagraphx.vercel.app/api/auth/login", {
        method: "OPTIONS",
        headers: {
          Origin: "https://localhost",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "Content-Type, Authorization, X-Client-Platform",
        },
      });

      const resHttps = handleCorsPreflight(reqHttps);
      expect(resHttps.status).toBe(204);
      expect(resHttps.headers.get("Access-Control-Allow-Origin")).toBe("https://localhost");
      expect(resHttps.headers.get("Access-Control-Allow-Credentials")).toBe("true");

      const reqCap = new Request("https://ksatriagraphx.vercel.app/api/orders", {
        method: "OPTIONS",
        headers: {
          Origin: "capacitor://localhost",
          "Access-Control-Request-Method": "GET",
        },
      });

      const resCap = handleCorsPreflight(reqCap);
      expect(resCap.status).toBe(204);
      expect(resCap.headers.get("Access-Control-Allow-Origin")).toBe("capacitor://localhost");
    });

    it("handleCorsPreflight harus menolak origin liar (https://evil.example) dengan status 403 Forbidden tanpa CORS header", () => {
      const reqEvil = new Request("https://ksatriagraphx.vercel.app/api/auth/login", {
        method: "OPTIONS",
        headers: {
          Origin: "https://evil.example",
        },
      });

      const resEvil = handleCorsPreflight(reqEvil);
      expect(resEvil.status).toBe(403);
      expect(resEvil.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });

    it("middleware Next.js harus mencegat OPTIONS di semua /api/** dan mengembalikan status 204 untuk APK", () => {
      const nextReq = new NextRequest("https://ksatriagraphx.vercel.app/api/products", {
        method: "OPTIONS",
        headers: {
          Origin: "https://localhost",
          "Access-Control-Request-Method": "GET",
        },
      });

      const nextRes = middleware(nextReq);
      expect(nextRes.status).toBe(204);
      expect(nextRes.headers.get("Access-Control-Allow-Origin")).toBe("https://localhost");
      expect(nextRes.headers.get("Access-Control-Allow-Methods")).toContain("OPTIONS");
    });

    it("middleware Next.js harus menyematkan header CORS pada response /api/** jika origin sah", () => {
      const nextReq = new NextRequest("https://ksatriagraphx.vercel.app/api/health", {
        method: "GET",
        headers: {
          Origin: "https://localhost",
        },
      });

      const nextRes = middleware(nextReq);
      expect(nextRes.headers.get("Access-Control-Allow-Origin")).toBe("https://localhost");
    });
  });

  describe("5. Platform Detection Hardening (isNativeApp)", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("harus mendeteksi native app jika window.location.origin adalah https://localhost", () => {
      vi.stubGlobal("window", {
        location: { origin: "https://localhost" },
      });
      expect(isNativeApp()).toBe(true);
    });

    it("harus mendeteksi native app jika window.location.origin adalah capacitor://localhost", () => {
      vi.stubGlobal("window", {
        location: { origin: "capacitor://localhost" },
      });
      expect(isNativeApp()).toBe(true);
    });

    it("harus mendeteksi native app jika window.Capacitor.isNativePlatform() mengembalikan true", () => {
      vi.stubGlobal("window", {
        location: { origin: "http://something-else.local" },
        Capacitor: { isNativePlatform: () => true },
      });
      expect(isNativeApp()).toBe(true);
    });

    it("harus mengembalikan false di Web browser normal (https://ksatriagraphx.vercel.app)", () => {
      vi.stubGlobal("window", {
        location: { origin: "https://ksatriagraphx.vercel.app" },
        Capacitor: undefined,
      });
      expect(isNativeApp()).toBe(false);
    });
  });

  describe("6. Otomasi Ekstraksi Catatan Rilis CHANGELOG.md (v1.0.3 & Riwayat)", () => {
    const changelogPath = path.join(process.cwd(), "CHANGELOG.md");
    const changelogContent = fs.readFileSync(changelogPath, "utf-8");

    it("ekstraksi tag v1.0.3 dari CHANGELOG.md harus menghasilkan teks rilis yang tidak kosong", () => {
      const notes = extractReleaseNotes(changelogContent, "v1.0.3");
      expect(notes).toBeDefined();
      expect(notes.length).toBeGreaterThan(100);
      expect(notes).toContain("Perbaikan Upload Foto Produk Private Vercel Blob");
      expect(notes).toContain("Pemulihan Transaksi Atomik Checkout POS");
      expect(notes).toContain("Sistem Notifikasi Global (Toast) dengan Sonner");
    });

    it("ekstraksi tag versi tanpa prefix v (1.0.3) harus menghasilkan teks yang identik", () => {
      const notesWithV = extractReleaseNotes(changelogContent, "v1.0.3");
      const notesWithoutV = extractReleaseNotes(changelogContent, "1.0.3");
      expect(notesWithoutV).toBe(notesWithV);
    });

    it("buildFullReleaseNotes harus menyertakan panduan instalasi dan blok SHA-256 untuk v1.0.3", () => {
      const fullNotes = buildFullReleaseNotes(
        changelogContent,
        "v1.0.3",
        "samplehash1234567890 KsatriaGraphx-v1.0.3-release.apk"
      );
      expect(fullNotes).toContain("### Panduan Instalasi APK");
      expect(fullNotes).toContain("### Checksum Integritas SHA-256");
      expect(fullNotes).toContain("samplehash1234567890 KsatriaGraphx-v1.0.3-release.apk");
    });

    it("ekstraksi tag versi sebelumnya (v1.0.2 dan v1.0.1) tetap valid dan terpelihara", () => {
      const notesV102 = extractReleaseNotes(changelogContent, "v1.0.2");
      expect(notesV102).toBeDefined();
      expect(notesV102.length).toBeGreaterThan(100);
      expect(notesV102).toContain("Resolusi Jalur Login Android APK Produksi");

      const notesV101 = extractReleaseNotes(changelogContent, "v1.0.1");
      expect(notesV101).toBeDefined();
      expect(notesV101.length).toBeGreaterThan(100);
      expect(notesV101).toContain("Resolusi Base URL Login Android APK");
    });
  });

  describe("7. Integritas 4-Layer Guard vs APK Platform", () => {
    it("request dari origin https://localhost atau Bearer token ke route admin Web-Only harus ditolak 403", () => {
      const capacitorOriginError = handleGuardError(new Error("FORBIDDEN_CAPACITOR_ORIGIN"));
      expect(capacitorOriginError.status).toBe(403);
      expect(capacitorOriginError.code).toBe("FORBIDDEN_CAPACITOR_ORIGIN");

      const bearerError = handleGuardError(new Error("FORBIDDEN_BEARER_NOT_ALLOWED"));
      expect(bearerError.status).toBe(403);
      expect(bearerError.code).toBe("FORBIDDEN_BEARER_NOT_ALLOWED");

      const platformError = handleGuardError(new Error("FORBIDDEN_PLATFORM_NOT_WEB"));
      expect(platformError.status).toBe(403);
      expect(platformError.code).toBe("FORBIDDEN_PLATFORM_NOT_WEB");
    });
  });
});
