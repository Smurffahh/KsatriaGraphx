import { renameSync, existsSync, readdirSync, statSync } from "fs";
import { execSync } from "child_process";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.production" });
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const rootDir = process.cwd();
const apiDir = path.join(rootDir, "src", "app", "api");
const tempDir = path.join(rootDir, "temp_api_backup_mobile_build");
const middlewareFile = path.join(rootDir, "src", "middleware.ts");
const tempMiddlewareFile = path.join(rootDir, "temp_middleware_backup_mobile_build.ts");

const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
if (!apiUrl || apiUrl.includes("localhost") || apiUrl.includes("127.0.0.1")) {
  console.warn(
    "\x1b[33m[PERINGATAN BUILD MOBILE]\x1b[0m NEXT_PUBLIC_API_BASE_URL bernilai localhost atau belum diset. Pastikan mengarahkan ke domain HTTPS produksi untuk rilis APK publik!"
  );
} else {
  console.log(`\x1b[32m[BUILD MOBILE]\x1b[0m Target backend API: ${apiUrl}`);
}

function findRouteFiles(dir, fileList = []) {
  if (!existsSync(dir)) return fileList;
  const items = readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (statSync(fullPath).isDirectory()) {
      findRouteFiles(fullPath, fileList);
    } else if (item === "route.ts" || item === "route.js") {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

let isDirMoved = false;
let disabledRouteFiles = [];
let isMiddlewareMoved = false;

try {
  if (existsSync(apiDir)) {
    try {
      console.log("[BUILD MOBILE] Mengamankan route handler server (src/app/api -> temp)...");
      renameSync(apiDir, tempDir);
      isDirMoved = true;
    } catch {
      console.log(
        "[BUILD MOBILE] Folder api terkunci sistem Windows, mengamankan file route secara individual..."
      );
      const routes = findRouteFiles(apiDir);
      for (const routePath of routes) {
        const disabledPath = `${routePath}.mobile_disabled`;
        renameSync(routePath, disabledPath);
        disabledRouteFiles.push(disabledPath);
      }
    }
  }

  if (existsSync(middlewareFile)) {
    console.log("[BUILD MOBILE] Mengamankan middleware server (src/middleware.ts -> temp)...");
    renameSync(middlewareFile, tempMiddlewareFile);
    isMiddlewareMoved = true;
  }

  console.log("[BUILD MOBILE] Menjalankan Next.js Static HTML Export (output: export)...");
  execSync("npx cross-env BUILD_TARGET=mobile next build", {
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      BUILD_TARGET: "mobile",
    },
  });
  console.log("\x1b[32m[BUILD MOBILE] Berhasil mengekspor aset statis ke folder out/\x1b[0m");
} finally {
  if (isDirMoved && existsSync(tempDir)) {
    console.log("[BUILD MOBILE] Mengembalikan route handler server (temp -> src/app/api)...");
    renameSync(tempDir, apiDir);
    console.log("\x1b[32m[BUILD MOBILE] Struktur src/app/api telah dipulihkan utuh 100%!\x1b[0m");
  }

  if (disabledRouteFiles.length > 0) {
    console.log("[BUILD MOBILE] Memulihkan file route individual yang dinonaktifkan...");
    for (const disabledPath of disabledRouteFiles) {
      if (existsSync(disabledPath)) {
        const restoredPath = disabledPath.replace(/\.mobile_disabled$/, "");
        renameSync(disabledPath, restoredPath);
      }
    }
    console.log("\x1b[32m[BUILD MOBILE] Seluruh route handler telah dipulihkan utuh 100%!\x1b[0m");
  }

  if (isMiddlewareMoved && existsSync(tempMiddlewareFile)) {
    console.log("[BUILD MOBILE] Mengembalikan middleware server (temp -> src/middleware.ts)...");
    renameSync(tempMiddlewareFile, middlewareFile);
    console.log("\x1b[32m[BUILD MOBILE] File src/middleware.ts telah dipulihkan utuh 100%!\x1b[0m");
  }
}
