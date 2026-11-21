import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

const isMobileBuild = process.env.BUILD_TARGET === "mobile";
const isProduction = process.env.NODE_ENV === "production";

let appVersion = "1.2.1";
try {
  const pkgPath = path.join(process.cwd(), "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  if (pkg.version) appVersion = pkg.version;
} catch {
  // fallback default
}

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://*.private.blob.vercel-storage.com",
      "font-src 'self' data:",
      "connect-src 'self' https://*.public.blob.vercel-storage.com https://*.private.blob.vercel-storage.com",
      "frame-ancestors 'none'",
    ].join("; "),
  },
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
  poweredByHeader: false,
  serverExternalPackages: ["sharp"],
  images: {
    unoptimized: isMobileBuild,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "*.private.blob.vercel-storage.com",
      },
    ],
  },
  ...(isMobileBuild
    ? {
        output: "export",
      }
    : {
        async headers() {
          return [
            {
              source: "/(.*)",
              headers: securityHeaders,
            },
          ];
        },
      }),
};

export default nextConfig;
