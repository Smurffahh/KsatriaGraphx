import { test, expect } from "@playwright/test";

test.describe("E2E: POS Screen, Checkout & Receipt Modal Flow", () => {
  test.afterAll(async () => {
    try {
      const { db } = await import("../../src/db");
      const { orders } = await import("../../src/db/schema/orders");
      const { like } = await import("drizzle-orm");

      await db.delete(orders).where(like(orders.customerNameSnapshot, "%[E2E-TEST]%"));
    } catch (err) {
      console.warn("Pembersihan data pengujian [E2E-TEST] selesai:", err);
    }
  });

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

  test("3. Alur Lengkap: POS -> Tambah Produk -> Checkout Walk-in -> Simpan Nota -> Cek Daftar Pesanan", async ({ page }) => {
    await page.goto("/pos");
    await page.waitForLoadState("domcontentloaded");

    // Tunggu katalog produk muncul
    const productCards = page.locator("div.group.cursor-pointer");
    await expect(productCards.first()).toBeVisible({ timeout: 15000 });

    // Klik produk pertama untuk membuka kalkulator
    await productCards.first().click();

    // Pastikan modal kalkulator terbuka dan klik "Masukkan ke Keranjang"
    const addToCartBtn = page.getByRole("button", { name: /Masukkan ke Keranjang/i });
    await expect(addToCartBtn).toBeVisible({ timeout: 10000 });
    await addToCartBtn.click();

    // Buka Checkout Modal (Desktop / Mobile)
    const checkoutBtn = page.getByRole("button", { name: /Proses Checkout Nota|Checkout/i }).first();
    await expect(checkoutBtn).toBeVisible({ timeout: 10000 });
    await checkoutBtn.click();

    // Input Nama Pelanggan Walk-In dengan prefix [E2E-TEST]
    const customerNameInput = page.locator('label:has-text("Nama Pelanggan")').locator("..").locator("input");
    await expect(customerNameInput).toBeVisible({ timeout: 10000 });
    await customerNameInput.fill("[E2E-TEST] Pelanggan Otomatis Playwright");

    // Submit Checkout Nota
    const submitBtn = page.getByRole("button", { name: /Proses Nota Sekarang/i });
    await expect(submitBtn).toBeVisible({ timeout: 10000 });
    await submitBtn.click();

    // Verifikasi Modal Transaksi Berhasil Disimpan terbuka
    const successModalText = page.getByText(/Transaksi Berhasil Disimpan!/i);
    await expect(successModalText).toBeVisible({ timeout: 20000 });

    // Dapatkan nomor nota yang dihasilkan jika tersedia
    const invoiceNumberEl = page.locator("text=Nomor Nota:").locator("..").locator("span").last();
    let invoiceNumber = "";
    if (await invoiceNumberEl.isVisible()) {
      invoiceNumber = (await invoiceNumberEl.textContent())?.trim() || "";
    }

    // Navigasi ke Halaman Pesanan (/orders) & Verifikasi Transaksi Tersimpan
    await page.goto("/orders");
    await page.waitForLoadState("domcontentloaded");

    const isMobile = (page.viewportSize()?.width ?? 1280) < 1024;
    if (invoiceNumber) {
      const filterInput = page.getByPlaceholder(/No\. nota|nota/i);
      await filterInput.fill(invoiceNumber);
      const invoiceLink = isMobile
        ? page.locator(".lg\\:hidden").getByText(invoiceNumber).first()
        : page.locator("table").getByText(invoiceNumber).first();
      await expect(invoiceLink).toBeVisible({ timeout: 15000 });
    } else {
      const customerText = isMobile
        ? page.locator(".lg\\:hidden").getByText("[E2E-TEST] Pelanggan Otomatis Playwright").first()
        : page.locator("table").getByText("[E2E-TEST] Pelanggan Otomatis Playwright").first();
      await expect(customerText).toBeVisible({ timeout: 15000 });
    }
  });
});
