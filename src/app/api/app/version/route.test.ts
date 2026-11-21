import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, OPTIONS } from "./route";
import { NextRequest } from "next/server";
import { APP_VERSION } from "@/lib/version";

describe("US-207: GET /api/app/version Endpoint Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("OPTIONS preflight harus mengembalikan status yang tepat", async () => {
    const req = new NextRequest("http://localhost:3000/api/app/version", {
      method: "OPTIONS",
      headers: {
        Origin: "https://localhost",
      },
    });

    const res = await OPTIONS(req);
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe(
      "https://localhost"
    );
  });

  it("GET harus mengembalikan fallback 200 OK jika GitHub API gagal", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("GitHub API Unreachable")
    );

    const req = new NextRequest("http://localhost:3000/api/app/version", {
      method: "GET",
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.currentServerVersion).toBe(APP_VERSION);
    expect(data.latestVersion).toBe(APP_VERSION);
    expect(data.hasUpdate).toBe(false);
    expect(data.source).toBe("fallback");
  });

  it("GET harus mem-parsing release GitHub dengan benar jika tersedia versi baru", async () => {
    const mockRelease = {
      tag_name: "v2.0.0",
      name: "Ksatria Graphx v2.0.0",
      published_at: "2026-11-21T00:00:00Z",
      html_url: "https://github.com/Smurffahh/KsatriaGraphx/releases/tag/v2.0.0",
      body: "- Fitur baru\n- Peningkatan performa",
      assets: [
        {
          name: "KsatriaGraphx-v2.0.0-release.apk",
          browser_download_url:
            "https://github.com/Smurffahh/KsatriaGraphx/releases/download/v2.0.0/KsatriaGraphx-v2.0.0-release.apk",
        },
      ],
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockRelease), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const req = new NextRequest("http://localhost:3000/api/app/version", {
      method: "GET",
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.latestVersion).toBe("2.0.0");
    expect(data.tagName).toBe("v2.0.0");
    expect(data.hasUpdate).toBe(true);
    expect(data.downloadUrl).toContain("KsatriaGraphx-v2.0.0-release.apk");
    expect(data.changelogLines).toHaveLength(2);
  });
});
