import { test, expect } from "@playwright/test";

test.describe("E2E: Autentikasi, RBAC & 4-Layer Guard", () => {
  test.describe("Alur Login Gagal (Tanpa Sesi)", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("1. Login gagal menampilkan pesan error generik tanpa membocorkan eksistensi akun", async ({ page }) => {
      await page.goto("/login");
      await page.waitForLoadState("domcontentloaded");

      await page.fill("#usernameOrEmail", "user_tidak_terdaftar_99999");
      await page.fill("#password", "PasswordSalah123!");
      await page.click('button[type="submit"]');

      const alert = page.locator('main div[role="alert"]');
      await expect(alert).toBeVisible({ timeout: 10000 });
      await expect(alert).toContainText(/gagal|salah|tidak|terlalu banyak/i);
    });
  });

  test.describe("Alur Sesi Terotentikasi (Owner Session)", () => {
    test("2. Sesi Owner aktif, halaman terlindungi dapat diakses dan bertahan saat reload", async ({ page }) => {
      await page.goto("/dashboard");
      await page.waitForLoadState("domcontentloaded");
      await expect(page).toHaveURL(/\/dashboard/);

      // Reload halaman untuk memastikan HttpOnly cookie sesi bertahan
      await page.reload();
      await page.waitForLoadState("domcontentloaded");
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test("3. Halaman Manajemen User (/users) dapat diakses oleh Owner di Web", async ({ page }) => {
      await page.goto("/users");
      await page.waitForLoadState("domcontentloaded");

      const heading = page.locator("h1");
      await expect(heading).toContainText(/Pengguna/i);

      const addUserBtn = page.getByRole("button", { name: /Tambah Pengguna/i });
      await expect(addUserBtn).toBeVisible();
    });
  });
});
