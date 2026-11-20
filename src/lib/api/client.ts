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

export async function apiClient<T = any>(
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
    credentials: isNative ? "same-origin" : "include",
  };

  const url = endpoint.startsWith("http") ? endpoint : endpoint;
  let response = await fetch(url, fetchOptions);

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

        const refreshRes = await fetch("/api/auth/refresh", {
          method: "POST",
          headers: refreshHeaders,
          body: refreshBody,
          credentials: isNative ? "same-origin" : "include",
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
          response = await fetch(url, { ...options, headers, credentials: isNative ? "same-origin" : "include" });
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
      const refreshedToken = await new Promise<string | null>((resolve) => {
        subscribeTokenRefresh(resolve);
      });

      if (refreshedToken && isNative) {
        headers.set("Authorization", `Bearer ${refreshedToken}`);
        response = await fetch(url, { ...options, headers, credentials: isNative ? "same-origin" : "include" });
      } else if (!isNative) {
        response = await fetch(url, { ...options, headers, credentials: "include" });
      }
    }
  }

  try {
    const data = await response.json();
    return data;
  } catch {
    return {
      success: false,
      error: response.ok ? "Format respons tidak valid" : `Permintaan gagal dengan status ${response.status}`,
    };
  }
}
