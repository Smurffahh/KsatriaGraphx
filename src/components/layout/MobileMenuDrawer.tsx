"use client";

import React from "react";
import Link from "next/link";
import {
  Calculator,
  ClipboardList,
  Users as UsersIcon,
  Package,
  Building2,
  BarChart3,
  Settings,
  Printer,
  ShieldCheck,
  UserCheck,
  ChevronRight,
  LogOut,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { formatVersionLabel } from "@/lib/version";
import { matchesRoute, type AuthUserData } from "./nav-config";

interface DrawerLinkItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  visible: boolean;
}

interface MobileMenuDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pathname: string;
  user: AuthUserData | null;
  isOwner: boolean;
  isNative: boolean;
  hasUpdate: boolean;
  latestVersion: string;
  onOpenUpdateModal: () => void;
  onRequestLogout: () => void;
}

/** Drawer bottom sheet mobile dengan pengelompokan menu berdasarkan alur kerja. */
export function MobileMenuDrawer({
  open,
  onOpenChange,
  pathname,
  user,
  isOwner,
  isNative,
  hasUpdate,
  latestVersion,
  onOpenUpdateModal,
  onRequestLogout,
}: MobileMenuDrawerProps) {
  const groups: Array<{ heading: string; items: DrawerLinkItem[] }> = [
    {
      heading: "Transaksi & Pelanggan",
      items: [
        { label: "Kasir POS", href: "/pos", icon: Calculator, visible: true },
        { label: "Daftar Pesanan", href: "/orders", icon: ClipboardList, visible: true },
        { label: "Data Pelanggan", href: "/customers", icon: UsersIcon, visible: true },
      ],
    },
    {
      heading: "Katalog & Vendor Mitra",
      items: [
        { label: "Katalog Produk", href: "/products", icon: Package, visible: true },
        { label: "Vendor Mitra", href: "/vendors", icon: Building2, visible: isOwner },
      ],
    },
    {
      heading: "Keuangan & Sistem",
      items: [
        { label: "Laporan Omzet Penjualan", href: "/reports", icon: BarChart3, visible: isOwner },
        {
          label: isNative && !isOwner ? "Printer Bluetooth Kasir" : "Pengaturan Toko & Nota",
          href: "/settings",
          icon: isNative && !isOwner ? Printer : Settings,
          visible: isOwner || isNative,
        },
        { label: "Audit Log Forensik", href: "/audit-logs", icon: ShieldCheck, visible: isOwner },
        {
          label: "Kelola Akun Pengguna",
          href: "/users",
          icon: UserCheck,
          visible: isOwner && !isNative,
        },
      ],
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="p-5 sm:p-6 max-w-lg mx-auto space-y-4 rounded-t-3xl max-h-[88dvh] overflow-y-auto"
      >
        <SheetHeader className="text-left space-y-1 pr-12">
          <SheetTitle className="text-lg font-semibold text-foreground">
            Menu &amp; Pengaturan
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Pilih menu transaksi, katalog produk, atau pengelolaan toko
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center gap-3 rounded-2xl bg-muted/60 p-3.5 border border-border/80">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-card text-sm font-bold text-foreground border border-border shadow-2xs">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : "KG"}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {user?.name}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {user?.role && (
                <Badge
                  variant={isOwner ? "default" : "secondary"}
                  className="text-xs px-2.5 py-0.5 uppercase tracking-wider font-semibold shrink-0"
                >
                  {user.role}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground truncate">
                {isNative ? "Android APK Native" : "Web Desktop System"}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {groups.map((group) => {
            const visibleItems = group.items.filter((i) => i.visible);
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.heading} className="space-y-1.5">
                <p className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.heading}
                </p>
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const active = matchesRoute(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => onOpenChange(false)}
                        className={`flex items-center justify-between p-3 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${
                          active
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className="size-4.5 text-primary shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <Separator />

        <div className="pt-1 flex items-center justify-between gap-3">
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-muted-foreground truncate">
              {formatVersionLabel(isNative)}
            </span>
            {hasUpdate ? (
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onOpenUpdateModal();
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline text-left mt-1 min-h-8 cursor-pointer"
              >
                <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                Pembaruan v{latestVersion} Tersedia
              </button>
            ) : (
              <span className="text-xs text-muted-foreground/80 mt-0.5">
                Versi terbaru aktif
              </span>
            )}
          </div>
          <Button
            variant="destructive"
            onClick={() => {
              onOpenChange(false);
              onRequestLogout();
            }}
            className="gap-2 shrink-0"
          >
            <LogOut className="size-4" />
            <span>Keluar Sesi</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
