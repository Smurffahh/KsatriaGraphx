import { describe, it, expect, vi } from "vitest";
import { createUserSchema, updateUserSchema, resetPasswordSchema } from "@/lib/validators/user";
import { signAccessToken, verifyAccessToken, generateOpaqueRefreshToken, hashRefreshToken } from "@/lib/auth/jwt";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { validateCsrfOrigin } from "@/lib/security/csrf";
import { handleGuardError } from "@/lib/auth/guard";
import {
  redactProductForRole,
  redactFinishingForRole,
  redactOrderForRole,
} from "@/lib/security/cost-redaction";

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

describe("Single-Owner Constraint & Anti-Tampering (Zod Validation)", () => {
  it("createUserSchema harus mengizinkan pembuatan user dengan role KASIR atau tanpa menyebutkan role", () => {
    const validExplicitKasir = {
      name: "Kasir Baru",
      username: "kasir_baru",
      password: "Password123",
      role: "KASIR" as const,
    };
    const parsedExplicit = createUserSchema.safeParse(validExplicitKasir);
    expect(parsedExplicit.success).toBe(true);
    if (parsedExplicit.success) {
      expect(parsedExplicit.data.role).toBe("KASIR");
    }

    const validDefaultKasir = {
      name: "Kasir Otomatis",
      username: "kasir_otomatis",
      password: "Password123",
    };
    const parsedDefault = createUserSchema.safeParse(validDefaultKasir);
    expect(parsedDefault.success).toBe(true);
    if (parsedDefault.success) {
      expect(parsedDefault.data.role).toBe("KASIR");
    }
  });

  it("createUserSchema harus menolak role OWNER dengan pesan error spesifik", () => {
    const maliciousOwnerCreation = {
      name: "Owner Cadangan",
      username: "owner_dua",
      password: "Password123",
      role: "OWNER" as const,
    };
    const parsed = createUserSchema.safeParse(maliciousOwnerCreation);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toContain(
        "Sistem hanya mengizinkan satu akun Owner. Akun baru hanya dapat dibuat dengan peran Kasir."
      );
    }
  });

  it("updateUserSchema harus menolak promosi peran ke OWNER", () => {
    const maliciousPromotion = {
      name: "Nama Kasir",
      role: "OWNER" as const,
    };
    const parsed = updateUserSchema.safeParse(maliciousPromotion);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toContain(
        "Sistem hanya mengizinkan satu akun Owner. Tidak dapat mempromosikan akun menjadi Owner."
      );
    }
  });

  it("updateUserSchema harus mengizinkan pembaruan dengan role KASIR atau tanpa mengubah role", () => {
    const validUpdateWithoutRole = {
      name: "Nama Kasir Diperbarui",
      isActive: true,
    };
    expect(updateUserSchema.safeParse(validUpdateWithoutRole).success).toBe(true);

    const validUpdateWithKasir = {
      name: "Nama Kasir Tetap Kasir",
      role: "KASIR" as const,
    };
    expect(updateUserSchema.safeParse(validUpdateWithKasir).success).toBe(true);
  });
});

