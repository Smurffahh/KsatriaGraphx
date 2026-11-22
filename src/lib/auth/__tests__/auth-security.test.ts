import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../password";
import {
  signAccessToken,
  verifyAccessToken,
  generateOpaqueRefreshToken,
  hashRefreshToken,
} from "../jwt";
import { validateCsrfOrigin } from "@/lib/security/csrf";
import {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
} from "@/lib/validators/user";

describe("Password Hashing & Entropy Tests", () => {
  it("harus menghasilkan hash bcrypt valid dengan cost factor aman dan verifikasi sukses", async () => {
    const rawPassword = "AdminKsatria123!";
    const hashed = await hashPassword(rawPassword);

    expect(hashed).toBeDefined();
    expect(hashed.startsWith("$2a$12$") || hashed.startsWith("$2b$12$")).toBe(true);

    const isMatch = await verifyPassword(rawPassword, hashed);
    expect(isMatch).toBe(true);

    const isWrong = await verifyPassword("PasswordSalah123!", hashed);
    expect(isWrong).toBe(false);
  });
});

describe("Access Token & Opaque Refresh Token Tests", () => {
  it("harus menandatangani dan memverifikasi JWT access token 15 menit dengan klaim lengkap", async () => {
    const token = await signAccessToken({
      userId: "usr_test_123",
      role: "OWNER",
      platform: "WEB",
      tokenVersion: 1,
    });

    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3);

    const payload = await verifyAccessToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe("usr_test_123");
    expect(payload?.role).toBe("OWNER");
    expect(payload?.platform).toBe("WEB");
    expect(payload?.tokenVersion).toBe(1);
  });

  it("harus menolak JWT yang dimanipulasi", async () => {
    const token = await signAccessToken({
      userId: "usr_test_123",
      role: "KASIR",
      platform: "APK",
      tokenVersion: 1,
    });

    const parts = token.split(".");
    const tampered = `${parts[0]}.${parts[1]}x.${parts[2]}`;

    const verified = await verifyAccessToken(tampered);
    expect(verified).toBeNull();
  });

  it("harus menghasilkan opaque refresh token 32 bytes acak dan hash SHA-256 yang konsisten", () => {
    const { token, hash, expiresAt } = generateOpaqueRefreshToken();

    expect(token).toHaveLength(64); // 32 bytes hex = 64 characters
    expect(hash).toHaveLength(64); // SHA-256 hex = 64 characters
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

    const recomputedHash = hashRefreshToken(token);
    expect(recomputedHash).toBe(hash);
  });
});

describe("CSRF & Origin Guard Tests", () => {
  it("harus menolak request mutasi dengan origin Capacitor", () => {
    const reqCapacitor = new Request("http://localhost:3000/api/users", {
      method: "POST",
      headers: {
        origin: "capacitor://localhost",
      },
    });

    expect(validateCsrfOrigin(reqCapacitor)).toBe(false);
  });

  it("harus menolak request mutasi dengan origin tidak dikenal (attacker domain)", () => {
    const reqAttacker = new Request("http://localhost:3000/api/users", {
      method: "POST",
      headers: {
        origin: "https://evil-attacker-site.com",
      },
    });

    expect(validateCsrfOrigin(reqAttacker)).toBe(false);
  });

  it("harus mengizinkan request mutasi same-origin dari domain web yang sah", () => {
    const reqValid = new Request("http://localhost:3000/api/users", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
      },
    });

    expect(validateCsrfOrigin(reqValid)).toBe(true);
  });
});

