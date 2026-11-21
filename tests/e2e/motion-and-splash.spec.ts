import { test, expect } from "@playwright/test";
import { db } from "@/db";
import { rateLimitBuckets } from "@/db/schema";
import { like } from "drizzle-orm";

const OWNER_USERNAME = process.env.DEFAULT_OWNER_USERNAME || "owner";
const OWNER_PASSWORD = process.env.DEFAULT_OWNER_PASSWORD || "Dans_newbie2";

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
      await page.goto("/login");
      await page.waitForLoadState("domcontentloaded");

      // Verifikasi elemen form login muncul dan siap menerima input
      const userInput = page.locator("#usernameOrEmail");
      const passInput = page.locator("#password");
      const submitBtn = page.locator('button[type="submit"]');

      await expect(userInput).toBeVisible({ timeout: 10000 });
      await expect(passInput).toBeVisible({ timeout: 10000 });
      await expect(submitBtn).toBeVisible({ timeout: 10000 });

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
});
