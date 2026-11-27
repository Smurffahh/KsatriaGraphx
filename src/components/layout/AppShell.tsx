"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Calculator, Plus, Printer, ArrowUpCircle } from "lucide-react";
import { isNativeApp } from "@/lib/platform";
import { apiClient } from "@/lib/api/client";
import { secureStorage } from "@/lib/auth/secure-storage";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { UpdateNoticeModal } from "./UpdateNoticeModal";
import { QuickCalculatorSheet } from "@/components/calculator/QuickCalculatorSheet";
import { toast } from "sonner";
import { ThemeToggle } from "./ThemeToggle";
import { AppShellSkeleton } from "./AppShellSkeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { m } from "motion/react";
import { EASE_SMOOTH } from "@/lib/motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getPageMeta,
  managementNavItems,
  type AuthUserData,
} from "./nav-config";
import { SidebarNav } from "./SidebarNav";
import { MobileBottomNav } from "./MobileBottomNav";
import { MobileMenuDrawer } from "./MobileMenuDrawer";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<AuthUserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNative, setIsNative] = useState(false);
  const [isMenuSheetOpen, setIsMenuSheetOpen] = useState(false);
  const [isQuickCalcOpen, setIsQuickCalcOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const {
    versionData,
    currentVersion,
    latestVersion,
    hasUpdate,
    isUpdateAvailable,
    isModalOpen,
    setIsModalOpen,
    dismissUpdate,
    checkForUpdate,
  } = useAppUpdate();

  useEffect(() => {
    if (isUpdateAvailable) {
      setIsModalOpen(true);
    }
  }, [isUpdateAvailable, setIsModalOpen]);

  useEffect(() => {
    let lastActive = Date.now();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const now = Date.now();
        if (now - lastActive > 30 * 60 * 1000) {
          checkForUpdate({ force: true, silent: true });
        }
        lastActive = now;
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkForUpdate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setIsQuickCalcOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  const pageMeta = useMemo(
    () => getPageMeta(pathname, isOwner),
    [pathname, isOwner]
  );

  if (isLoading) {
    return <AppShellSkeleton />;
  }

  return (
    <div className="min-h-dvh bg-background text-foreground antialiased flex flex-col">
      <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-2 border-b border-border bg-card/90 px-4 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary font-bold text-sm text-primary-foreground shadow-2xs">
            KG
          </div>
          <div className="flex flex-col min-w-0">
            <span className="truncate text-base font-semibold tracking-tight text-foreground">
              {pageMeta.title}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {isNative ? "Android APK" : "Web System"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasUpdate && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="relative flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors hover:bg-primary/20 cursor-pointer"
              title={`Pembaruan v${latestVersion} tersedia`}
              aria-label="Pembaruan Aplikasi Tersedia"
            >
              <span className="absolute top-2 right-2 flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex size-2 rounded-full bg-primary"></span>
              </span>
              <ArrowUpCircle className="size-4.5" />
            </button>
          )}
          <Badge
            variant={isOwner ? "default" : "secondary"}
            className="text-xs px-2.5 py-0.5 uppercase tracking-wider shrink-0"
          >
            {user?.role}
          </Badge>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-1 min-w-0">
        <SidebarNav
          pathname={pathname}
          user={user}
          allowedManagementItems={allowedManagementItems}
          isNative={isNative}
          hasUpdate={hasUpdate}
          latestVersion={latestVersion}
          onOpenUpdateModal={() => setIsModalOpen(true)}
          onRequestLogout={() => setShowLogoutConfirm(true)}
        />

        <div className="flex flex-1 flex-col min-w-0">
          <header className="hidden h-16 items-center justify-between border-b border-border bg-background/85 px-6 lg:px-8 backdrop-blur-md lg:flex sticky top-0 z-30">
            <div className="min-w-0">
              <p className="text-base font-semibold text-foreground leading-tight truncate">
                {pageMeta.title}
              </p>
              <p className="text-xs text-muted-foreground leading-snug mt-0.5 truncate">
                {pageMeta.subtitle}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {hasUpdate && (
                <Button
                  variant="outline"
                  onClick={() => setIsModalOpen(true)}
                  className="gap-2 border-primary/40 text-primary bg-primary/5 hover:bg-primary/10"
                >
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex size-2 rounded-full bg-primary"></span>
                  </span>
                  <span>Pembaruan v{latestVersion}</span>
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsQuickCalcOpen(true)}
                className="gap-2 rounded-xl text-sm font-medium shadow-2xs hover:bg-accent"
                title="Buka Kalkulator Cepat (Alt+K)"
              >
                <Calculator className="size-4 text-primary" />
                <span>Cek Harga</span>
                <kbd className="pointer-events-none ml-1 hidden rounded-md border border-border bg-muted/80 px-1.5 py-0.5 font-mono text-xs font-medium text-muted-foreground lg:inline-block">
                  Alt+K
                </kbd>
              </Button>
              <ThemeToggle />
              <Link href="/pos">
                <Button className="gap-2 rounded-xl font-semibold shadow-2xs">
                  <Plus className="size-4" />
                  <span>Transaksi Baru</span>
                </Button>
              </Link>
            </div>
          </header>

          <main
            className={`flex-1 min-w-0 bg-muted/40 dark:bg-background lg:pb-10 ${
              pathname === "/pos" ? "pb-36" : "pb-24"
            }`}
          >
            <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
              <m.div
                key={pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, ease: EASE_SMOOTH }}
              >
                {children}
              </m.div>
            </div>
          </main>
        </div>
      </div>

      <MobileBottomNav
        pathname={pathname}
        isMenuOpen={isMenuSheetOpen}
        isQuickCalcOpen={isQuickCalcOpen}
        onOpenQuickCalc={() => setIsQuickCalcOpen(true)}
        onOpenMenu={() => setIsMenuSheetOpen(true)}
      />

      <MobileMenuDrawer
        open={isMenuSheetOpen}
        onOpenChange={setIsMenuSheetOpen}
        pathname={pathname}
        user={user}
        isOwner={isOwner}
        isNative={isNative}
        hasUpdate={hasUpdate}
        latestVersion={latestVersion}
        onOpenUpdateModal={() => setIsModalOpen(true)}
        onRequestLogout={() => setShowLogoutConfirm(true)}
      />

      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Keluar dari Sesi?</DialogTitle>
            <DialogDescription>
              Anda perlu memasukkan username dan password kembali saat membuka aplikasi kasir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              disabled={isLoggingOut}
              onClick={() => setShowLogoutConfirm(false)}
            >
              Tetap Masuk
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

      <UpdateNoticeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDismiss={dismissUpdate}
        currentVersion={currentVersion}
        versionData={versionData}
      />

      <QuickCalculatorSheet
        isOpen={isQuickCalcOpen}
        onClose={() => setIsQuickCalcOpen(false)}
      />
    </div>
  );
}
