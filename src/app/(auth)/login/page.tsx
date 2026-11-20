"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, User, AlertCircle, ShieldCheck } from "lucide-react";
import { isNativeApp } from "@/lib/platform";
import { secureStorage } from "@/lib/auth/secure-storage";

export default function LoginPage() {
  const router = useRouter();

  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!usernameOrEmail.trim() || !password.trim()) {
      setErrorMessage("Username/email dan password wajib diisi");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const isNative = isNativeApp();

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-platform": isNative ? "apk" : "web",
        },
        body: JSON.stringify({
          usernameOrEmail: usernameOrEmail.trim(),
          password,
          deviceName: isNative ? "Android POS" : "Web Desktop",
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        setErrorMessage(data.error || "Gagal masuk ke sistem. Silakan periksa kembali akun Anda.");
        setIsLoading(false);
        return;
      }

      if (isNative && data.data?.accessToken && data.data?.refreshToken) {
        await secureStorage.saveTokens({
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken,
        });
      }

      router.replace("/pos");
    } catch {
      setErrorMessage("Tidak dapat terhubung ke server. Periksa koneksi internet Anda.");
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-slate-100/70 p-4 dark:bg-slate-950 sm:p-6">
      <div className="w-full max-w-sm">
        {/* Header Logo & Title */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-900 font-black text-lg text-white shadow-sm dark:bg-slate-50 dark:text-slate-900">
            KG
          </div>
          <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
            Ksatria Graphx
          </h1>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Sistem Kasir & Manajemen Percetakan
          </p>
        </div>

        {/* Card Form */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div className="mb-5 border-b border-slate-100 pb-4 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Masuk ke Akun
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Gunakan kredensial yang telah didaftarkan
            </p>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-800/40"
            >
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="usernameOrEmail"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Username atau Email
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <User className="size-4" />
                </div>
                <input
                  id="usernameOrEmail"
                  name="usernameOrEmail"
                  type="text"
                  autoComplete="username"
                  required
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="Masukkan username atau email"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-100 dark:focus:ring-slate-100 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="size-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password akun"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-11 text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-100 dark:focus:ring-slate-100 sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex size-11 items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-slate-900" />
                    <span>Memverifikasi...</span>
                  </div>
                ) : (
                  <span>Masuk ke Sistem</span>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Sistem terlindungi autentikasi sesi berlapis</span>
          </div>
        </div>
      </div>
    </main>
  );
}