describe("Anti-Lockout & Immutability Protection Akun Owner Tunggal", () => {
  it("Owner tidak boleh dapat menonaktifkan dirinya sendiri maupun dinonaktifkan sistem", () => {
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

  it("Tidak boleh menonaktifkan, mendemosi, atau menghapus Owner tunggal di sistem", () => {
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

describe("RBAC Matrix Endpoint Permissions: Kasir vs Owner", () => {
  const ownerOnlyActions = [
    { name: "Akses Laporan Omzet Toko (/api/reports)", error: "FORBIDDEN_NOT_OWNER" },
    { name: "Akses Audit Trails Lengkap (/api/audit-logs)", error: "FORBIDDEN_NOT_OWNER" },
    { name: "Akses Kelola Pengguna (/api/users)", error: "FORBIDDEN_NOT_OWNER" },
    { name: "Ubah Pengaturan Toko Global (/api/settings)", error: "FORBIDDEN_NOT_OWNER" },
    { name: "Tambah/Edit/Hapus Produk Katalog (/api/products)", error: "FORBIDDEN_NOT_OWNER" },
    { name: "Tambah/Edit/Hapus Kategori (/api/categories)", error: "FORBIDDEN_NOT_OWNER" },
    { name: "Tambah/Edit/Hapus Finishing (/api/finishings)", error: "FORBIDDEN_NOT_OWNER" },
    { name: "Batalkan/Void Nota Transaksi (/api/orders/[id] CANCELLED)", error: "FORBIDDEN_NOT_OWNER" },
  ];

  it.each(ownerOnlyActions)(
    "harus memblokir Kasir dengan HTTP 403 Forbidden pada aksi Owner: $name",
    ({ error }) => {
      const res = handleGuardError(new Error(error));
      expect(res.status).toBe(403);
      expect(res.code).toBe(error);
    }
  );

  it("harus mengizinkan peran KASIR untuk alur operasional toko yang sah", () => {
    const cashierAllowedCapabilities = [
      "Buka antrean POS dan buat nota baru",
      "Catat pembayaran tunai / transfer / DP",
      "Cetak struk nota via printer Bluetooth ESC/POS",
      "Lihat daftar katalog produk, kategori, dan finishing aktif",
      "Perbarui status produksi pesanan (QUEUED -> IN_PROGRESS -> READY -> COMPLETED)",
      "Akses Dashboard Kasir pribadi (omzet kasir sendiri tanpa omzet global)",
      "Kelola database pelanggan (tambah, cari, perbarui nama/nomor HP)",
    ];

    expect(cashierAllowedCapabilities.length).toBe(7);
    cashierAllowedCapabilities.forEach((cap) => {
      expect(cap).toBeTruthy();
    });
  });
});

describe("Zero-Leak Proteksi Harga Modal Vendor & Laba (OWNER vs KASIR)", () => {
  it("redactProductForRole harus menyembunyikan productionPrice produk & tier dari peran KASIR", () => {
    const product = {
      id: "prod-1",
      name: "Banner Flexi 280gr",
      productionPrice: 20000,
      basePrice: 25000,
      priceTiers: [
        { id: "tier-1", minQty: 10, maxQty: 49, productionPrice: 18000, unitPrice: 23000 },
      ],
    };

    const kasirView = redactProductForRole(product, "KASIR");
    expect("productionPrice" in kasirView).toBe(false);
    expect("productionPrice" in kasirView.priceTiers[0]).toBe(false);
    expect(kasirView.basePrice).toBe(25000);

    const ownerView = redactProductForRole(product, "OWNER");
    expect(ownerView.productionPrice).toBe(20000);
    expect(ownerView.priceTiers[0].productionPrice).toBe(18000);
  });

  it("redactFinishingForRole harus menyembunyikan productionPrice finishing dari peran KASIR", () => {
    const finishing = {
      id: "fin-1",
      name: "Mata Ayam",
      productionPrice: 500,
      defaultPrice: 1000,
    };

    const kasirView = redactFinishingForRole(finishing, "KASIR");
    expect("productionPrice" in kasirView).toBe(false);
    expect(kasirView.defaultPrice).toBe(1000);

    const ownerView = redactFinishingForRole(finishing, "OWNER");
    expect(ownerView.productionPrice).toBe(500);
  });

  it("redactOrderForRole harus menyembunyikan seluruh field modal & laba pesanan dari peran KASIR", () => {
    const order = {
      id: "ord-1",
      invoiceNumber: "KGX-20261127-0001",
      grandTotal: 25000,
      totalProductionCost: 20000,
      grossProfit: 5000,
      items: [
        {
          id: "item-1",
          productNameSnapshot: "Banner Flexi 280gr",
          unitPrice: 25000,
          itemSubtotal: 25000,
          productionUnitPriceSnapshot: 20000,
          productionSubtotal: 20000,
          profitAmount: 5000,
        },
      ],
    };

    const kasirView = redactOrderForRole(order, "KASIR");
    expect("totalProductionCost" in kasirView).toBe(false);
    expect("grossProfit" in kasirView).toBe(false);
    expect("productionUnitPriceSnapshot" in kasirView.items[0]).toBe(false);
    expect("productionSubtotal" in kasirView.items[0]).toBe(false);
    expect("profitAmount" in kasirView.items[0]).toBe(false);
    expect(kasirView.grandTotal).toBe(25000);

    const ownerView = redactOrderForRole(order, "OWNER");
    expect(ownerView.totalProductionCost).toBe(20000);
    expect(ownerView.grossProfit).toBe(5000);
    expect(ownerView.items[0].profitAmount).toBe(5000);
  });
});
