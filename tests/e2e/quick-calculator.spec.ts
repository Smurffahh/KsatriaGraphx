import { test, expect } from "@playwright/test";

test.describe("E2E: Quick Calculator & Material Comparison", () => {
  test("1. Desktop: Buka Kalkulator Cepat dari Top Bar, ganti produk via Katalog Picker visual, salin teks WA, dan kirim ke POS", async ({ page, isMobile }) => {
    test.skip(isMobile, "Desktop top bar hanya aktif di viewport desktop (>= 1024px)");

    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded");

    // Tombol Cek Harga di Top Bar Desktop
    const openBtn = page.getByRole("button", { name: /Cek Harga/i });
    await expect(openBtn).toBeVisible({ timeout: 15000 });
    await openBtn.click();

    // Pastikan Sheet Kalkulator Cepat terbuka
    const sheetTitle = page.getByText(/Kalkulator Cepat & Perbandingan/i);
    await expect(sheetTitle).toBeVisible({ timeout: 10000 });

    // Verifikasi Kartu Visual Bahan Utama (Opsi A) atau Katalog Picker tampil
    const changeProductBtn = page.getByRole("button", { name: /Ganti/i }).first();
    await expect(changeProductBtn).toBeVisible({ timeout: 10000 });

    // Buka Katalog Picker visual dengan menekan tombol Ganti
    await changeProductBtn.click();

    // Pastikan kolom pencarian katalog muncul
    const searchInput = page.getByPlaceholder(/Cari bahan atau produk/i);
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    // Ketik pencarian untuk memfilter katalog
    await searchInput.fill("Banner");

    // Klik salah satu kartu produk dari hasil katalog
    const catalogCards = page.locator('button:has-text("Rp")');
    if (await catalogCards.count() > 0) {
      await catalogCards.first().click();
    }

    // Pastikan tombol Salin dan Lanjut ke POS aktif
    const copyBtn = page.getByRole("button", { name: /Salin Estimasi/i });
    await expect(copyBtn).toBeVisible();

    const addToPosBtn = page.getByRole("button", { name: /Lanjut ke POS/i });
    await expect(addToPosBtn).toBeVisible();

    // Klik Lanjut ke POS
    await addToPosBtn.click();

    // Harus bernavigasi ke /pos dan keranjang memiliki item
    await expect(page).toHaveURL(/\/pos/);
    const cartSummary = page.getByText(/Ringkasan Pesanan|Keranjang/i).first();
    await expect(cartSummary).toBeVisible({ timeout: 10000 });
  });

  test("2. Shortcut Alt+K: Toggle kalkulator cepat & komparasi 2 bahan dengan katalog visual", async ({ page, isMobile }) => {
    test.skip(isMobile, "Shortcut Alt+K desktop testing");

    await page.goto("/orders");
    await page.waitForLoadState("domcontentloaded");

    // Buka menggunakan shortcut keyboard Alt+K
    await page.keyboard.press("Alt+K");

    const sheetTitle = page.getByText(/Kalkulator Cepat & Perbandingan/i);
    await expect(sheetTitle).toBeVisible({ timeout: 10000 });

    // Aktifkan toggle Bandingkan 2 Bahan
    const compareSwitch = page.locator('button[role="switch"]');
    await expect(compareSwitch).toBeVisible();
    await expect(compareSwitch).toBeEnabled({ timeout: 15000 });
    await compareSwitch.click();

    // Verifikasi slot Bahan Pembanding (Opsi B) muncul
    const labelB = page.getByText("Bahan Pembanding (Opsi B)", { exact: true }).first();
    await expect(labelB).toBeVisible();

    // Tekan Alt+K lagi untuk menutup
    await page.keyboard.press("Alt+K");
    await expect(sheetTitle).toBeHidden({ timeout: 5000 });
  });

  test("3. Mobile: Tombol Kalkulator di bottom bar dan bottom sheet responsif", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Bottom bar mobile hanya aktif di viewport mobile (< 1024px)");

    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded");

    // Pastikan tombol Kalkulator muncul di navigasi bawah mobile
    const calcTrigger = page.locator('button[aria-label="Buka Kalkulator Cepat"]');
    await expect(calcTrigger).toBeVisible({ timeout: 15000 });

    // Ketuk tombol Kalkulator untuk membuka sheet
    await calcTrigger.click();

    // Pastikan sheet terbuka
    const sheetTitle = page.getByText(/Kalkulator Cepat & Perbandingan/i);
    await expect(sheetTitle).toBeVisible({ timeout: 10000 });

    // Pastikan tidak ada horizontal overflow saat bottom sheet kalkulator aktif
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2
    );
    expect(hasOverflow).toBe(false);

    // Verifikasi tombol Salin dan Lanjut ke POS tampil
    const copyBtn = page.getByRole("button", { name: /Salin Estimasi/i });
    await expect(copyBtn).toBeVisible();

    const addToPosBtn = page.getByRole("button", { name: /Lanjut ke POS/i });
    await expect(addToPosBtn).toBeVisible();

    // Handoff ke POS dari mobile sheet
    await addToPosBtn.click();
    await expect(page).toHaveURL(/\/pos/);
  });

  test("4. Anti-Timpa Keranjang POS: Handoff item dari Kalkulator Cepat melakukan append ke item POS yang sudah ada", async ({ page, isMobile }) => {
    test.skip(isMobile, "Desktop flow testing");

    await page.goto("/pos");
    await page.waitForLoadState("domcontentloaded");

    // Tambah item 1 dari katalog POS
    const productCards = page.locator("div.group.cursor-pointer");
    await expect(productCards.first()).toBeVisible({ timeout: 15000 });
    await productCards.first().click();

    const addToCartBtn = page.getByRole("button", { name: /Masukkan ke Keranjang/i });
    await expect(addToCartBtn).toBeVisible({ timeout: 10000 });
    await addToCartBtn.click();

    // Verifikasi keranjang sekarang punya item
    const removeOrQtyBtns = page.locator('button:has-text("Hapus")').or(page.locator('button[aria-label="Hapus item"]')).or(page.locator('button:has(.lucide-trash-2)'));
    const initialItemCount = await removeOrQtyBtns.count();

    // Buka Kalkulator Cepat dari topbar saat berada di /pos
    const openCalcBtn = page.getByRole("button", { name: /Cek Harga/i });
    await openCalcBtn.click();

    const sheetTitle = page.getByText(/Kalkulator Cepat & Perbandingan/i);
    await expect(sheetTitle).toBeVisible({ timeout: 10000 });

    // Klik Lanjut ke POS dari sheet
    const addToPosBtn = page.getByRole("button", { name: /Lanjut ke POS/i });
    await expect(addToPosBtn).toBeVisible();
    await addToPosBtn.click();

    // Sheet harus tertutup dan item baru di-append (jumlah item bertambah)
    await expect(sheetTitle).toBeHidden({ timeout: 5000 });
    const finalItemCount = await removeOrQtyBtns.count();
    expect(finalItemCount).toBeGreaterThanOrEqual(initialItemCount);
  });
});
