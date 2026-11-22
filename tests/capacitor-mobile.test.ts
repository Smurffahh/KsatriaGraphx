import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import { getCorsHeaders } from "../src/lib/api/cors";
import { resolveApiUrl } from "../src/lib/api/client";
import { secureStorage } from "../src/lib/auth/secure-storage";

describe("Capacitor Android Shell, Secure Storage & Bluetooth Suite (US-012, US-016)", () => {
  describe("1. Static Check: Android Manifest Hardening & Capacitor Config", () => {
    it("AndroidManifest.xml harus mengandung proteksi allowBackup=false dan usesCleartextTraffic=false", () => {
      const manifestPath = "android/app/src/main/AndroidManifest.xml";
      expect(fs.existsSync(manifestPath)).toBe(true);

      const content = fs.readFileSync(manifestPath, "utf-8");
      expect(content).toContain('android:allowBackup="false"');
      expect(content).toContain('android:usesCleartextTraffic="false"');
    });

    it("AndroidManifest.xml harus mendeklarasikan perizinan Bluetooth thermal untuk Android 12+ dan legacy", () => {
      const manifestPath = "android/app/src/main/AndroidManifest.xml";
      const content = fs.readFileSync(manifestPath, "utf-8");

      expect(content).toContain("android.permission.BLUETOOTH");
      expect(content).toContain("android.permission.BLUETOOTH_ADMIN");
      expect(content).toContain("android.permission.ACCESS_FINE_LOCATION");
      expect(content).toContain("android.permission.BLUETOOTH_SCAN");
      expect(content).toContain('android:usesPermissionFlags="neverForLocation"');
      expect(content).toContain("android.permission.BLUETOOTH_CONNECT");
    });

    it("capacitor.config.ts harus terkonfigurasi dengan appId id.ksatriagraphx.app dan androidScheme https", () => {
      const configPath = "capacitor.config.ts";
      expect(fs.existsSync(configPath)).toBe(true);

      const content = fs.readFileSync(configPath, "utf-8");
      expect(content).toContain('"id.ksatriagraphx.app"');
      expect(content).toContain('"Ksatria Graphx"');
      expect(content).toContain('"out"');
      expect(content).toContain('"https"');
    });

    it("android/app/build.gradle harus mengaktifkan R8/ProGuard (minifyEnabled true) pada build release", () => {
      const gradlePath = "android/app/build.gradle";
      expect(fs.existsSync(gradlePath)).toBe(true);

      const content = fs.readFileSync(gradlePath, "utf-8");
      expect(content).toContain("minifyEnabled true");
      expect(content).toContain("shrinkResources true");
    });

    it("android/app/proguard-rules.pro harus memproteksi kelas plugin ThermalPrinter, Capacitor, dan SecureStorage", () => {
      const proguardPath = "android/app/proguard-rules.pro";
      expect(fs.existsSync(proguardPath)).toBe(true);

      const content = fs.readFileSync(proguardPath, "utf-8");
      expect(content).toContain("-keep public class * extends com.getcapacitor.Plugin");
      expect(content).toContain("-keep @com.getcapacitor.annotation.CapacitorPlugin class *");
      expect(content).toContain("-keep class com.capacitorjs.plugins.**");
      expect(content).toContain("-keep class com.aparajita.capacitor.**");
      expect(content).toContain("-keep class id.ksatriagraphx.app.**");
    });

    it("MainActivity.java harus mendaftarkan ThermalPrinterPlugin sebelum super.onCreate", () => {
      const mainActivityPath = "android/app/src/main/java/id/ksatriagraphx/app/MainActivity.java";
      expect(fs.existsSync(mainActivityPath)).toBe(true);

      const content = fs.readFileSync(mainActivityPath, "utf-8");
      const registerIndex = content.indexOf("registerPlugin(ThermalPrinterPlugin.class);");
      const superIndex = content.indexOf("super.onCreate(savedInstanceState);");

      expect(registerIndex).toBeGreaterThan(-1);
      expect(superIndex).toBeGreaterThan(-1);
      expect(registerIndex).toBeLessThan(superIndex);
    });

    it("file_paths.xml harus memetakan cache-path dan external-path untuk FileProvider", () => {
      const filePath = "android/app/src/main/res/xml/file_paths.xml";
      expect(fs.existsSync(filePath)).toBe(true);

      const content = fs.readFileSync(filePath, "utf-8");
      expect(content).toContain("<cache-path");
      expect(content).toContain("<external-path");
      expect(content).toContain("<external-cache-path");
      expect(content).toContain("<files-path");
    });
  });

  describe("2. CORS Allowlist & Origin Security", () => {
    it("harus mengizinkan origin https://localhost dan capacitor://localhost untuk WebView Android", () => {
      const capHeaders = getCorsHeaders("capacitor://localhost") as Record<string, string>;
      expect(capHeaders["Access-Control-Allow-Origin"]).toBe("capacitor://localhost");
      expect(capHeaders["Access-Control-Allow-Credentials"]).toBe("true");

      const httpsHeaders = getCorsHeaders("https://localhost") as Record<string, string>;
      expect(httpsHeaders["Access-Control-Allow-Origin"]).toBe("https://localhost");
      expect(httpsHeaders["Access-Control-Allow-Credentials"]).toBe("true");
    });

    it("harus menolak origin tidak dikenal / jahat dan tidak mengembalikan wildcard * saat credentials aktif", () => {
      const evilHeaders = getCorsHeaders("https://evil-attacker.com") as Record<string, string>;
      expect(evilHeaders["Access-Control-Allow-Origin"]).not.toBe("https://evil-attacker.com");
      expect(evilHeaders["Access-Control-Allow-Origin"]).not.toBe("*");
      expect(evilHeaders["Access-Control-Allow-Origin"]).toBeUndefined();
    });
  });

  describe("3. Base URL Resolution (Web vs APK)", () => {
    const originalEnv = process.env.NEXT_PUBLIC_API_BASE_URL;

    beforeEach(() => {
      process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.ksatriagraphx.com";
    });

    afterEach(() => {
      process.env.NEXT_PUBLIC_API_BASE_URL = originalEnv;
    });

    it("pada platform Web (isNative = false), harus menggunakan path relatif", () => {
      const url = resolveApiUrl("/api/orders", false);
      expect(url).toBe("/api/orders");
    });

    it("pada platform APK (isNative = true), harus meresolusi ke NEXT_PUBLIC_API_BASE_URL", () => {
      const url = resolveApiUrl("/api/orders", true);
      expect(url).toBe("https://api.ksatriagraphx.com/api/orders");
    });

    it("jika endpoint sudah berupa full URL http/https, tidak boleh diduplikasi", () => {
      const fullUrl = "https://other-service.com/api/test";
      expect(resolveApiUrl(fullUrl, true)).toBe(fullUrl);
      expect(resolveApiUrl(fullUrl, false)).toBe(fullUrl);
    });
  });

  describe("4. Secure Storage Web Isolation (No-Op on Web)", () => {
    it("pada platform Web, secureStorage harus bersifat no-op dan tidak menyimpan token di storage client", async () => {
      // Mock window global
      await secureStorage.saveTokens({
        accessToken: "sample-access-token",
        refreshToken: "sample-refresh-token",
      });

      const access = await secureStorage.getAccessToken();
      const refresh = await secureStorage.getRefreshToken();

      expect(access).toBeNull();
      expect(refresh).toBeNull();

      // Clear tokens harus berjalan tanpa error
      await expect(secureStorage.clearTokens()).resolves.toBeUndefined();
    });
  });
});
