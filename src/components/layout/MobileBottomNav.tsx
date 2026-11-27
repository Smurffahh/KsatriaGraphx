"use client";

import React from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  Calculator,
  Menu as MenuIcon,
} from "lucide-react";
import { isMenuRouteActive, matchesRoute } from "./nav-config";

interface MobileBottomNavProps {
  pathname: string;
  isMenuOpen: boolean;
  isQuickCalcOpen: boolean;
  onOpenQuickCalc: () => void;
  onOpenMenu: () => void;
}

/** Bilah navigasi bawah ramah ibu jari pada viewport mobile & tablet (< 1024px). */
export function MobileBottomNav({
  pathname,
  isMenuOpen,
  isQuickCalcOpen,
  onOpenQuickCalc,
  onOpenMenu,
}: MobileBottomNavProps) {
  const isHomeActive = matchesRoute(pathname, "/dashboard");
  const isPosActive = matchesRoute(pathname, "/pos");
  const isOrdersActive = matchesRoute(pathname, "/orders");
  const isMenuActive = isMenuOpen || isMenuRouteActive(pathname);

  return (
    <nav
      aria-label="Navigasi utama mobile"
      className="fixed inset-x-0 bottom-0 z-30 min-h-16 border-t border-border bg-card/95 pt-1 pb-[max(0.375rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden grid grid-cols-5 items-center px-1"
    >
      <Link
        href="/dashboard"
        className={`flex flex-col items-center justify-center gap-1 py-1.5 min-h-[44px] active:scale-[0.96] transition-[transform,color,background-color] duration-150 rounded-xl ${
          isHomeActive
            ? "text-primary font-semibold"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <LayoutDashboard className="size-5" />
        <span className="text-[11px] min-[370px]:text-xs tracking-tight">Beranda</span>
      </Link>

      <Link
        href="/pos"
        className={`flex flex-col items-center justify-center gap-1 py-1.5 min-h-[44px] active:scale-[0.96] transition-[transform,color,background-color] duration-150 rounded-xl ${
          isPosActive
            ? "text-primary font-semibold"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <div
          className={`p-1.5 rounded-lg transition-colors ${
            isPosActive ? "bg-primary text-primary-foreground shadow-2xs" : "bg-muted text-foreground"
          }`}
        >
          <ShoppingCart className="size-4" />
        </div>
        <span className="text-[11px] min-[370px]:text-xs tracking-tight">Kasir</span>
      </Link>

      <Link
        href="/orders"
        className={`flex flex-col items-center justify-center gap-1 py-1.5 min-h-[44px] active:scale-[0.96] transition-[transform,color,background-color] duration-150 rounded-xl ${
          isOrdersActive
            ? "text-primary font-semibold"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <ClipboardList className="size-5" />
        <span className="text-[11px] min-[370px]:text-xs tracking-tight">Pesanan</span>
      </Link>

      <button
        type="button"
        onClick={onOpenQuickCalc}
        aria-label="Buka Kalkulator Cepat"
        className={`flex flex-col items-center justify-center gap-1 py-1.5 min-h-[44px] active:scale-[0.96] transition-[transform,color,background-color] duration-150 rounded-xl cursor-pointer ${
          isQuickCalcOpen
            ? "text-primary font-semibold"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Calculator className="size-5" />
        <span className="text-[11px] min-[370px]:text-xs tracking-tight">Kalkulator</span>
      </button>

      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Buka Menu Lainnya"
        className={`flex flex-col items-center justify-center gap-1 py-1.5 min-h-[44px] active:scale-[0.96] transition-[transform,color,background-color] duration-150 rounded-xl cursor-pointer ${
          isMenuActive
            ? "text-primary font-semibold"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <MenuIcon className="size-5" />
        <span className="text-[11px] min-[370px]:text-xs tracking-tight">Menu</span>
      </button>
    </nav>
  );
}
