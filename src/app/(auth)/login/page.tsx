"use client";

import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Lock, User, AlertCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { m, AnimatePresence } from "motion/react";
import { isNativeApp } from "@/lib/platform";
import { secureStorage } from "@/lib/auth/secure-storage";
import { resolveApiUrl } from "@/lib/api/client";
import { formatVersionLabel } from "@/lib/version";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { PreLoginSplash } from "@/components/auth/PreLoginSplash";
import { useSplashTransition } from "@/components/providers/SplashTransitionProvider";
import { staggerContainer, fadeUpItem } from "@/lib/motion";

export default function LoginPage() {
  const { triggerPostLoginTransition } = useSplashTransition();

  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isNative, setIsNative] = useState(false);
  const [isSplashDone, setIsSplashDone] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    setIsNative(isNativeApp());
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!usernameOrEmail.trim() || !password.trim()) {
      setErrorMessage("Username/email dan password wajib diisi");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 380);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const isNativePlatform = isNativeApp();
    const loginUrl = resolveApiUrl("/api/auth/login", isNativePlatform);

    try {
      const response = await fetch(loginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-platform": isNativePlatform ? "apk" : "web",
        },
        credentials: isNativePlatform ? "omit" : "include",
        body: JSON.stringify({
          usernameOrEmail: usernameOrEmail.trim(),
          password,
          deviceName: isNativePlatform ? "Android POS" : "Web Desktop",
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        let errorMsg = "";
        if (response.status === 401) {
          errorMsg = "Username atau password salah.";
        } else if (response.status === 429) {
          errorMsg = "Terlalu banyak percobaan login. Silakan tunggu beberapa menit.";
        } else if (response.status === 403) {
          errorMsg = "Akses ditolak oleh kebijakan keamanan server (kode 403).";
        } else {
          errorMsg = data.error || `Terjadi kesalahan saat masuk ke sistem (kode ${response.status}).`;
        }
        setErrorMessage(errorMsg);
        toast.error(errorMsg);
        setIsLoading(false);
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 380);
        return;
      }

      if (isNativePlatform && data.data?.accessToken && data.data?.refreshToken) {
        try {
          await secureStorage.saveTokens({
            accessToken: data.data.accessToken,
            refreshToken: data.data.refreshToken,
          });
        } catch {
          const storageMsg = "Gagal menyimpan sesi terenkripsi di perangkat (kode STORAGE).";
          setErrorMessage(storageMsg);
          toast.error(storageMsg);
          setIsLoading(false);
          return;
        }
      }

      toast.success(`Berhasil masuk sebagai ${data.data?.user?.name || "Pengguna"}`);

      // Transisi personal pasca-login dengan pemanasan data paralel
      triggerPostLoginTransition({
        userName: data.data?.user?.name || "Pengguna",
        userRole: data.data?.user?.role || "KASIR",
        targetUrl: "/dashboard",
      });
    } catch {
      const netMsg = "Tidak dapat terhubung ke server. Periksa koneksi internet atau konfigurasi server (kode NET).";
      setErrorMessage(netMsg);
      toast.error(netMsg);
      setIsLoading(false);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 380);
    }
  }

  return (
    <>
      {/* Splash Screen Pra-Login (hanya muncul di sesi awal) */}
      <PreLoginSplash onComplete={() => setIsSplashDone(true)} />

      <main className="relative flex min-h-dvh flex-col items-center justify-center bg-background p-4 sm:p-6 text-foreground overflow-hidden">
        {/* Top Floating Theme Toggle */}
        <div className="absolute top-4 right-4 z-20">
          <ThemeToggle />
        </div>

        <m.div
          variants={staggerContainer(0.06)}
          initial="hidden"
          animate={isSplashDone ? "visible" : "hidden"}
          className="w-full max-w-[420px]"
        >
          {/* 1. Header Logo & Title */}
          <m.div variants={fadeUpItem} className="mb-7 flex flex-col items-center text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary font-bold text-xl text-primary-foreground shadow-xs">
              KG
            </div>
            <h1 className="mt-4 text-2xl sm:text-[28px] font-semibold tracking-tight text-foreground">
              Ksatria Graphx
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sistem Kasir &amp; Manajemen Percetakan
            </p>
          </m.div>

          {/* 2. Card Form dengan Micro-Shake saat Error */}
          <m.div
            variants={fadeUpItem}
            animate={isShaking ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : {}}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs"
          >
            <div className="mb-6 border-b border-border/80 pb-4">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Masuk ke Akun
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Gunakan kredensial yang telah didaftarkan
              </p>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-2.5 rounded-xl bg-destructive/10 p-3.5 text-sm text-destructive border border-destructive/20"
              >
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{errorMessage}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 3. Field Username */}
              <m.div variants={fadeUpItem}>
                <label
                  htmlFor="usernameOrEmail"
                  className="mb-1.5 block text-sm font-medium text-foreground"
                >
                  Username atau Email
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
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
                    className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-3.5 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring transition-colors"
                  />
                </div>
              </m.div>

              {/* 4. Field Password dengan Swap Ikon Halus */}
              <m.div variants={fadeUpItem}>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-foreground"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
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
                    className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-11 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex size-11 items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {showPassword ? (
                        <m.div
                          key="eye-off"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.15 }}
                        >
                          <EyeOff className="size-4" />
                        </m.div>
                      ) : (
                        <m.div
                          key="eye"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.15 }}
                        >
                          <Eye className="size-4" />
                        </m.div>
                      )}
                    </AnimatePresence>
                  </button>
                </div>
              </m.div>

              {/* 5. Tombol Submit */}
              <m.div variants={fadeUpItem} className="pt-2">
                <Button
                  type="submit"
                  size="lg"
                  disabled={isLoading}
                  className="w-full font-semibold shadow-xs"
                >
                  {isLoading ? "Memverifikasi..." : "Masuk ke Sistem"}
                </Button>
              </m.div>
            </form>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 shrink-0 text-emerald-500" />
              <span>Sistem terlindungi autentikasi sesi berlapis</span>
            </div>
          </m.div>

          {/* 6. Footer Keterangan Versi */}
          <m.div variants={fadeUpItem} className="mt-6 text-center">
            <span className="text-xs font-medium text-muted-foreground">
              {formatVersionLabel(isNative)}
            </span>
          </m.div>
        </m.div>
      </main>
    </>
  );
}
