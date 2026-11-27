import { test, expect } from "@playwright/test";

test.describe("E2E: Master Vendor Mitra, SPK WA Zero-Leak & Setoran Modal Vendor (v1.6.0)", () => {
  test.afterAll(async () => {
    try {
      const { db } = await import("../../src/db");
      const {
        vendorPayments,
        payments,
        orderItemFinishings,
        orderItems,
        orders,
        products,
        vendors,
        customers,
        categories,
      } = await import("../../src/db/schema");
      const { inArray, like, or } = await import("drizzle-orm");

      const e2eOrders = await db
        .select({ id: orders.id })
        .from(orders)
        .where(like(orders.customerNameSnapshot, "%[E2E-TEST]%"));
      const e2eOrderIds = e2eOrders.map((o) => o.id);

      const e2eVendors = await db
        .select({ id: vendors.id })
        .from(vendors)
        .where(like(vendors.name, "%[E2E-TEST]%"));
      const e2eVendorIds = e2eVendors.map((v) => v.id);

      const e2eProducts = await db
        .select({ id: products.id })
        .from(products)
        .where(like(products.name, "%[E2E-TEST]%"));
      const e2eProductIds = e2eProducts.map((p) => p.id);

      if (e2eOrderIds.length > 0 || e2eVendorIds.length > 0) {
        const vpConds = [like(vendorPayments.vendorNameSnapshot, "%[E2E-TEST]%")];
        if (e2eOrderIds.length > 0) vpConds.push(inArray(vendorPayments.orderId, e2eOrderIds));
        if (e2eVendorIds.length > 0) vpConds.push(inArray(vendorPayments.vendorId, e2eVendorIds));
        await db.delete(vendorPayments).where(or(...vpConds));
      }

      if (e2eOrderIds.length > 0) {
        await db.delete(payments).where(inArray(payments.orderId, e2eOrderIds));

        const items = await db
          .select({ id: orderItems.id })
          .from(orderItems)
          .where(inArray(orderItems.orderId, e2eOrderIds));
        const itemIds = items.map((i) => i.id);
        if (itemIds.length > 0) {
          await db
            .delete(orderItemFinishings)
            .where(inArray(orderItemFinishings.orderItemId, itemIds));
        }
        await db.delete(orderItems).where(inArray(orderItems.orderId, e2eOrderIds));
        await db.delete(orders).where(inArray(orders.id, e2eOrderIds));
      }

      if (e2eProductIds.length > 0) {
        await db.delete(orderItems).where(inArray(orderItems.productId, e2eProductIds));
      }

      await db.delete(products).where(like(products.name, "%[E2E-TEST]%"));
      await db.delete(vendors).where(like(vendors.name, "%[E2E-TEST]%"));
      await db.delete(customers).where(like(customers.name, "%[E2E-TEST]%"));
      await db.delete(categories).where(like(categories.name, "%[E2E-TEST]%"));
    } catch (err) {
      console.warn("Pembersihan sisa data vendor [E2E-TEST] selesai:", err);
    }
  });

  test("1. Alur Lengkap Owner: Master Vendor -> Produk Default Vendor -> Order Detail SPK Zero-Leak -> Setor Sebagian & Lunas -> Dashboard & Laporan", async ({
    page,
  }) => {
    const stamp = Date.now();
    const vendorName = `[E2E-TEST] Percetakan Maju ${stamp}`;
    const productName = `[E2E-TEST] Banner Vendor ${stamp}`;
    const customerSecretName = `[E2E-TEST] Klien Rahasia ${stamp}`;
    const customerSecretPhone = "08119998887";
    const spkUrl = `https://drive.google.com/file/d/e2e-spk-${stamp}/view`;

    // 1. Buka Master Vendor Mitra & tambah vendor baru
    await page.goto("/vendors");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1")).toContainText(/Master Vendor Mitra/i, { timeout: 15000 });

    const overflowVendors = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2
    );
    expect(overflowVendors).toBe(false);

    if ((page.viewportSize()?.width ?? 1280) < 1024) {
      const menuBtn = page.getByRole("button", { name: /Menu/i }).first();
      await menuBtn.click();
      const drawerDialog = page.getByRole("dialog");
      await expect(drawerDialog.getByRole("link", { name: /Vendor Mitra/i })).toBeVisible({
        timeout: 5000,
      });
      await page.keyboard.press("Escape");
      await expect(page.getByText("Menu & Pengaturan")).toBeHidden({ timeout: 5000 });
    }

    await page.getByRole("button", { name: /Tambah Vendor/i }).first().click();
    await page.fill('input[placeholder*="Percetakan Digital Putra"]', vendorName);
    await page.fill('input[placeholder="08123456789"]', "0812-8888-7777");
    await page.fill('input[placeholder*="Banner Flexi, Stiker"]', "Spanduk & UV Print");
    await page.fill('textarea[placeholder*="BCA 1234567"]', `[E2E-TEST] Catatan rekening ${stamp}`);

    const [createVendorRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/vendors") && r.request().method() === "POST"),
      page.getByRole("button", { name: /Simpan Vendor/i }).click(),
    ]);
    expect(createVendorRes.status()).toBe(201);
    const createdVendorJson = await createVendorRes.json();
    const vendorId: string = createdVendorJson.data.id;
    expect(createdVendorJson.data.whatsapp).toBe("6281288887777");

    await expect(page.locator(`text="${vendorName}"`).locator("visible=true").first()).toBeVisible({
      timeout: 15000,
    });

    // 2. Kaitkan vendor baru sebagai Default Vendor di Katalog Produk (/products)
    await page.goto("/products");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1")).toContainText(/Katalog Produk/i, { timeout: 15000 });

    await page.getByRole("button", { name: /Tambah Produk/i }).first().click();
    await page.fill('input[placeholder*="Banner Flexi 280gr"]', productName);

    const categorySelect = page.locator('select:has(option:has-text("Pilih Kategori"))');
    if (await categorySelect.count()) {
      const val = await categorySelect.inputValue();
      if (!val) {
        await categorySelect.selectOption({ index: 1 });
      }
    }

    const vendorSelect = page.locator('select:has(option:has-text("Tidak ada vendor default"))');
    await expect(vendorSelect).toBeVisible({ timeout: 10000 });
    await vendorSelect.selectOption(vendorId);

    // Modal vendor = Rp 20.000/m², Harga jual pelanggan = Rp 30.000/m²
    await page.fill('input[placeholder="Contoh: 20000"]', "20000");
    await page.fill('input[placeholder="Contoh: 25000"]', "30000");

    const [createProdRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/products") && r.request().method() === "POST"),
      page.getByRole("button", { name: /Simpan Produk/i }).click(),
    ]);
    expect(createProdRes.status()).toBe(201);
    const createdProdJson = await createProdRes.json();
    const productId: string = createdProdJson.data.id;
    expect(createdProdJson.data.defaultVendorId).toBe(vendorId);

    // 3. Checkout transaksi real menggunakan produk tersebut (luas 2m x 1m = modal Rp 40.000, jual Rp 60.000)
    const createOrderResult = await page.evaluate(
      async ({ prodId, custName, custPhone }) => {
        const resp = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerNameSnapshot: custName,
            customerPhoneSnapshot: custPhone,
            items: [
              {
                productId: prodId,
                quantity: 2,
                width: 1,
                height: 1,
                unit: "m",
                itemNotes: "Cetak resolusi tinggi",
                finishings: [],
              },
            ],
            initialPayment: {
              amount: 60000,
              paymentMethod: "CASH",
              cashReceived: 60000,
            },
          }),
        });
        const json = await resp.json();
        return { status: resp.status, json };
      },
      { prodId: productId, custName: customerSecretName, custPhone: customerSecretPhone }
    );
    expect(createOrderResult.status).toBe(201);
    const createdOrderJson = createOrderResult.json;
    const orderId: string = createdOrderJson.data.id;
    const invoiceNumber: string = createdOrderJson.data.invoiceNumber;
    expect(createdOrderJson.data.totalProductionCost).toBe(40000);
    expect(createdOrderJson.data.vendorPaymentStatus).toBe("UNPAID");

    // 4. Buka Detail Pesanan -> Verifikasi Vendor Snapshot, Simpan Link Desain HTTPS & SPK Zero-Leak
    await page.goto(`/orders/detail?id=${orderId}`);
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText(/Produksi Vendor & SPK WhatsApp/i)).toBeVisible({ timeout: 20000 });

    const overflowDetail = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2
    );
    expect(overflowDetail).toBe(false);

    const itemVendorSelect = page.locator(`select[aria-label="Vendor untuk ${productName}"]`);
    await expect(itemVendorSelect).toHaveValue(vendorId);

    await page.fill('input[placeholder="https://drive.google.com/file/d/..."]', spkUrl);

    const [assignRes] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes(`/api/orders/${orderId}/vendor-assignment`) &&
          r.request().method() === "PATCH"
      ),
      page.getByRole("button", { name: /Simpan Penugasan & Link Desain/i }).click(),
    ]);
    expect(assignRes.status()).toBe(200);

    const spkPreview = page.locator("pre").first();
    await expect(spkPreview).toBeVisible();
    const spkContent = (await spkPreview.textContent()) || "";
    expect(spkContent).toContain("SPK PRODUKSI");
    expect(spkContent).toContain(invoiceNumber);
    expect(spkContent).toContain(productName);
    expect(spkContent).toContain(spkUrl);
    // Jaminan Zero-Leak mutlak di SPK: 0 data klien, 0 harga jual/total, 0 laba
    expect(spkContent).not.toContain(customerSecretName);
    expect(spkContent).not.toContain(customerSecretPhone);
    expect(spkContent).not.toContain("628119998887");
    expect(spkContent).not.toContain("60.000");
    expect(spkContent).not.toContain("30.000");
    expect(spkContent).not.toContain("20.000");
    expect(spkContent).not.toContain("Laba");

    // 5. Catat Setoran Modal Vendor Sebagian (Rp 15.000 dari Rp 40.000) -> PARTIAL
    await page.getByRole("button", { name: /Catat Setoran Vendor/i }).click();
    await expect(page.getByText(/Catat Setoran Modal Vendor/i)).toBeVisible({ timeout: 5000 });
    await page.fill('input[placeholder="Contoh: 20000"]', "15000");
    await page.fill('input[placeholder*="BCA trf DP"]', `[E2E-TEST] Transfer DP 1 ${stamp}`);

    const [partialPayRes] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes(`/api/orders/${orderId}/vendor-payments`) &&
          r.request().method() === "POST"
      ),
      page.getByRole("button", { name: /Simpan Setoran/i }).click(),
    ]);
    expect(partialPayRes.status()).toBe(201);
    await expect(page.getByText("DP Vendor").first()).toBeVisible({ timeout: 10000 });

    // 6. Catat Pelunasan Modal Vendor (Lunasi Semua Rp 25.000) -> PAID (Lunas Vendor)
    await page.getByRole("button", { name: /Catat Setoran Vendor/i }).click();
    await page.getByRole("button", { name: /Lunasi Semua/i }).click();

    const [finalPayRes] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes(`/api/orders/${orderId}/vendor-payments`) &&
          r.request().method() === "POST"
      ),
      page.getByRole("button", { name: /Simpan Setoran/i }).click(),
    ]);
    expect(finalPayRes.status()).toBe(201);
    await expect(page.getByText("Lunas Vendor").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /Catat Setoran Vendor/i })).toBeDisabled();

    // 7. Verifikasi Kartu Dashboard Owner & Laporan Penjualan
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText(/Wajib Setor ke Vendor/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Estimasi Kas Tersedia/i)).toBeVisible({ timeout: 15000 });
    const overflowDashboard = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2
    );
    expect(overflowDashboard).toBe(false);

    await page.goto("/reports");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText(/Sudah Disetor ke Vendor/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Sisa Kewajiban Vendor/i)).toBeVisible({ timeout: 15000 });
    await expect(page.locator('select[aria-label="Status Setoran Vendor"]')).toBeVisible();
  });

  test("2. Proteksi Autentikasi & Versi v1.6.0 Endpoint Vendor", async ({ playwright }) => {
    const anonContext = await playwright.request.newContext({
      baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
      storageState: { cookies: [], origins: [] },
    });

    try {
      const vendorsRes = await anonContext.get("/api/vendors");
      expect(vendorsRes.status()).toBe(401);

      const postVendorRes = await anonContext.post("/api/vendors", {
        data: { name: "Anon Vendor", whatsapp: "08123456789" },
      });
      expect(postVendorRes.status()).toBe(401);

      const assignRes = await anonContext.patch(
        "/api/orders/11111111-1111-4111-8111-111111111111/vendor-assignment",
        { data: { markSpkSent: true } }
      );
      expect(assignRes.status()).toBe(401);

      const payRes = await anonContext.post(
        "/api/orders/11111111-1111-4111-8111-111111111111/vendor-payments",
        { data: { vendorName: "X", amount: 1000, paymentMethod: "CASH" } }
      );
      expect(payRes.status()).toBe(401);

      const costRes = await anonContext.patch(
        "/api/orders/11111111-1111-4111-8111-111111111111/vendor-cost",
        { data: { totalProductionCost: 1000, reason: "Unauth" } }
      );
      expect(costRes.status()).toBe(401);

      const versionRes = await anonContext.get("/api/app/version");
      expect(versionRes.status()).toBe(200);
      const versionJson = await versionRes.json();
      expect(versionJson.currentServerVersion).toBe("1.7.0");
    } finally {
      await anonContext.dispose();
    }
  });
});
