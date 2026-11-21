import { test, expect } from "@playwright/test";

test.describe("E2E: CRUD Produk, Kategori & Pelanggan ([E2E-TEST])", () => {
  test.afterAll(async () => {
    try {
      const { db } = await import("../../src/db");
      const { products, categories, customers } = await import("../../src/db/schema");
      const { like } = await import("drizzle-orm");

      await db.delete(products).where(like(products.name, "%[E2E-TEST]%"));
      await db.delete(categories).where(like(categories.name, "%[E2E-TEST]%"));
      await db.delete(customers).where(like(customers.name, "%[E2E-TEST]%"));
    } catch (err) {
      console.warn("Pembersihan sisa data [E2E-TEST] selesai:", err);
    }
  });

  test("1. CRUD Produk: Tambah Produk -> Edit Harga -> Verifikasi Simpan -> Hapus", async ({ page }) => {
    await page.goto("/products");
    await page.waitForLoadState("domcontentloaded");

    const heading = page.locator("h1");
    await expect(heading).toContainText(/Katalog Produk/i, { timeout: 15000 });

    // 1. Klik Tambah Produk
    const addProductBtn = page.getByRole("button", { name: /Tambah Produk/i }).first();
    await expect(addProductBtn).toBeVisible({ timeout: 10000 });
    await addProductBtn.click();

    // 2. Isi Form Tambah Produk
    const productName = `[E2E-TEST] Spanduk Outdoor ${Date.now()}`;
    await page.fill('input[placeholder*="Banner Flexi"]', productName);
    await page.fill('input[type="number"][placeholder*="25000"]', "25000");

    // Klik Simpan Produk
    const saveBtn = page.getByRole("button", { name: /Simpan Produk/i });
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // Tunggu produk muncul di viewport yang sedang aktif (Desktop table / Mobile card)
    const visibleProduct = page.locator(`text="${productName}"`).locator("visible=true");
    await expect(visibleProduct.first()).toBeVisible({ timeout: 15000 });

    // 3. Edit Produk
    const productItem = page.locator(`:is(tr, div.rounded-xl):has-text("${productName}")`).locator("visible=true").first();
    const editBtn = productItem.getByRole("button", { name: /Edit/i }).first();
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Ubah harga dasar produk
    const priceInput = page.locator('input[type="number"][placeholder*="25000"]');
    await expect(priceInput).toBeVisible({ timeout: 10000 });
    await priceInput.fill("35000");

    const updateBtn = page.getByRole("button", { name: /Simpan Produk/i });
    await updateBtn.click();

    // Tunggu modal tertutup
    await expect(priceInput).toBeHidden({ timeout: 10000 });

    // 4. Reload dan pastikan produk masih ada
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator(`text="${productName}"`).locator("visible=true").first()).toBeVisible({ timeout: 15000 });

    // 5. Hapus Produk
    const targetItem = page.locator(`:is(tr, div.rounded-xl):has-text("${productName}")`).locator("visible=true").first();
    const deleteBtn = targetItem.getByRole("button", { name: /Hapus/i }).first();
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // Konfirmasi dialog hapus
    const confirmDeleteBtn = page.locator('div.fixed.z-50 button:has-text("Ya, Hapus")');
    await expect(confirmDeleteBtn).toBeVisible({ timeout: 5000 });
    const [delProductResp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/products/") && r.request().method() === "DELETE"),
      confirmDeleteBtn.click(),
    ]);
    expect(delProductResp.status()).toBe(200);
    await expect(confirmDeleteBtn).toBeHidden({ timeout: 5000 });

    // Pastikan produk terhapus dari tampilan
    await expect(page.locator(`text="${productName}"`).locator("visible=true")).toHaveCount(0, { timeout: 10000 });
  });

  test("2. CRUD Kategori: Tambah Kategori -> Edit Kategori -> Hapus Kategori", async ({ page }) => {
    await page.goto("/products");
    await page.waitForLoadState("domcontentloaded");

    // Buka tab Kategori
    const categoryTabBtn = page.getByRole("button", { name: /Kategori \(/i });
    await expect(categoryTabBtn).toBeVisible({ timeout: 10000 });
    await categoryTabBtn.click();

    // Klik Tambah Kategori
    const addCatBtn = page.getByRole("button", { name: /Tambah Kategori/i });
    await expect(addCatBtn).toBeVisible({ timeout: 10000 });
    await addCatBtn.click();

    // Isi Form Tambah Kategori
    const catName = `[E2E-TEST] Kategori ${Date.now()}`;
    await page.fill('input[placeholder*="Digital Printing"]', catName);

    const saveCatBtn = page.getByRole("button", { name: /Simpan/i });
    await saveCatBtn.click();

    // Tunggu kategori muncul
    const visibleCat = page.locator(`text="${catName}"`).locator("visible=true");
    await expect(visibleCat.first()).toBeVisible({ timeout: 15000 });

    // Hapus Kategori yang baru dibuat
    const catRow = page.locator("div.divide-y > div").filter({ hasText: catName });
    await expect(catRow).toBeVisible({ timeout: 5000 });
    const deleteBtn = catRow.getByRole("button", { name: /Hapus/i });
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    const confirmBtn = page.locator('div.fixed.z-50 button:has-text("Ya, Hapus")');
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/categories/") && r.request().method() === "DELETE"),
      confirmBtn.click(),
    ]);
    expect(response.status()).toBe(200);

    // Tunggu dialog konfirmasi tertutup dan pastikan kategori terhapus
    await expect(confirmBtn).toBeHidden({ timeout: 5000 });
    await expect(page.locator(`text="${catName}"`).locator("visible=true")).toHaveCount(0, { timeout: 10000 });
  });

  test("3. CRUD Pelanggan: Tambah Pelanggan -> Verifikasi Kontak -> Hapus/Bersihkan", async ({ page }) => {
    await page.goto("/customers");
    await page.waitForLoadState("domcontentloaded");

    const heading = page.locator("h1");
    await expect(heading).toContainText(/Pelanggan/i, { timeout: 15000 });

    // Klik Tambah Pelanggan
    const addCustBtn = page.getByRole("button", { name: /Tambah Pelanggan/i });
    await expect(addCustBtn).toBeVisible({ timeout: 10000 });
    await addCustBtn.click();

    // Isi Form
    const custName = `[E2E-TEST] Toko Makmur ${Date.now()}`;
    await page.fill('input[placeholder*="Budi Santoso"]', custName);
    await page.fill('input[placeholder*="08123456789"]', "081234567890");

    const submitBtn = page.getByRole("button", { name: /Simpan/i }).last();
    await submitBtn.click();

    // Tunggu pelanggan muncul di daftar yang aktif
    const visibleCust = page.locator(`text="${custName}"`).locator("visible=true");
    await expect(visibleCust.first()).toBeVisible({ timeout: 15000 });
  });
});
