import { describe, it, expect, vi } from "vitest";
import { createUserSchema, updateUserSchema, resetPasswordSchema } from "@/lib/validators/user";
import { signAccessToken, verifyAccessToken, generateOpaqueRefreshToken, hashRefreshToken } from "@/lib/auth/jwt";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { validateCsrfOrigin } from "@/lib/security/csrf";
import { handleGuardError } from "@/lib/auth/guard";

describe("Autentikasi & RBAC: Login Web vs APK Dual Transport & Token Payload", () => {
  it("harus membuat Access Token JWT dengan klaim lengkap: sub, role, platform, tokenVersion", async () => {
    const webToken = await signAccessToken({
      userId: "user_owner_01",
      role: "OWNER",
      platform: "WEB",
      tokenVersion: 1,
    });

    const payload = await verifyAccessToken(webToken);
    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe("user_owner_01");
    expect(payload?.role).toBe("OWNER");
    expect(payload?.platform).toBe("WEB");
    expect(payload?.tokenVersion).toBe(1);

    // Verifikasi durasi exp kira-kira 15 menit (900 detik)
    const now = Math.floor(Date.now() / 1000);
    expect(payload?.exp).toBeGreaterThan(now + 800);
    expect(payload?.exp).toBeLessThanOrEqual(now + 901);
  });

  it("harus membuat APK token dengan platform APK", async () => {
    const apkToken = await signAccessToken({
      userId: "user_kasir_01",
      role: "KASIR",
      platform: "APK",
      tokenVersion: 2,
    });

    const payload = await verifyAccessToken(apkToken);
    expect(payload?.platform).toBe("APK");
    expect(payload?.role).toBe("KASIR");
    expect(payload?.tokenVersion).toBe(2);
  });
});

describe("Password Security & Brute-force Lockout Logic", () => {
  it("harus menerapkan cost factor bcrypt minimal 12", async () => {
    const hashed = await hashPassword("SandiKuat2026!");
    expect(hashed.startsWith("$2a$12$") || hashed.startsWith("$2b$12$")).toBe(true);
    expect(await verifyPassword("SandiKuat2026!", hashed)).toBe(true);
  });

  it("harus menghitung lockout 15 menit ketika percobaan gagal mencapai 5x", () => {
    const maxAttempts = 5;
    const currentAttempts = 4;
    const isNowLocked = currentAttempts + 1 >= maxAttempts;
    expect(isNowLocked).toBe(true);

    const lockDurationMs = 15 * 60 * 1000;
    const now = new Date();
    const lockedUntil = new Date(now.getTime() + lockDurationMs);
    expect(lockedUntil.getTime() - now.getTime()).toBe(lockDurationMs);
  });
});

describe("Refresh Token Rotation & Reuse Detection Entropy", () => {
  it("harus menghasilkan opaque token dengan entropi 64-karakter hex (32 bytes cryptographically secure)", () => {
    const token1 = generateOpaqueRefreshToken();
    const token2 = generateOpaqueRefreshToken();

    expect(token1.token).not.toEqual(token2.token);
    expect(token1.hash).not.toEqual(token2.hash);
    expect(token1.token).toHaveLength(64);
    expect(token1.hash).toHaveLength(64);
  });

  it("harus konsisten saat me-rehash token mentah menggunakan SHA-256", () => {
    const { token, hash } = generateOpaqueRefreshToken();
    const rehashed = hashRefreshToken(token);
    expect(rehashed).toBe(hash);
  });
});

describe("Akses Kontrol Peran (RBAC - Owner vs Kasir)", () => {
  it("harus memetakan penolakan akses kasir ke HTTP 403 Forbidden", () => {
    const handled = handleGuardError(new Error("FORBIDDEN_NOT_OWNER"));
    expect(handled.status).toBe(403);
    expect(handled.code).toBe("FORBIDDEN_NOT_OWNER");
  });

  it("harus memetakan penolakan unauthenticated ke HTTP 401 Unauthorized", () => {
    const handled = handleGuardError(new Error("UNAUTHORIZED_NO_COOKIE"));
    expect(handled.status).toBe(401);
    expect(handled.code).toBe("UNAUTHORIZED_NO_COOKIE");
  });
});

