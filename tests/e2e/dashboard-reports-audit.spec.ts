import { test, expect } from "@playwright/test";

test.describe("E2E: Dashboard, Laporan Penjualan & Audit Log Forensik", () => {
  test("1. Dashboard (/dashboard) memuat ringkasan performa penjualan", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded");

    const heading = page.locator("h1");
    await expect(heading).toContainText(/Dashboard/i, { timeout: 15000 });

    // Pastikan kartu metrik omzet & pesanan tampil di dalam konten utama (main)
    const omzetCard = page.locator("main").getByText(/Total Omzet|Omzet/i).first();
    await expect(omzetCard).toBeVisible({ timeout: 15000 });
  });

  test("2. Laporan Penjualan (/reports) memuat filter dan tombol Export CSV", async ({ page }) => {
    await page.goto("/reports");
    await page.waitForLoadState("domcontentloaded");

    const heading = page.locator("h1");
    await expect(heading).toContainText(/Laporan/i, { timeout: 15000 });

    // Pastikan tombol Export CSV tersedia
    const exportBtn = page.getByRole("button", { name: /Export CSV/i });
    await expect(exportBtn).toBeVisible();
  });

  test("3. Audit Log (/audit-logs) memuat rekam jejak aktivitas sensitif", async ({ page }) => {
    await page.goto("/audit-logs");
    await page.waitForLoadState("domcontentloaded");

    const heading = page.locator("h1");
    await expect(heading).toContainText(/Audit/i, { timeout: 15000 });

    // Pastikan rekam jejak aktivitas tampil sesuai tampilan responsif (tabel desktop vs kartu mobile)
    const isMobile = (page.viewportSize()?.width ?? 1280) < 640;
    if (isMobile) {
      await expect(page.getByText(/aktivitas tercatat|Filter/i).first()).toBeVisible({ timeout: 15000 });
    } else {
      const tableHeader = page.getByText(/Waktu \(WIB\)/i);
      await expect(tableHeader).toBeVisible({ timeout: 15000 });
    }
  });
});
