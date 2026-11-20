import { isNativeApp } from "@/lib/platform";
import { SecureStorage } from "@aparajita/capacitor-secure-storage";

const ACCESS_TOKEN_KEY = "kgx_access_token";
const REFRESH_TOKEN_KEY = "kgx_refresh_token";

export interface SecureStorageTokens {
  accessToken: string;
  refreshToken: string;
}

export const secureStorage = {
  /**
   * Menyimpan pasangan Access Token & Refresh Token ke Android Keystore terenkripsi.
   * Pada browser Web (isNativeApp() === false), fungsi ini adalah no-op karena Web menggunakan HttpOnly Cookie.
   */
  async saveTokens(tokens: SecureStorageTokens): Promise<void> {
    if (typeof window === "undefined" || !isNativeApp()) {
      return;
    }

    try {
      await SecureStorage.set(ACCESS_TOKEN_KEY, tokens.accessToken);
      await SecureStorage.set(REFRESH_TOKEN_KEY, tokens.refreshToken);
    } catch (err) {
      console.error("[SecureStorage] Gagal menyimpan token ke Keystore:", err);
    }
  },

  /**
   * Mengambil Access Token dari Android Keystore terenkripsi.
   * Pada Web selalu mengembalikan null (autentikasi ditangani via Cookie HttpOnly).
   */
  async getAccessToken(): Promise<string | null> {
    if (typeof window === "undefined" || !isNativeApp()) {
      return null;
    }

    try {
      const val = await SecureStorage.get(ACCESS_TOKEN_KEY);
      return typeof val === "string" ? val : null;
    } catch {
      return null;
    }
  },

  /**
   * Mengambil Refresh Token dari Android Keystore terenkripsi.
   * Pada Web selalu mengembalikan null.
   */
  async getRefreshToken(): Promise<string | null> {
    if (typeof window === "undefined" || !isNativeApp()) {
      return null;
    }

    try {
      const val = await SecureStorage.get(REFRESH_TOKEN_KEY);
      return typeof val === "string" ? val : null;
    } catch {
      return null;
    }
  },

  /**
   * Menghapus seluruh token dari Android Keystore saat logout atau sesi dicabut.
   */
  async clearTokens(): Promise<void> {
    if (typeof window === "undefined" || !isNativeApp()) {
      return;
    }

    try {
      await SecureStorage.remove(ACCESS_TOKEN_KEY);
      await SecureStorage.remove(REFRESH_TOKEN_KEY);
    } catch (err) {
      console.error("[SecureStorage] Gagal menghapus token:", err);
    }
  },
};
