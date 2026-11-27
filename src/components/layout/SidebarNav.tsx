"use client";

import React from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { formatVersionBadge } from "@/lib/version";
import { mainNavItems, matchesRoute, type AuthUserData, type NavItem } from "./nav-config";

interface SidebarNavProps {
  pathname: string;
  user: AuthUserData | null;
  allowedManagementItems: NavItem[];
  isNative: boolean;
  hasUpdate: boolean;
  latestVersion: string;
  onOpenUpdateModal: () => void;
  onRequestLogout: () => void;
}

/** Sidebar navigasi tetap pada viewport desktop (>= 1024px). */
export function SidebarNav({
  pathname,
  user,
  allowedManagementItems,
  isNative,
  hasUpdate,
  latestVersion,
  onOpenUpdateModal,
  onRequestLogout,
}: SidebarNavProps) {
  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-dvh bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5 shrink-0">
        <div className="flex size-9 items-center justify-center rounded-xl bg-sidebar-primary font-bold text-sm text-sidebar-primary-foreground shadow-xs">
          KG
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold tracking-tight text-sidebar-foreground leading-tight truncate">
            Ksatria Graphx
          </span>
          <span className="text-xs text-sidebar-foreground/70 mt-0.5 font-medium truncate">
            POS &amp; Percetakan
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
        <div className="space-y-1.5">
          <span className="px-3.5 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">
            Menu Utama
          </span>
          <nav className="mt-1.5 space-y-1" aria-label="Menu utama desktop">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = matchesRoute(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium active:scale-[0.98] transition-[transform,color,background-color] duration-150 min-h-11 ${
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-xs"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <Icon className="size-4.5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="space-y-1.5">
          <span className="px-3.5 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">
            Manajemen
          </span>
          <nav className="mt-1.5 space-y-1" aria-label="Menu manajemen desktop">
            {allowedManagementItems.map((item) => {
              const Icon = item.icon;
              const isActive = matchesRoute(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium active:scale-[0.98] transition-[transform,color,background-color] duration-150 min-h-11 ${
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-xs"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <Icon className="size-4.5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="shrink-0 border-t border-sidebar-border p-3.5 bg-sidebar space-y-3">
        <div className="flex items-center justify-between gap-2 rounded-xl bg-sidebar-accent/50 p-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar text-xs font-bold text-sidebar-foreground border border-sidebar-border shadow-2xs">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : "KG"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-sidebar-foreground leading-tight">
                {user?.name}
              </p>
              <p className="text-xs text-sidebar-foreground/70 truncate uppercase font-medium mt-0.5">
                {user?.role}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRequestLogout}
            className="flex size-10 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
            title="Keluar Sesi"
            aria-label="Keluar Sesi"
          >
            <LogOut className="size-4" />
          </button>
        </div>

        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-medium text-sidebar-foreground/70">
            {formatVersionBadge(isNative)}
          </span>
          {hasUpdate && (
            <button
              type="button"
              onClick={onOpenUpdateModal}
              className="flex items-center gap-1.5 rounded-full bg-sidebar-primary/15 px-2.5 py-0.5 text-xs font-semibold text-sidebar-primary hover:bg-sidebar-primary/25 transition-colors cursor-pointer"
              title={`Pembaruan v${latestVersion} tersedia`}
            >
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sidebar-primary opacity-75"></span>
                <span className="relative inline-flex size-1.5 rounded-full bg-sidebar-primary"></span>
              </span>
              <span>Update</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
