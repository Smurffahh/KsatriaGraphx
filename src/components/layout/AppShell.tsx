"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Calculator,
  ClipboardList,
  Package,
  Users as UsersIcon,
  BarChart3,
  Settings,
  UserCheck,
  ShieldCheck,
  LogOut,
  Menu as MenuIcon,
  Plus,
  Printer,
  ChevronRight,
} from "lucide-react";
import { isNativeApp } from "@/lib/platform";
import { apiClient } from "@/lib/api/client";
import { secureStorage } from "@/lib/auth/secure-storage";
import { formatVersionBadge, formatVersionLabel } from "@/lib/version";
import { toast } from "sonner";
import { ThemeToggle } from "./ThemeToggle";
import { AppShellSkeleton } from "./AppShellSkeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

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

const mainNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Kalkulator POS", href: "/pos", icon: Calculator },
  { label: "Daftar Pesanan", href: "/orders", icon: ClipboardList },
  { label: "Katalog Produk", href: "/products", icon: Package },
  { label: "Pelanggan", href: "/customers", icon: UsersIcon },
];

const managementNavItems: NavItem[] = [
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
  const [isMenuSheetOpen, setIsMenuSheetOpen] = useState(false);
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
      setIsMenuSheetOpen(false);
      toast.success("Berhasil keluar dari sesi.");
      router.replace("/login");
    }
  }

  const isOwner = user?.role === "OWNER";

  // Filter menu manajemen desktop
  const allowedManagementItems = useMemo(() => {
    return managementNavItems
      .filter((item) => {
        if (item.href === "/settings") {
          return isOwner || isNative;
        }
        if (item.ownerOnly && !isOwner) return false;
        if (item.webOnly && isNative) return false;
        return true;
      })
      .map((item) => {
        if (item.href === "/settings" && !isOwner && isNative) {
          return { ...item, label: "Printer Kasir", icon: Printer };
        }
        return item;
      });
  }, [isOwner, isNative]);

  // Judul dan subjudul halaman aktif untuk Top Bar
  const pageMeta = useMemo(() => {
    if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
      return { title: "Dashboard", subtitle: "Ringkasan performa toko & penjualan" };
    }
    if (pathname === "/pos" || pathname.startsWith("/pos/")) {
      return { title: "Kalkulator POS", subtitle: "Hitung otomatis & simpan nota kasir" };
    }
    if (pathname === "/orders" || pathname.startsWith("/orders/")) {
      return { title: "Daftar Pesanan", subtitle: "Riwayat transaksi & status produksi" };
    }
    if (pathname === "/products" || pathname.startsWith("/products/")) {
      return { title: "Katalog Produk", subtitle: "Pengelolaan produk, bahan & finishing" };
    }
    if (pathname === "/customers" || pathname.startsWith("/customers/")) {
      return { title: "Data Pelanggan", subtitle: "Daftar kontak & riwayat pelanggan" };
    }
    if (pathname === "/reports" || pathname.startsWith("/reports/")) {
      return { title: "Laporan Omzet", subtitle: "Rekapitulasi penjualan & arus kas" };
    }
    if (pathname === "/settings" || pathname.startsWith("/settings/")) {
      return {
        title: isOwner ? "Pengaturan Toko" : "Printer Bluetooth",
        subtitle: isOwner
          ? "Konfigurasi toko, nota & preferensi sistem"
          : "Koneksi printer thermal kasir ESC/POS",
      };
    }
    if (pathname === "/users" || pathname.startsWith("/users/")) {
      return { title: "Kelola Pengguna", subtitle: "Manajemen akun & otorisasi kasir" };
    }
    if (pathname === "/audit-logs" || pathname.startsWith("/audit-logs/")) {
      return { title: "Audit Log Forensik", subtitle: "Rekam jejak aktivitas sensitif sistem" };
    }
    return { title: "Ksatria Graphx", subtitle: "Sistem Manajemen Percetakan & POS" };
  }, [pathname, isOwner]);

  if (isLoading) {
    return <AppShellSkeleton />;
  }

  return (
    <div className="min-h-dvh bg-background text-foreground antialiased flex flex-col">
      {/* ========================================================= */}
      {/* MOBILE TOP BAR (< 1024px) — 0 HAMBURGER                   */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card/90 px-4 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary font-black text-xs text-primary-foreground shadow-xs">
            KG
          </div>
          <div className="flex flex-col min-w-0">
            <span className="truncate text-sm font-bold tracking-tight text-foreground">
              {pageMeta.title}
            </span>
            <span className="text-[10px] text-muted-foreground truncate">
              {isNative ? "Android APK" : "Web System"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant={isOwner ? "default" : "secondary"}
            className="text-[10px] px-2 py-0.5 uppercase tracking-wider"
          >
            {user?.role}
          </Badge>
          <ThemeToggle />
        </div>
      </header>

      {/* ========================================================= */}
      {/* DESKTOP + MAIN CONTAINER                                   */}
      {/* ========================================================= */}
      <div className="flex flex-1 min-w-0">
        {/* ======================================================= */}
        {/* DESKTOP FIXED SIDEBAR (>= 1024px)                       */}
        {/* ======================================================= */}
        <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card lg:flex">
          {/* Brand Header */}
          <div className="flex h-14 items-center gap-2.5 border-b border-border px-5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary font-black text-xs text-primary-foreground shadow-xs">
              KG
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-foreground leading-none">
                Ksatria Graphx
              </span>
              <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                POS & Percetakan
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
            {/* Navigasi Utama */}
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Menu Utama
              </span>
              <nav className="mt-1.5 space-y-0.5">
                {mainNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-colors min-h-[38px] ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Navigasi Manajemen */}
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Manajemen
              </span>
              <nav className="mt-1.5 space-y-0.5">
                {allowedManagementItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-colors min-h-[38px] ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Sidebar Footer Profile & Version */}
          <div className="border-t border-border p-3 space-y-3">
            <div className="flex items-center justify-between gap-2 rounded-xl bg-muted/60 p-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-card text-xs font-bold text-foreground border border-border shadow-xs">
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : "KG"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-foreground leading-tight">
                    {user?.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate uppercase font-semibold">
                    {user?.role}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                title="Keluar Sesi"
                aria-label="Keluar Sesi"
              >
                <LogOut className="size-3.5" />
              </button>
            </div>

            {/* Badge Versi Single Source of Truth */}
            <div className="text-center">
              <span className="inline-block text-[10px] font-medium text-muted-foreground/80">
                {formatVersionBadge(isNative)}
              </span>
            </div>
          </div>
        </aside>

        {/* ======================================================= */}
        {/* MAIN CONTENT AREA & DESKTOP TOP BAR                     */}
        {/* ======================================================= */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Desktop Sticky Topbar (>= 1024px) */}
          <header className="hidden h-14 items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur-md lg:flex sticky top-0 z-20">
            <div>
              <h1 className="text-base font-bold text-foreground leading-tight">
                {pageMeta.title}
              </h1>
              <p className="text-xs text-muted-foreground leading-none mt-0.5">
                {pageMeta.subtitle}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link href="/pos">
                <Button size="sm" className="gap-1.5 rounded-xl font-semibold shadow-xs">
                  <Plus className="size-4" />
                  <span>Transaksi Baru</span>
                </Button>
              </Link>
            </div>
          </header>

          {/* Main Content Body */}
          <main className="flex-1 pb-24 lg:pb-8 min-w-0">
            {children}
          </main>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MOBILE BOTTOM NAVIGATION BAR (< 1024px) — 5 SLOTS         */}
      {/* ========================================================= */}
      <nav className="fixed inset-x-0 bottom-0 z-30 h-16 border-t border-border bg-card/95 pb-[max(0.25rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden grid grid-cols-5 items-center px-1">
        {/* 1. Dashboard */}
        <Link
          href="/dashboard"
          className={`flex flex-col items-center justify-center gap-1 py-1 min-h-[44px] transition-colors rounded-xl ${
            pathname === "/dashboard"
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <LayoutDashboard className="size-4.5" />
          <span className="text-[10px] tracking-tight">Dashboard</span>
        </Link>

        {/* 2. POS (Disorot sebagai Aksi Kasir Utama) */}
        <Link
          href="/pos"
          className={`flex flex-col items-center justify-center gap-1 py-1 min-h-[44px] transition-colors rounded-xl ${
            pathname === "/pos"
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className={`p-1 rounded-lg ${pathname === "/pos" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
            <Calculator className="size-4" />
          </div>
          <span className="text-[10px] tracking-tight">POS</span>
        </Link>

        {/* 3. Pesanan */}
        <Link
          href="/orders"
          className={`flex flex-col items-center justify-center gap-1 py-1 min-h-[44px] transition-colors rounded-xl ${
            pathname.startsWith("/orders")
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ClipboardList className="size-4.5" />
          <span className="text-[10px] tracking-tight">Pesanan</span>
        </Link>

        {/* 4. Produk */}
        <Link
          href="/products"
          className={`flex flex-col items-center justify-center gap-1 py-1 min-h-[44px] transition-colors rounded-xl ${
            pathname.startsWith("/products")
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Package className="size-4.5" />
          <span className="text-[10px] tracking-tight">Produk</span>
        </Link>

        {/* 5. Menu (Buka Bottom Sheet) */}
        <button
          type="button"
          onClick={() => setIsMenuSheetOpen(true)}
          className={`flex flex-col items-center justify-center gap-1 py-1 min-h-[44px] transition-colors rounded-xl ${
            isMenuSheetOpen || pathname === "/customers" || pathname === "/reports" || pathname === "/settings" || pathname === "/users" || pathname === "/audit-logs"
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label="Buka Menu Lainnya"
        >
          <MenuIcon className="size-4.5" />
          <span className="text-[10px] tracking-tight">Menu</span>
        </button>
      </nav>

      {/* ========================================================= */}
      {/* BOTTOM SHEET "MENU LAINNYA" (MOBILE ONLY)                 */}
      {/* ========================================================= */}
      <Sheet open={isMenuSheetOpen} onOpenChange={setIsMenuSheetOpen}>
        <SheetContent side="bottom" className="p-5 max-w-lg mx-auto space-y-4">
          <SheetHeader className="text-left space-y-1">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base font-bold">Menu & Pengaturan</SheetTitle>
              <Badge variant="outline" className="text-[10px] uppercase">
                {user?.role}
              </Badge>
            </div>
            <SheetDescription className="text-xs text-muted-foreground">
              Akses cepat ke modul sekunder, pelanggan, laporan, dan preferensi toko
            </SheetDescription>
          </SheetHeader>

          {/* User Info Card in Sheet */}
          <div className="flex items-center gap-3 rounded-2xl bg-muted/60 p-3 border border-border/80">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-card text-sm font-bold text-foreground border border-border shadow-xs">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : "KG"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-foreground">
                {user?.name}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {isNative ? "Android APK Native" : "Web Desktop System"}
              </p>
            </div>
          </div>

          <Separator />

          {/* Secondary Links List */}
          <div className="space-y-1">
            {/* Pelanggan */}
            <Link
              href="/customers"
              onClick={() => setIsMenuSheetOpen(false)}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-muted text-xs font-semibold text-foreground transition-colors min-h-[44px]"
            >
              <div className="flex items-center gap-3">
                <UsersIcon className="size-4 text-primary" />
                <span>Data Pelanggan</span>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>

            {/* Laporan Omzet */}
            <Link
              href="/reports"
              onClick={() => setIsMenuSheetOpen(false)}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-muted text-xs font-semibold text-foreground transition-colors min-h-[44px]"
            >
              <div className="flex items-center gap-3">
                <BarChart3 className="size-4 text-primary" />
                <span>Laporan Omzet Penjualan</span>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>

            {/* Pengaturan / Printer Bluetooth */}
            {(isOwner || isNative) && (
              <Link
                href="/settings"
                onClick={() => setIsMenuSheetOpen(false)}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-muted text-xs font-semibold text-foreground transition-colors min-h-[44px]"
              >
                <div className="flex items-center gap-3">
                  {isNative && !isOwner ? (
                    <Printer className="size-4 text-primary" />
                  ) : (
                    <Settings className="size-4 text-primary" />
                  )}
                  <span>{isNative && !isOwner ? "Printer Bluetooth Kasir" : "Pengaturan Toko & Nota"}</span>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            )}

            {/* Audit Log (Owner Only) */}
            {isOwner && (
              <Link
                href="/audit-logs"
                onClick={() => setIsMenuSheetOpen(false)}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-muted text-xs font-semibold text-foreground transition-colors min-h-[44px]"
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="size-4 text-primary" />
                  <span>Audit Log Forensik</span>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            )}

            {/* Kelola Pengguna (Owner + Web Only — 100% hidden in APK) */}
            {isOwner && !isNative && (
              <Link
                href="/users"
                onClick={() => setIsMenuSheetOpen(false)}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-muted text-xs font-semibold text-foreground transition-colors min-h-[44px]"
              >
                <div className="flex items-center gap-3">
                  <UserCheck className="size-4 text-primary" />
                  <span>Kelola Akun Pengguna</span>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            )}
          </div>

          <Separator />

          {/* Footer Sheet: Version & Logout */}
          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">
              {formatVersionLabel(isNative)}
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setIsMenuSheetOpen(false);
                setShowLogoutConfirm(true);
              }}
              className="gap-1.5"
            >
              <LogOut className="size-3.5" />
              <span>Keluar Sesi</span>
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ========================================================= */}
      {/* LOGOUT CONFIRMATION DIALOG                                */}
      {/* ========================================================= */}
      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Konfirmasi Keluar Sesi</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin mengakhiri sesi kerja ini? Anda perlu memasukkan kredensial login kembali untuk mengakses sistem kasir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              disabled={isLoggingOut}
              onClick={() => setShowLogoutConfirm(false)}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={isLoggingOut}
              onClick={handleLogout}
            >
              {isLoggingOut ? "Mengeluarkan..." : "Ya, Keluar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
