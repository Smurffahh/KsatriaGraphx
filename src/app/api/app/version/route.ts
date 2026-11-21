import { NextResponse, type NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import {
  APP_VERSION,
  compareSemver,
  isValidReleaseUrl,
  parseChangelogLines,
  type AppVersionResponse,
} from "@/lib/version";
import { getCorsHeaders, handleCorsPreflight, isOriginAllowed } from "@/lib/api/cors";

export type { AppVersionResponse };

export const dynamic = "force-dynamic";

interface CachedRelease {
  data: AppVersionResponse;
  timestamp: number;
}

// In-memory cache 3 menit untuk menghemat kuota GitHub API jika tidak ada query ?force=1
let cachedRelease: CachedRelease | null = null;
const CACHE_TTL_MS = 3 * 60 * 1000;

/**
 * Ekstraksi fallback catatan rilis langsung dari berkas CHANGELOG.md lokal di server.
 */
function getLocalChangelogLines(tag: string, maxLines: number = 10): string[] {
  try {
    const changelogPath = path.join(process.cwd(), "CHANGELOG.md");
    if (!fs.existsSync(changelogPath)) return [];
    const content = fs.readFileSync(changelogPath, "utf-8");
    const cleanTag = tag.trim().replace(/^[vV]/, "");
    const lines = content.split(/\r?\n/);
    let capturing = false;
    const captured: string[] = [];
    const targetHeaderRegex = new RegExp(`^##\\s*\\[v?${cleanTag.replace(/\./g, "\\.")}\\]`, "i");
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
        captured.push(line);
      }
    }
    return parseChangelogLines(captured.join("\n"), maxLines);
  } catch {
    return [];
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const corsHeaders = origin && isOriginAllowed(origin) ? getCorsHeaders(origin) : {};

  const searchParams = request.nextUrl.searchParams;
  const isForce = searchParams.get("force") === "1" || searchParams.get("refresh") === "1";

  const cacheHeaders = {
    "Cache-Control": isForce
      ? "no-store, no-cache, must-revalidate, proxy-revalidate"
      : "no-store, max-age=0",
    Pragma: "no-cache",
    Expires: "0",
  };

  const now = Date.now();
  if (!isForce && cachedRelease && now - cachedRelease.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cachedRelease.data, {
      status: 200,
      headers: {
        ...cacheHeaders,
        ...corsHeaders,
      },
    });
  }

  const fallbackChangelog = getLocalChangelogLines(APP_VERSION);
  const fallbackData: AppVersionResponse = {
    currentServerVersion: APP_VERSION,
    latestVersion: APP_VERSION,
    tagName: `v${APP_VERSION}`,
    title: `Ksatria Graphx v${APP_VERSION}`,
    publishedAt: null,
    changelogLines: fallbackChangelog,
    downloadUrl: `https://github.com/Smurffahh/KsatriaGraphx/releases/download/v${APP_VERSION}/KsatriaGraphx-v${APP_VERSION}-release.apk`,
    releaseUrl: "https://github.com/Smurffahh/KsatriaGraphx/releases/latest",
    hasUpdate: false,
    source: "server-fallback",
    serverVersion: APP_VERSION,
  };

  try {
    const headers: Record<string, string> = {
      "User-Agent": "KsatriaGraphx-App",
      Accept: "application/vnd.github.v3+json",
    };

    const ghToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    if (ghToken) {
      headers.Authorization = `Bearer ${ghToken}`;
    }

    const response = await fetch(
      "https://api.github.com/repos/Smurffahh/KsatriaGraphx/releases/latest",
      {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
      }
    );

    if (!response.ok) {
      return NextResponse.json(fallbackData, {
        status: 200,
        headers: {
          ...cacheHeaders,
          ...corsHeaders,
        },
      });
    }

    const json = await response.json();
    const tagName = String(json.tag_name || `v${APP_VERSION}`).trim();
    const cleanVersion = tagName.replace(/^[vV]/, "").trim();

    // Cari aset APK resmi
    let candidateApkUrl: string | null = null;
    if (Array.isArray(json.assets)) {
      const apkAsset = json.assets.find(
        (a: { name?: string; browser_download_url?: string }) =>
          typeof a.name === "string" && a.name.toLowerCase().endsWith(".apk")
      );
      if (apkAsset?.browser_download_url) {
        candidateApkUrl = apkAsset.browser_download_url;
      }
    }

    // Jika asset belum terpasang di rilis, sediakan standar URL download GitHub
    if (!candidateApkUrl) {
      candidateApkUrl = `https://github.com/Smurffahh/KsatriaGraphx/releases/download/${tagName}/KsatriaGraphx-${tagName}-release.apk`;
    }

    const downloadUrl = isValidReleaseUrl(candidateApkUrl) ? candidateApkUrl : null;
    const releaseUrl = isValidReleaseUrl(json.html_url)
      ? json.html_url
      : "https://github.com/Smurffahh/KsatriaGraphx/releases";

    let changelogLines = parseChangelogLines(json.body);
    if (changelogLines.length === 0) {
      changelogLines = getLocalChangelogLines(cleanVersion);
    }

    const hasUpdate = compareSemver(cleanVersion, APP_VERSION) > 0;

    const data: AppVersionResponse = {
      currentServerVersion: APP_VERSION,
      latestVersion: cleanVersion,
      tagName,
      title: String(json.name || `Ksatria Graphx v${cleanVersion}`).trim(),
      publishedAt: json.published_at ? String(json.published_at) : null,
      changelogLines,
      downloadUrl,
      releaseUrl,
      hasUpdate,
      source: "github",
      serverVersion: APP_VERSION,
    };

    cachedRelease = {
      data,
      timestamp: now,
    };

    return NextResponse.json(data, {
      status: 200,
      headers: {
        ...cacheHeaders,
        ...corsHeaders,
      },
    });
  } catch {
    return NextResponse.json(fallbackData, {
      status: 200,
      headers: {
        ...cacheHeaders,
        ...corsHeaders,
      },
    });
  }
}
