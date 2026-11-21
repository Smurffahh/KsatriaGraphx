import { isNativeApp } from "@/lib/platform";
import { secureStorage } from "@/lib/auth/secure-storage";

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: Record<string, string[]>;
  code?: string;
}

let isRefreshing = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];

function onRefreshed(token: string | null) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function subscribeTokenRefresh(cb: (token: string | null) => void) {
  refreshSubscribers.push(cb);
}

/**
 * Resolusi Base URL: Web menggunakan path relatif, APK mengarahkan ke NEXT_PUBLIC_API_BASE_URL.
 */
export function resolveApiUrl(endpoint: string, isNative: boolean): string {
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }
  if (isNative) {
    const baseUrl = (
      process.env.NEXT_PUBLIC_API_BASE_URL || "https://ksatriagraphx.vercel.app"
    ).replace(/\/$/, "");
    if (baseUrl) {
      return `${baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
    }
  }
  return endpoint;
}

async function baseApiClient<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const isNative = isNativeApp();
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  headers.set("x-client-platform", isNative ? "apk" : "web");

  if (isNative) {
    const accessToken = await secureStorage.getAccessToken();
    if (accessToken && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: isNative ? "omit" : "include",
  };

  const url = resolveApiUrl(endpoint, isNative);
  let response = await fetch(url, fetchOptions);

  // Auto-refresh token pada status 401 (kecuali panggilan login/refresh/logout itu sendiri)
  if (response.status === 401 && !endpoint.includes("/api/auth/")) {
    if (!isRefreshing) {
      isRefreshing = true;

      try {
        let refreshBody: string | undefined;
        const refreshHeaders: HeadersInit = {
          "x-client-platform": isNative ? "apk" : "web",
          "Content-Type": "application/json",
        };

        if (isNative) {
          const refreshToken = await secureStorage.getRefreshToken();
          if (refreshToken) {
            refreshBody = JSON.stringify({ refreshToken });
          }
        }

        const refreshUrl = resolveApiUrl("/api/auth/refresh", isNative);
        const refreshRes = await fetch(refreshUrl, {
          method: "POST",
          headers: refreshHeaders,
          body: refreshBody,
          credentials: isNative ? "omit" : "include",
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          let newToken: string | null = null;

          if (isNative && refreshData.data?.accessToken) {
            newToken = refreshData.data.accessToken;
            await secureStorage.saveTokens({
              accessToken: refreshData.data.accessToken,
              refreshToken: refreshData.data.refreshToken,
            });
          }

          onRefreshed(newToken);
          isRefreshing = false;

          if (isNative && newToken) {
            headers.set("Authorization", `Bearer ${newToken}`);
          }
          response = await fetch(url, {
            ...options,
            headers,
            credentials: isNative ? "omit" : "include",
          });
        } else {
          onRefreshed(null);
          isRefreshing = false;
          await secureStorage.clearTokens();
          if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
            window.location.href = "/login";
          }
        }
      } catch {
        onRefreshed(null);
        isRefreshing = false;
      }
    } else {
      // Shared promise lock untuk request paralel yang menunggu refresh selesai
      const refreshedToken = await new Promise<string | null>((resolve) => {
        subscribeTokenRefresh(resolve);
      });

      if (refreshedToken && isNative) {
        headers.set("Authorization", `Bearer ${refreshedToken}`);
        response = await fetch(url, {
          ...options,
          headers,
          credentials: "omit",
        });
      } else if (!isNative) {
        response = await fetch(url, {
          ...options,
          headers,
          credentials: "include",
        });
      }
    }
  }

  try {
    const data = await response.json();
    if (data && !data.success && data.details && typeof data.details === "object") {
      const fieldKeys = Object.keys(data.details);
      if (fieldKeys.length > 0) {
        const firstField = fieldKeys[0];
        const msgs = data.details[firstField];
        if (Array.isArray(msgs) && msgs.length > 0 && msgs[0]) {
          if (!data.error || data.error.includes("gagal") || data.error.includes("tidak valid")) {
            data.error = `Validasi gagal: ${msgs[0]}`;
          }
        }
      }
    }
    return data;
  } catch {
    return {
      success: false,
      error: response.ok
        ? "Format respons tidak valid"
        : `Permintaan gagal dengan status ${response.status}`,
    };
  }
}

export interface ApiClientInstance {
  <T = any>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>>;
  get<T = any>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>>;
  post<T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<ApiResponse<T>>;
  patch<T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<ApiResponse<T>>;
  delete<T = any>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>>;
}

export const apiClient: ApiClientInstance = Object.assign(baseApiClient, {
  get: async <T = any>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> => {
    return baseApiClient<T>(endpoint, { ...options, method: "GET" });
  },
  post: async <T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<ApiResponse<T>> => {
    return baseApiClient<T>(endpoint, {
      ...options,
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  },
  patch: async <T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<ApiResponse<T>> => {
    return baseApiClient<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  },
  delete: async <T = any>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> => {
    return baseApiClient<T>(endpoint, { ...options, method: "DELETE" });
  },
});
