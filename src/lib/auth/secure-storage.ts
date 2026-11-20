import { isNativeApp } from "@/lib/platform";

const ACCESS_TOKEN_KEY = "kgx_access_token";
const REFRESH_TOKEN_KEY = "kgx_refresh_token";

export interface SecureStorageTokens {
  accessToken: string;
  refreshToken: string;
}

export const secureStorage = {
  async saveTokens(tokens: SecureStorageTokens): Promise<void> {
    if (typeof window === "undefined") return;

    if (isNativeApp()) {
      try {
        const globalAny = window as unknown as {
          CapacitorSecureStorage?: {
            set: (options: { key: string; value: string }) => Promise<void>;
          };
        };

        if (globalAny.CapacitorSecureStorage) {
          await globalAny.CapacitorSecureStorage.set({
            key: ACCESS_TOKEN_KEY,
            value: tokens.accessToken,
          });
          await globalAny.CapacitorSecureStorage.set({
            key: REFRESH_TOKEN_KEY,
            value: tokens.refreshToken,
          });
          return;
        }
      } catch {
        // Fallback jika plugin native belum dihubungkan
      }
      sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
      sessionStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    }
  },

  async getAccessToken(): Promise<string | null> {
    if (typeof window === "undefined") return null;

    if (isNativeApp()) {
      try {
        const globalAny = window as unknown as {
          CapacitorSecureStorage?: {
            get: (options: { key: string }) => Promise<{ value: string }>;
          };
        };

        if (globalAny.CapacitorSecureStorage) {
          const res = await globalAny.CapacitorSecureStorage.get({ key: ACCESS_TOKEN_KEY });
          return res.value || null;
        }
      } catch {
        // Fallback
      }
      return sessionStorage.getItem(ACCESS_TOKEN_KEY);
    }

    return null;
  },

  async getRefreshToken(): Promise<string | null> {
    if (typeof window === "undefined") return null;

    if (isNativeApp()) {
      try {
        const globalAny = window as unknown as {
          CapacitorSecureStorage?: {
            get: (options: { key: string }) => Promise<{ value: string }>;
          };
        };

        if (globalAny.CapacitorSecureStorage) {
          const res = await globalAny.CapacitorSecureStorage.get({ key: REFRESH_TOKEN_KEY });
          return res.value || null;
        }
      } catch {
        // Fallback
      }
      return sessionStorage.getItem(REFRESH_TOKEN_KEY);
    }

    return null;
  },

  async clearTokens(): Promise<void> {
    if (typeof window === "undefined") return;

    if (isNativeApp()) {
      try {
        const globalAny = window as unknown as {
          CapacitorSecureStorage?: {
            remove: (options: { key: string }) => Promise<void>;
          };
        };

        if (globalAny.CapacitorSecureStorage) {
          await globalAny.CapacitorSecureStorage.remove({ key: ACCESS_TOKEN_KEY });
          await globalAny.CapacitorSecureStorage.remove({ key: REFRESH_TOKEN_KEY });
        }
      } catch {
        // Fallback
      }
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  },
};
