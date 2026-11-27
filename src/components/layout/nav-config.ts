import type React from "react";
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
  Building2,
} from "lucide-react";

export interface AuthUserData {
  id: string;
  name: string;
  username: string;
  email: string | null;
  role: "OWNER" | "KASIR";
  platform: "WEB" | "APK";
}

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  ownerOnly?: boolean;
  webOnly?: boolean;
}

export const mainNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Kalkulator POS", href: "/pos", icon: Calculator },
  { label: "Daftar Pesanan", href: "/orders", icon: ClipboardList },
  { label: "Katalog Produk", href: "/products", icon: Package },
  { label: "Pelanggan", href: "/customers", icon: UsersIcon },
];

export const managementNavItems: NavItem[] = [
  { label: "Laporan Omzet", href: "/reports", icon: BarChart3, ownerOnly: true },
  { label: "Vendor Mitra", href: "/vendors", icon: Building2, ownerOnly: true },
  { label: "Pengaturan Toko", href: "/settings", icon: Settings },
  { label: "Kelola Pengguna", href: "/users", icon: UserCheck, ownerOnly: true, webOnly: true },
  { label: "Audit Log", href: "/audit-logs", icon: ShieldCheck, ownerOnly: true },
];

const MENU_DRAWER_ROUTES = [
  "/products",
  "/vendors",
  "/customers",
  "/reports",
  "/settings",
  "/users",
  "/audit-logs",
];

export function matchesRoute(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isMenuRouteActive(pathname: string): boolean {
  return MENU_DRAWER_ROUTES.some((route) => matchesRoute(pathname, route));
}

export function getPageMeta(
  pathname: string,
  isOwner: boolean
): { title: string; subtitle: string } {
  if (matchesRoute(pathname, "/dashboard")) {
    return { title: "Dashboard", subtitle: "Ringkasan penjualan & status pesanan" };
  }
  if (matchesRoute(pathname, "/pos")) {
    return { title: "Kalkulator POS", subtitle: "Hitung harga otomatis & buat nota" };
  }
  if (matchesRoute(pathname, "/orders")) {
    return { title: "Daftar Pesanan", subtitle: "Pantau antrean cetak & pembayaran" };
  }
  if (matchesRoute(pathname, "/products")) {
    return { title: "Katalog Produk", subtitle: "Kelola daftar produk, kategori & finishing" };
  }
  if (matchesRoute(pathname, "/vendors")) {
    return { title: "Vendor Mitra", subtitle: "Kelola percetakan rekanan & kirim SPK" };
  }
  if (matchesRoute(pathname, "/customers")) {
    return { title: "Data Pelanggan", subtitle: "Kontak & riwayat transaksi pelanggan" };
  }
  if (matchesRoute(pathname, "/reports")) {
    return { title: "Laporan Omzet", subtitle: "Rekap penjualan, kas masuk & modal" };
  }
  if (matchesRoute(pathname, "/settings")) {
    return {
      title: isOwner ? "Pengaturan Toko" : "Printer Bluetooth",
      subtitle: isOwner
        ? "Identitas toko, catatan struk & info aplikasi"
        : "Hubungkan printer thermal kasir",
    };
  }
  if (matchesRoute(pathname, "/users")) {
    return { title: "Kelola Pengguna", subtitle: "Atur akun kasir & akses login" };
  }
  if (matchesRoute(pathname, "/audit-logs")) {
    return { title: "Audit Log", subtitle: "Catatan aktivitas penting sistem" };
  }
  return { title: "Ksatria Graphx", subtitle: "Sistem Kasir & Percetakan" };
}
