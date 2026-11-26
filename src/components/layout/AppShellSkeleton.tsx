import React from "react";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function AppShellSkeleton() {
  return (
    <div className="min-h-dvh bg-background text-foreground antialiased flex flex-col relative">
      {/* Calm Status Pill */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/90 px-4 py-1.5 text-xs font-medium text-foreground shadow-xs backdrop-blur-md">
          <Loader2 className="size-3.5 animate-spin text-primary" />
          <span>Memuat sesi Ksatria Graphx...</span>
        </div>
      </div>

      {/* Mobile Topbar Skeleton */}
      <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="size-10 rounded-xl" />
        </div>
      </div>

      <div className="flex flex-1 min-w-0">
        {/* Desktop Sidebar Skeleton */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-dvh bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
          {/* Brand mark */}
          <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5 shrink-0">
            <Skeleton className="size-9 rounded-xl" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>

          {/* Navigation group */}
          <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3.5 py-2.5 min-h-11">
                <Skeleton className="size-4.5 rounded-md" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>

          {/* User profile & footer */}
          <div className="shrink-0 border-t border-sidebar-border p-3.5 bg-sidebar space-y-3">
            <div className="flex items-center gap-2.5 rounded-xl bg-sidebar-accent/50 p-2.5">
              <Skeleton className="size-9 rounded-lg" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="h-3.5 w-24 mx-auto" />
          </div>
        </aside>

        {/* Main Content Skeleton Area */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Desktop Topbar Skeleton */}
          <div className="hidden h-16 items-center justify-between border-b border-border bg-background/85 px-6 lg:px-8 backdrop-blur-md lg:flex sticky top-0 z-30">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-28 rounded-xl" />
              <Skeleton className="size-10 rounded-xl" />
              <Skeleton className="h-10 w-36 rounded-xl" />
            </div>
          </div>

          {/* Body Content Skeleton */}
          <main className="flex-1 min-w-0 bg-muted/40 dark:bg-background pb-24 lg:pb-10">
            <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-2xl" />
                ))}
              </div>
              <Skeleton className="h-72 rounded-2xl" />
              <Skeleton className="h-52 rounded-2xl" />
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation Skeleton */}
      <div className="fixed inset-x-0 bottom-0 z-40 h-16 border-t border-border bg-card/90 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden grid grid-cols-5 items-center px-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center justify-center gap-1">
            <Skeleton className="size-5 rounded-md" />
            <Skeleton className="h-2 w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}