describe("Zod Strict Validation & Anti-Tampering Tests", () => {
  it("harus menolak payload create user yang mengandung field ilegal / asing (.strict())", () => {
    const maliciousPayload = {
      name: "Kasir Baru",
      username: "kasir_baru",
      password: "KasirPassword123",
      role: "KASIR",
      isAdmin: true, // Ilegal
      tokenVersion: 999, // Ilegal
    };

    const result = createUserSchema.safeParse(maliciousPayload);
    expect(result.success).toBe(false);
  });

  it("harus memvalidasi kekuatan password (minimal 8 karakter huruf & angka)", () => {
    const weakOnlyLetters = {
      name: "Kasir Baru",
      username: "kasir_baru",
      password: "hanyahurufsaja",
      role: "KASIR",
    };
    expect(createUserSchema.safeParse(weakOnlyLetters).success).toBe(false);

    const weakOnlyNumbers = {
      name: "Kasir Baru",
      username: "kasir_baru",
      password: "1234567890",
      role: "KASIR",
    };
    expect(createUserSchema.safeParse(weakOnlyNumbers).success).toBe(false);

    const weakTooShort = {
      name: "Kasir Baru",
      username: "kasir_baru",
      password: "a1",
      role: "KASIR",
    };
    expect(createUserSchema.safeParse(weakTooShort).success).toBe(false);

    const strongValid = {
      name: "Kasir Baru",
      username: "kasir_baru",
      password: "KasirAman2026",
      role: "KASIR",
    };
    expect(createUserSchema.safeParse(strongValid).success).toBe(true);
  });

  it("harus menolak username dengan karakter spesial berbahaya", () => {
    const invalidUsername = {
      name: "Kasir XSS",
      username: "<script>alert(1)</script>",
      password: "KasirPassword123",
      role: "KASIR",
    };
    expect(createUserSchema.safeParse(invalidUsername).success).toBe(false);

    const validUsername = {
      name: "Kasir Valid",
      username: "kasir_utama_01",
      password: "KasirPassword123",
      role: "KASIR",
    };
    expect(createUserSchema.safeParse(validUsername).success).toBe(true);
  });

  it("harus memvalidasi skema update user dengan ketat", () => {
    const invalidUpdate = {
      name: "Nama Baru",
      unexpectedParam: "injected",
    };
    expect(updateUserSchema.safeParse(invalidUpdate).success).toBe(false);

    const validUpdate = {
      name: "Nama Diperbarui",
      role: "OWNER" as const,
      isActive: false,
    };
    expect(updateUserSchema.safeParse(validUpdate).success).toBe(true);
  });

  it("harus memvalidasi skema reset password", () => {
    expect(resetPasswordSchema.safeParse({ password: "Pendek" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ password: "PasswordBaru2026" }).success).toBe(true);
  });
});

describe("4-Layer Web-Only Guard Error Mapping Tests", () => {
  it("harus memetakan error guard ke status HTTP 403 Forbidden untuk pelanggaran platform & peran", async () => {
    const { handleGuardError } = await import("../guard");

    // Lapis 1: Bearer token ditolak
    const resBearer = handleGuardError(new Error("FORBIDDEN_BEARER_NOT_ALLOWED"));
    expect(resBearer.status).toBe(403);
    expect(resBearer.message).toContain("hanya dapat diakses melalui antarmuka Web");

    // Lapis 2: Platform bukan WEB
    const resPlatform = handleGuardError(new Error("FORBIDDEN_PLATFORM_NOT_WEB"));
    expect(resPlatform.status).toBe(403);

    // Lapis 3: Origin Capacitor
    const resCapacitor = handleGuardError(new Error("FORBIDDEN_CAPACITOR_ORIGIN"));
    expect(resCapacitor.status).toBe(403);
    expect(resCapacitor.message).toContain("tidak diizinkan melalui aplikasi Android");

    // Lapis 4: Bukan OWNER
    const resRole = handleGuardError(new Error("FORBIDDEN_NOT_OWNER"));
    expect(resRole.status).toBe(403);
    expect(resRole.message).toContain("Hanya pemilik usaha");
  });

  it("harus memetakan error sesi ke status HTTP 401 Unauthorized", async () => {
    const { handleGuardError } = await import("../guard");

    const resNoCookie = handleGuardError(new Error("UNAUTHORIZED_NO_COOKIE"));
    expect(resNoCookie.status).toBe(401);

    const resRevoked = handleGuardError(new Error("UNAUTHORIZED_SESSION_REVOKED"));
    expect(resRevoked.status).toBe(401);
  });
});
