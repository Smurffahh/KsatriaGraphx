import { test, expect } from "@playwright/test";

test.describe("E2E: POS Screen, Checkout & Receipt Modal Flow", () => {
  test("1. Buka POS, periksa katalog produk & komponen antarmuka kasir", async ({ page }) => {
    await page.goto("/pos");
    await page.waitForLoadState("domcontentloaded");

    // Pastikan katalog produk atau search bar tampil
    const searchInput = page.getByPlaceholder(/Cari produk percetakan/i);
    await expect(searchInput).toBeVisible({ timeout: 15000 });

    // Pastikan elemen antarmuka POS termuat
    await expect(page).toHaveURL(/\/pos/);
  });

  test("2. Navigasi Daftar Transaksi (/orders) & Filter Nota", async ({ page }) => {
    await page.goto("/orders");
    await page.waitForLoadState("domcontentloaded");

    // Pastikan halaman transaksi termuat
    const heading = page.locator("h1");
    await expect(heading).toContainText(/Transaksi/i, { timeout: 15000 });

    // Pastikan filter pencarian nota tersedia
    const filterInput = page.getByPlaceholder(/No\. nota|nota/i);
    await expect(filterInput).toBeVisible();
  });
});
