"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Calculator,
  ClipboardList,
  Package,
  Users as UsersIcon,
  BarChart3,
  Settings,
  UserCheck,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Laptop,
  Smartphone,
  ChevronRight,
} from "lucide-react";
import { isNativeApp } from "@/lib/platform";
import { apiClient } from "@/lib/api/client";
import { secureStorage } from "@/lib/auth/secure-storage";

interface AuthUserData {
  id: string;
  name: string;
  username: string;
  email: string | null;
  role: "OWNER" | "KASIR";
  platform: "WEB" | "APK";
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  ownerOnly?: boolean;
  webOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: "Kalkulator POS", href: "/pos", icon: Calculator },
  { label: "Daftar Pesanan", href: "/orders", icon: ClipboardList },
  { label: "Katalog Produk", href: "/products", icon: Package },
  { label: "Pelanggan", href: "/customers", icon: UsersIcon },
  { label: "Laporan Omzet", href: "/reports", icon: BarChart3 },
  { label: "Pengaturan Toko", href: "/settings", icon: Settings },
  { label: "Kelola Pengguna", href: "/users", icon: UserCheck, ownerOnly: true, webOnly: true },
  { label: "Audit Log", href: "/audit-logs", icon: ShieldCheck, ownerOnly: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<AuthUserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNative, setIsNative] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    setIsNative(isNativeApp());

    async function loadCurrentUser() {
      try {
        const res = await apiClient<{ user: AuthUserData }>("/api/auth/me");
        if (res.success && res.data?.user) {
          setUser(res.data.user);
        } else {
          router.replace("/login");
        }
      } catch {
        router.replace("/login");
      } finally {
        setIsLoading(false);
      }
    }

    loadCurrentUser();
  }, [router]);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      if (isNative) {
        const refreshToken = await secureStorage.getRefreshToken();
        await apiClient("/api/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken: refreshToken || undefined }),
        });
        await secureStorage.clearTokens();
      } else {
        await apiClient("/api/auth/logout", { method: "POST" });
      }
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
      router.replace("/login");
    }
  }

  const isOwner = user?.role === "OWNER";

  const visibleNavItems = navItems.filter((item) => {
    if (item.ownerOnly && !isOwner) return false;
    if (item.webOnly && isNative) return false;
    return true;
  });

  const mobileBottomNavItems = [
    { label: "POS", href: "/pos", icon: Calculator },
    { label: "Pesanan", href: "/orders", icon: ClipboardList },
    { label: "Produk", href: "/products", icon: Package },
    { label: "Laporan", href: "/reports", icon: BarChart3 },
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-slate-900 border-t-transparent dark:border-slate-100" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Memuat Ksatria Graphx...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-50">
      {/* Mobile Top Header */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md md:hidden dark:border-slate-800 dark:bg-slate-900/95">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex size-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 active:scale-95 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Buka Menu"
          >
            <Menu className="size-5" />
          </button>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Ksatria Graphx
            </span>
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
              {isNative ? "Android APK" : "Web System"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              isOwner
                ? "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-500/30"
                : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-500/30"
            }`}
          >
            {user?.role}
          </span>
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 active:scale-95 dark:text-slate-400 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
            aria-label="Keluar"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      {/* Desktop Layout Container */}
      <div className="flex min-h-dvh">
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white md:flex dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-slate-900 font-black text-white dark:bg-slate-50 dark:text-slate-900">
                KG
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-50">
                  Ksatria Graphx
                </span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Percetakan & POS
                </span>
              </div>
            </div>
          </div>

          {/* User Profile Card */}
          <div className="border-b border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-200 font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : "KG"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {user?.name}
                </p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span
                    className={`inline-flex rounded px-1.5 py-0.2 text-[10px] font-bold ${
                      isOwner
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200"
                        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
                    }`}
                  >
                    {user?.role}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                    {isNative ? <Smartphone className="size-3" /> : <Laptop className="size-3" />}
                    {isNative ? "APK" : "Web"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-slate-900 text-white shadow-sm dark:bg-slate-50 dark:text-slate-900"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Logout Section */}
          <div className="border-t border-slate-200 p-3 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
            >
              <LogOut className="size-4 shrink-0" />
              <span>Keluar Sesi</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 pb-20 md:pb-8">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 md:px-8 md:py-6">{children}</div>
        </main>
      </div>

      {/* Mobile Drawer Navigation Modal */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative flex w-4/5 max-w-xs flex-col bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-50">Menu Navigasi</span>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="border-b border-slate-200 p-4 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{user?.name}</div>
              <div className="text-[11px] text-slate-500">@{user?.username}</div>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium ${
                      isActive
                        ? "bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="size-4" />
                      <span>{item.label}</span>
                    </div>
                    <ChevronRight className="size-3.5 opacity-40" />
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-slate-200 p-3 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setShowLogoutConfirm(true);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                <LogOut className="size-4" />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden dark:border-slate-800 dark:bg-slate-900/95">
        <div className="grid h-14 grid-cols-4 items-center">
          {mobileBottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 py-1 transition-colors ${
                  isActive
                    ? "font-semibold text-slate-900 dark:text-slate-50"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <Icon className={`size-5 ${isActive ? "scale-105" : ""}`} />
                <span className="text-[10px] tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => !isLoggingOut && setShowLogoutConfirm(false)}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">Konfirmasi Keluar</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Apakah Anda yakin ingin mengakhiri sesi kerja ini? Anda perlu memasukkan kredensial login kembali
              untuk mengakses sistem kasir.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={() => setShowLogoutConfirm(false)}
                className="h-10 rounded-xl px-4 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={handleLogout}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-rose-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 active:scale-95 disabled:opacity-50"
              >
                {isLoggingOut ? "Mengeluarkan..." : "Ya, Keluar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