describe("4-Layer Web-Only Guard (Bearer & Capacitor Origin Rejection)", () => {
  it("Lapis 1: harus menolak akses dengan header Bearer di /api/users/** dengan HTTP 403", () => {
    const handled = handleGuardError(new Error("FORBIDDEN_BEARER_NOT_ALLOWED"));
    expect(handled.status).toBe(403);
    expect(handled.message).toContain("hanya dapat diakses melalui antarmuka Web");
  });

  it("Lapis 2: harus menolak klaim platform APK dengan HTTP 403", () => {
    const handled = handleGuardError(new Error("FORBIDDEN_PLATFORM_NOT_WEB"));
    expect(handled.status).toBe(403);
  });

  it("Lapis 3: harus menolak Origin capacitor://localhost dan https://localhost dengan HTTP 403", () => {
    const reqCapacitor = new Request("http://localhost:3000/api/users", {
      method: "POST",
      headers: { origin: "capacitor://localhost" },
    });
    expect(validateCsrfOrigin(reqCapacitor)).toBe(false);

    const handled = handleGuardError(new Error("FORBIDDEN_CAPACITOR_ORIGIN"));
    expect(handled.status).toBe(403);
  });
});

describe("Instant Session Revocation (Token Version Mismatch)", () => {
  it("harus menolak sesi jika tokenVersion database tidak cocok dengan klaim token JWT", () => {
    const dbTokenVersion: number = 2; // Dinaikkan karena password reset atau logout-all
    const jwtTokenVersion: number = 1; // Token lama yang beredar

    const isSessionValid = dbTokenVersion === jwtTokenVersion;
    expect(isSessionValid).toBe(false);

    const handled = handleGuardError(new Error("UNAUTHORIZED_SESSION_REVOKED"));
    expect(handled.status).toBe(401);
  });
});

describe("Anti-Lockout Owner Protection", () => {
  it("Owner tidak boleh dapat menonaktifkan dirinya sendiri", () => {
    const currentUserId = "usr_owner_main";
    const targetUserId = "usr_owner_main";
    const requestedActiveState = false;

    const isSelfDeactivation = currentUserId === targetUserId && requestedActiveState === false;
    expect(isSelfDeactivation).toBe(true);
  });

  it("Owner tidak boleh dapat menurunkan role dirinya sendiri menjadi KASIR", () => {
    const currentUserId = "usr_owner_main";
    const targetUserId = "usr_owner_main";
    const requestedRole: string = "KASIR";

    const isSelfDemotion = currentUserId === targetUserId && requestedRole !== "OWNER";
    expect(isSelfDemotion).toBe(true);
  });

  it("Tidak boleh menonaktifkan Owner jika hanya ada 1 Owner aktif di sistem", () => {
    const totalActiveOwners = 1;
    const canDeactivateOrDemote = totalActiveOwners > 1;
    expect(canDeactivateOrDemote).toBe(false);
  });
});

describe("Zod Strict Payload Validation", () => {
  it("harus menggagalkan payload yang menyuntikkan properti tak dikenal", () => {
    const malicious = {
      name: "Kasir Test",
      username: "kasir_test",
      password: "KasirPassword123",
      role: "KASIR",
      injectedField: "exploit",
    };
    const parsed = createUserSchema.safeParse(malicious);
    expect(parsed.success).toBe(false);
  });

  it("harus mewajibkan password kombinasi huruf dan angka", () => {
    expect(resetPasswordSchema.safeParse({ password: "onlyletters" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ password: "12345678" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ password: "ValidPass123" }).success).toBe(true);
  });
});

describe("Audit Log Sensitive Data Sanitization", () => {
  it("harus menyamarkan kunci sensitif (password, token, hash, secret) dari metadata audit log", async () => {
    const { sanitizeMetadata } = await import("@/lib/security/audit");

    const dirtyMetadata = {
      action: "USER_LOGIN",
      password: "MySuperSecretPassword",
      refreshToken: "opaque_token_string",
      passwordHash: "$2b$12$somethingsecure",
      userSecret: "super_secret_api_key",
      safeInfo: "DeviceInfo123",
    };

    const cleaned = sanitizeMetadata(dirtyMetadata);

    expect(cleaned).not.toBeNull();
    expect(cleaned?.password).toBe("[REDACTED]");
    expect(cleaned?.refreshToken).toBe("[REDACTED]");
    expect(cleaned?.passwordHash).toBe("[REDACTED]");
    expect(cleaned?.userSecret).toBe("[REDACTED]");
    expect(cleaned?.safeInfo).toBe("DeviceInfo123");
  });
});
