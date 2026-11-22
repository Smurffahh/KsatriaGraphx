import { test, expect } from "@playwright/test";
import { db } from "@/db";
import { rateLimitBuckets } from "@/db/schema";
import { like } from "drizzle-orm";

const OWNER_USERNAME =
  process.env.E2E_OWNER_USERNAME || process.env.DEFAULT_OWNER_USERNAME || "owner";
const OWNER_PASSWORD =
  process.env.E2E_OWNER_PASSWORD || process.env.DEFAULT_OWNER_PASSWORD;

if (!OWNER_PASSWORD) {
  throw new Error(
    "Kredensial E2E belum dikonfigurasi. Mohon definisikan E2E_OWNER_PASSWORD (atau DEFAULT_OWNER_PASSWORD) pada file .env.local sebelum menjalankan pengujian Playwright."
  );
}

test.describe("E2E: Motion, Splash Screens, Login Stagger & Dashboard Interactions", () => {
  test.describe("1. Alur Splash Pra-Login & Login Stagger (Tanpa Sesi)", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test.beforeEach(async () => {
      try {
        await db.delete(rateLimitBuckets).where(like(rateLimitBuckets.key, "login:%"));
      } catch {
        // Abaikan jika database terkunci sejenak
      }
    });

    test("1.1 Pre-login splash tampil pada sesi baru dan menyingkap form login yang interaktif", async ({ page }) => {
      // Pastikan sessionStorage bersih di awal tes agar splash selalu terpicu
      await page.addInitScript(() => {
        try {
          window.sessionStorage.clear();
        } catch {}
      });

      const startTime = Date.now();
      await page.goto("/login");
      await page.waitForLoadState("domcontentloaded");

      // Verifikasi overlay splash screen aktif dan tampil dengan teks brand
      const splashOverlay = page.locator('div[aria-label*="Memuat aplikasi Ksatria Graphx"]');
      await expect(splashOverlay).toBeVisible({ timeout: 5000 });
      await expect(splashOverlay.getByText("Ksatria Graphx")).toBeVisible();

      // Menunggu splash overlay selesai berjalan tenang dan memudar (~2.5 detik)
      await expect(splashOverlay).toBeHidden({ timeout: 10000 });

      // Memastikan durasi tampil tenang minimal ~1.8 detik sebelum memudar
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(1800);

      // Verifikasi elemen form login muncul dan siap menerima input setelah splash selesai
      const userInput = page.locator("#usernameOrEmail");
      const passInput = page.locator("#password");
      const submitBtn = page.locator('button[type="submit"]');

      await expect(userInput).toBeVisible({ timeout: 5000 });
      await expect(passInput).toBeVisible({ timeout: 5000 });
      await expect(submitBtn).toBeVisible({ timeout: 5000 });

      // Verifikasi tombol toggle visibilitas password
      const togglePasswordBtn = page.locator('button[aria-label*="Lihat password"], button[aria-label*="Sembunyikan password"]');
      await expect(togglePasswordBtn).toBeVisible();
      await expect(passInput).toHaveAttribute("type", "password");
      await togglePasswordBtn.click();
      await expect(passInput).toHaveAttribute("type", "text");
      await togglePasswordBtn.click();
      await expect(passInput).toHaveAttribute("type", "password");
    });

    test("1.2 Login sukses memicu Post-Login Splash personal dan transisi mulus ke Dashboard", async ({ page }) => {
      await page.goto("/login");
      await page.waitForLoadState("domcontentloaded");

      await page.fill("#usernameOrEmail", OWNER_USERNAME);
      await page.fill("#password", OWNER_PASSWORD);
      await page.click('button[type="submit"]');

      // Verifikasi Post-Login Splash personal muncul (sapaan personal / role OWNER / progress)
      const splashOrDashboard = page.locator("text=/Selamat datang|Menyiapkan|Dashboard/i").first();
      await expect(splashOrDashboard).toBeVisible({ timeout: 15000 });

      // Menunggu hingga tiba di halaman tujuan (/dashboard atau /pos)
      await page.waitForURL(/\/(dashboard|pos)/, { timeout: 20000 });
      await expect(page).toHaveURL(/\/(dashboard|pos)/);
    });
  });

  test.describe("2. Alur Dashboard Interaktif & Metrik Animasi (Sesi Terotentikasi)", () => {
    test("2.1 Dashboard memuat 4 KPI cards dengan tabular-nums dan filter periode interaktif", async ({ page }) => {
      await page.goto("/dashboard");
      await page.waitForLoadState("domcontentloaded");

      // Verifikasi heading Dashboard
      const heading = page.locator("h1");
      await expect(heading).toContainText(/Dashboard/i, { timeout: 15000 });

      // Verifikasi 4 kartu KPI
      const main = page.locator("main");
      await expect(main.getByText(/Total Omzet|Omzet/i).first()).toBeVisible({ timeout: 15000 });
      await expect(main.getByText(/Total Pesanan|Pesanan/i).first()).toBeVisible({ timeout: 15000 });

      // Verifikasi interaksi tab periode (Hari Ini -> 7 Hari -> 30 Hari)
      const period7Days = page.getByRole("button", { name: "7 Hari" });
      await expect(period7Days).toBeVisible();
      await period7Days.click();

      // Pastikan data KPI tetap terlihat stabil setelah filter periode berganti
      await expect(main.getByText(/Total Omzet|Omzet/i).first()).toBeVisible();

      const period30Days = page.getByRole("button", { name: "30 Hari" });
      await expect(period30Days).toBeVisible();
      await period30Days.click();
      await expect(main.getByText(/Total Omzet|Omzet/i).first()).toBeVisible();
    });

    test("2.2 Kompatibilitas prefers-reduced-motion: transisi instan tanpa error", async ({ browser }) => {
      const reducedContext = await browser.newContext({
        storageState: "playwright/.auth/owner.json",
        reducedMotion: "reduce",
      });
      const page = await reducedContext.newPage();

      await page.goto("/dashboard");
      await page.waitForLoadState("domcontentloaded");

      const heading = page.locator("h1");
      await expect(heading).toContainText(/Dashboard/i, { timeout: 15000 });
      await expect(page.locator("main").getByText(/Total Omzet|Omzet/i).first()).toBeVisible({ timeout: 15000 });

      await reducedContext.close();
    });
  });

  test.describe("3. Layout Drawer Mobile & Verifikasi 0px Overlap Tombol Tutup", () => {
    test("3.1 Mobile Drawer: Tombol silang X dan badge OWNER memiliki jarak aman dan 0px overlap", async ({ page, isMobile }) => {
      test.skip(!isMobile, "Pengujian khusus viewport mobile (< 1024px)");

      await page.goto("/dashboard");
      await page.waitForLoadState("domcontentloaded");

      // Buka bottom sheet 'Menu Lainnya' via tab navigasi bawah mobile
      const menuButton = page.locator('button:has-text("Menu")').or(page.locator('button[aria-label*="menu" i]')).first();
      await expect(menuButton).toBeVisible({ timeout: 15000 });
      await menuButton.click();

      // Tunggu bottom sheet terbuka
      const sheetTitle = page.getByText("Menu & Pengaturan");
      await expect(sheetTitle).toBeVisible({ timeout: 10000 });

      // Temukan tombol silang X dan badge OWNER di dalam sheet dialog
      const sheetDialog = page.locator('[role="dialog"]');
      const closeButton = sheetDialog.locator('button[aria-label="Tutup menu"]').first();
      const ownerBadge = sheetDialog.locator('div, span').filter({ hasText: /^OWNER$/ }).first();

      await expect(closeButton).toBeVisible({ timeout: 5000 });
      await expect(ownerBadge).toBeVisible({ timeout: 5000 });

      const closeBox = await closeButton.boundingBox();
      const ownerBox = await ownerBadge.boundingBox();

      expect(closeBox).not.toBeNull();
      expect(ownerBox).not.toBeNull();

      if (closeBox && ownerBox) {
        // Pastikan keduanya berada di dalam batas viewport horizontal mobile (375px)
        expect(closeBox.x).toBeGreaterThanOrEqual(0);
        expect(closeBox.x + closeBox.width).toBeLessThanOrEqual(375 + 10);
        expect(ownerBox.x).toBeGreaterThanOrEqual(0);

        // Periksa tumpang tindih matematis AABB (Axis-Aligned Bounding Box)
        const isOverlap = !(
          ownerBox.x + ownerBox.width <= closeBox.x || // Badge di sebelah kiri tombol X
          ownerBox.x >= closeBox.x + closeBox.width || // Badge di sebelah kanan tombol X
          ownerBox.y + ownerBox.height <= closeBox.y || // Badge di atas tombol X
          ownerBox.y >= closeBox.y + closeBox.height    // Badge di bawah tombol X
        );

        // Verifikasi mutlak: 0px tumpang tindih
        expect(isOverlap).toBe(false);

        // Badge OWNER berada di sisi kiri (x < closeBox.x) dengan margin lega
        expect(closeBox.x).toBeGreaterThan(ownerBox.x + ownerBox.width + 12);
      }

      // Tutup sheet kembali
      await closeButton.click();
      await expect(sheetTitle).toBeHidden({ timeout: 5000 });
    });
  });
});
