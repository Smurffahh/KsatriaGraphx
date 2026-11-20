import { renameSync, existsSync } from "fs";
import { execSync } from "child_process";

const apiDir = "src/app/api";
const tempDir = "src/_api_temp";

let isMoved = false;

try {
  if (existsSync(apiDir)) {
    renameSync(apiDir, tempDir);
    isMoved = true;
  }
  execSync("cross-env BUILD_TARGET=mobile next build", { stdio: "inherit" });
} finally {
  if (isMoved && existsSync(tempDir)) {
    renameSync(tempDir, apiDir);
  }
}
