import { renameSync, existsSync } from "fs";
import { execSync } from "child_process";
import dotenv from "dotenv";

dotenv.config({ path: ".env.production" });
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const apiDir = "src/app/api";
const tempDir = "temp_api_backup_mobile_build";

const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
if (!apiUrl || apiUrl.includes("localhost") || apiUrl.includes("127.0.0.1")) {
  console.warn(
    "\x1b[33m[PERINGATAN BUILD MOBILE]\x1b[0m NEXT_PUBLIC_API_BASE_URL bernilai localhost atau belum diset. Pastikan mengarahkan ke domain HTTPS produksi untuk rilis APK publik!"
  );
} else {
  console.log(`\x1b[32m[BUILD MOBILE]\x1b[0m Target backend API: ${apiUrl}`);
}

let isMoved = false;

try {
  if (existsSync(apiDir)) {
    console.log("[BUILD MOBILE] Mengamankan route handler server (src/app/api -> temp)...");
    renameSync(apiDir, tempDir);
    isMoved = true;
  }

  console.log("[BUILD MOBILE] Menjalankan Next.js Static HTML Export (output: export)...");
  execSync("npx cross-env BUILD_TARGET=mobile next build", {
    stdio: "inherit",
    shell: true,
  });
  console.log("\x1b[32m[BUILD MOBILE] Berhasil mengekspor aset statis ke folder out/\x1b[0m");
} finally {
  if (isMoved && existsSync(tempDir)) {
    console.log("[BUILD MOBILE] Mengembalikan route handler server (temp -> src/app/api)...");
    renameSync(tempDir, apiDir);
    console.log("\x1b[32m[BUILD MOBILE] Struktur src/app/api telah dipulihkan utuh 100%!\x1b[0m");
  }
}
