import { test, expect } from "@playwright/test";

test.describe("E2E: In-App Update Notification & Verification", () => {
  test("1. Deteksi Pembaruan Tersedia (Simulasi v9.9.9) di /settings", async ({ page }) => {
    // Mock route /api/app/version* dengan versi lebih tinggi
    await page.route("**/api/app/version*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          currentServerVersion: "1.1.2",
          latestVersion: "9.9.9",
          tagName: "v9.9.9",
          title: "Ksatria Graphx Release v9.9.9",
          publishedAt: new Date().toISOString(),
          changelogLines: [
            "Peningkatan sistem deteksi pembaruan otomatis",
            "Perbaikan sinkronisasi APK native",
          ],
          downloadUrl:
            "https://github.com/Smurffahh/KsatriaGraphx/releases/download/v9.9.9/KsatriaGraphx-v9.9.9-release.apk",
          releaseUrl: "https://github.com/Smurffahh/KsatriaGraphx/releases/tag/v9.9.9",
          hasUpdate: true,
          source: "github",
        }),
      });
    });

    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");

    // 1. Verifikasi Auto-Check: Dialog update otomatis terbuka saat terdeteksi versi baru v9.9.9
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 15000 });

    const modalTitle = dialog.getByRole("heading", { name: /Pembaruan Versi Tersedia/i });
    await expect(modalTitle).toBeVisible({ timeout: 10000 });

    // Pastikan changelog dan versi baru tampil di dalam modal dialog
    await expect(dialog.getByText("v9.9.9")).toBeVisible();
    await expect(dialog.getByText("Peningkatan sistem deteksi pembaruan otomatis")).toBeVisible();

    // Pastikan tombol aksi pembaruan ada di modal
    const actionBtn = dialog.getByRole("button", { name: /Unduh & Pasang APK|Muat Ulang Versi Baru|Unduh APK/i });
    await expect(actionBtn.first()).toBeVisible();

    // 2. Tutup modal dengan tombol "Nanti Saja"
    const dismissBtn = dialog.getByRole("button", { name: /Nanti Saja/i });
    await expect(dismissBtn).toBeVisible();
    await dismissBtn.click();
    await expect(dialog).toBeHidden({ timeout: 5000 });

    // 3. Pastikan status versi pada kartu settings menampilkan pembaruan v9.9.9
    const statusText = page.locator("text=/Tersedia pembaruan: v9\\.9\\.9|Tersedia versi baru/i");
    await expect(statusText.first()).toBeVisible({ timeout: 10000 });

    // 4. Uji Tombol Manual "Periksa Pembaruan": Tetap membuka modal kembali meskipun sudah di-dismiss
    const checkBtn = page.getByRole("button", { name: /Periksa Pembaruan/i });
    await expect(checkBtn).toBeVisible({ timeout: 10000 });
    await checkBtn.click();

    // Pastikan modal terbuka kembali
    await expect(dialog).toBeVisible({ timeout: 10000 });
  });

  test("2. Penanganan Error Jaringan pada Pengecekan Pembaruan", async ({ page }) => {
    // Mock network failure pada /api/app/version*
    await page.route("**/api/app/version*", async (route) => {
      await route.abort("failed");
    });

    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");

    const checkBtn = page.getByRole("button", { name: /Periksa Pembaruan/i });
    await expect(checkBtn).toBeVisible({ timeout: 10000 });
    await checkBtn.click();

    // Pastikan toast error muncul (TIDAK pernah mengaku versi terbaru / up-to-date)
    const errorToast = page.locator("text=/Gagal memeriksa pembaruan/i");
    await expect(errorToast.first()).toBeVisible({ timeout: 10000 });

    // Modal pembaruan tidak boleh terbuka
    const modalTitle = page.getByRole("heading", { name: /Pembaruan Versi Tersedia/i });
    await expect(modalTitle).toHaveCount(0);
  });
});
