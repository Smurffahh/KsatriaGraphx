import { NextResponse, type NextRequest } from "next/server";
import {
  APP_VERSION,
  compareSemver,
  isValidReleaseUrl,
  parseChangelogLines,
  type AppVersionResponse,
} from "@/lib/version";
import { getCorsHeaders, handleCorsPreflight, isOriginAllowed } from "@/lib/api/cors";

export type { AppVersionResponse };

interface CachedRelease {
  data: AppVersionResponse;
  timestamp: number;
}

// In-memory cache 5 menit untuk menghemat kuota GitHub API (rate limit 60 req/jam tanpa token)
let cachedRelease: CachedRelease | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const corsHeaders = origin && isOriginAllowed(origin) ? getCorsHeaders(origin) : {};

  const now = Date.now();
  if (cachedRelease && now - cachedRelease.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cachedRelease.data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        ...corsHeaders,
      },
    });
  }

  const fallbackData: AppVersionResponse = {
    currentServerVersion: APP_VERSION,
    latestVersion: APP_VERSION,
    tagName: `v${APP_VERSION}`,
    title: `Ksatria Graphx v${APP_VERSION}`,
    publishedAt: null,
    changelogLines: [],
    downloadUrl: null,
    releaseUrl: "https://github.com/Smurffahh/KsatriaGraphx/releases",
    hasUpdate: false,
    source: "fallback",
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
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      // Jika rate-limited atau rilis belum ada, kembalikan data fallback 200 OK
      return NextResponse.json(fallbackData, {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
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

    const downloadUrl = isValidReleaseUrl(candidateApkUrl) ? candidateApkUrl : null;
    const releaseUrl = isValidReleaseUrl(json.html_url)
      ? json.html_url
      : "https://github.com/Smurffahh/KsatriaGraphx/releases";

    const changelogLines = parseChangelogLines(json.body);
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
    };

    cachedRelease = {
      data,
      timestamp: now,
    };

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        ...corsHeaders,
      },
    });
  } catch {
    // Zero Crash Guarantee: Jangan pernah melempar 500 ke client
    return NextResponse.json(fallbackData, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        ...corsHeaders,
      },
    });
  }
}
