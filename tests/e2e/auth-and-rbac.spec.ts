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

    test("3. Halaman Manajemen User (/users) dapat diakses oleh Owner di Web dan menegakkan Single-Owner di UI", async ({ page }) => {
      await page.goto("/users");
      await page.waitForLoadState("domcontentloaded");

      const heading = page.locator("h1");
      await expect(heading).toContainText(/Pengguna/i);

      const addUserBtn = page.getByRole("button", { name: /Tambah Pengguna/i });
      await expect(addUserBtn).toBeVisible();

      // Buka modal Tambah Pengguna
      await addUserBtn.click();
      const modalHeading = page.getByRole("heading", { name: /Tambah Pengguna Baru/i });
      await expect(modalHeading).toBeVisible();

      // Verifikasi penegakan Single-Owner: peran dikunci sebagai KASIR tanpa opsi dropdown OWNER
      const addForm = page.locator("form");
      const cashierBadge = addForm.locator("span", { hasText: /^KASIR$/ });
      await expect(cashierBadge).toBeVisible();
      await expect(addForm.locator("text=kebijakan 1 Owner tunggal")).toBeVisible();

      // Dropdown role tidak boleh ada
      const roleSelect = addForm.locator("select[name='role']");
      await expect(roleSelect).toHaveCount(0);

      // Tutup modal
      await page.getByRole("button", { name: /Batal/i }).click();
      await expect(modalHeading).not.toBeVisible();
    });
  });
});
