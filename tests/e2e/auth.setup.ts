import { test as setup, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const authFile = "playwright/.auth/owner.json";
const OWNER_USERNAME =
  process.env.E2E_OWNER_USERNAME || process.env.DEFAULT_OWNER_USERNAME || "owner";
const OWNER_PASSWORD =
  process.env.E2E_OWNER_PASSWORD || process.env.DEFAULT_OWNER_PASSWORD;

if (!OWNER_PASSWORD) {
  throw new Error(
    "Kredensial E2E belum dikonfigurasi. Mohon definisikan E2E_OWNER_PASSWORD (atau DEFAULT_OWNER_PASSWORD) pada file .env.local sebelum menjalankan pengujian Playwright."
  );
}

setup("Authenticate Owner", async ({ page }) => {
  // Pastikan direktori playwright/.auth ada
  const dir = path.dirname(authFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  await page.goto("/login");
  await page.waitForLoadState("domcontentloaded");

  await page.fill("#usernameOrEmail", OWNER_USERNAME);
  await page.fill("#password", OWNER_PASSWORD);
  await page.click('button[type="submit"]');

  // Menunggu navigasi ke POS atau Dashboard
  await page.waitForURL(/\/(pos|dashboard)/, { timeout: 20000 });
  await expect(page).toHaveURL(/\/(pos|dashboard)/);

  // Simpan state autentikasi ke file
  await page.context().storageState({ path: authFile });
});
