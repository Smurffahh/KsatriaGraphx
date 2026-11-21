import fs from "fs";
import path from "path";

export function extractReleaseNotes(changelogContent, tag) {
  const cleanTag = tag.trim();
  const versionWithoutV = cleanTag.replace(/^v/, "");

  const lines = changelogContent.split("\n");
  let capturing = false;
  const capturedLines = [];

  const targetHeaderRegex = new RegExp(`^##\\s*\\[v?${versionWithoutV.replace(/\./g, "\\.")}\\]`, "i");
  const nextHeaderRegex = /^##\s*\[v?[0-9]/i;

  for (const line of lines) {
    if (targetHeaderRegex.test(line)) {
      capturing = true;
      continue;
    }

    if (capturing && nextHeaderRegex.test(line)) {
      break;
    }

    if (capturing) {
      capturedLines.push(line);
    }
  }

  return capturedLines.join("\n").trim();
}

export function buildFullReleaseNotes(changelogContent, tag, sha256Content = "") {
  const extracted = extractReleaseNotes(changelogContent, tag);
  const mainNotes = extracted || `Catatan rilis Ksatria Graphx versi ${tag}.`;

  const installationGuide = `
---

### Panduan Instalasi APK
1. Unduh berkas **KsatriaGraphx-*.apk** yang terlampir pada rilis ini.
2. Jika sebelumnya telah terpasang versi Debug di perangkat Anda, hapus (*uninstall*) terlebih dahulu untuk menghindari konflik tanda tangan aplikasi (*signature conflict*).
3. Buka file APK yang diunduh dan izinkan pemasangan dari sumber ini (*Install Unknown Apps*).
4. Masuk (*login*) menggunakan kredensial kasir atau pemilik usaha yang telah terdaftar.
`;

  const checksumSection = sha256Content.trim()
    ? `
### Checksum Integritas SHA-256
\`\`\`text
${sha256Content.trim()}
\`\`\`
`
    : "";

  return `${mainNotes}\n${installationGuide}${checksumSection}`.trim();
}

if (process.argv[1] && process.argv[1].endsWith("extract-changelog.mjs")) {
  const tag = process.argv[2] || "v1.0.1";
  const outputPath = process.argv[3] || "release-notes.md";
  const sha256Path = process.argv[4] || "dist-apk/SHA256SUMS.txt";

  const changelogPath = path.join(process.cwd(), "CHANGELOG.md");
  const changelogContent = fs.existsSync(changelogPath)
    ? fs.readFileSync(changelogPath, "utf-8")
    : "";

  let sha256Content = "";
  if (fs.existsSync(sha256Path)) {
    sha256Content = fs.readFileSync(sha256Path, "utf-8");
  }

  const fullNotes = buildFullReleaseNotes(changelogContent, tag, sha256Content);
  fs.writeFileSync(outputPath, fullNotes, "utf-8");
  console.log(`[RELEASE NOTES] Berhasil diekstrak ke ${outputPath}`);
}
