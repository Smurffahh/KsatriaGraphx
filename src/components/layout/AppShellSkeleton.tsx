import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function AppShellSkeleton() {
  return (
    <div className="min-h-dvh bg-background text-foreground antialiased flex flex-col">
      {/* Mobile Topbar Skeleton */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-8 rounded-xl" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-14 rounded-full" />
          <Skeleton className="size-9 rounded-xl" />
        </div>
      </div>

      <div className="flex flex-1">
        {/* Desktop Sidebar Skeleton */}
        <aside className="hidden w-60 flex-col border-r border-border bg-card p-4 lg:flex space-y-6">
          {/* Brand mark */}
          <div className="flex items-center gap-2.5 px-2 py-1">
            <Skeleton className="size-9 rounded-xl" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>

          {/* Navigation group */}
          <div className="space-y-2 flex-1 pt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2">
                <Skeleton className="size-5 rounded-md" />
                <Skeleton className="h-3.5 flex-1" />
              </div>
            ))}
          </div>

          {/* User profile & footer */}
          <div className="pt-4 border-t border-border space-y-3">
            <div className="flex items-center gap-3 px-2">
              <Skeleton className="size-9 rounded-xl" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            </div>
            <Skeleton className="h-4 w-20 mx-auto" />
          </div>
        </aside>

        {/* Main Content Skeleton Area */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Desktop Topbar Skeleton */}
          <div className="hidden h-14 items-center justify-between border-b border-border bg-card/60 px-6 backdrop-blur-md lg:flex">
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-28 rounded-xl" />
              <Skeleton className="size-9 rounded-xl" />
            </div>
          </div>

          {/* Body Content Skeleton */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
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
