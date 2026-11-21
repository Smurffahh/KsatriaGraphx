"use client";

import React from "react";
import { Loader2 } from "lucide-react";

interface PageLoadingBannerProps {
  message?: string;
  isRefetching?: boolean;
  className?: string;
}

export function PageLoadingBanner({
  message,
  isRefetching = false,
  className = "",
}: PageLoadingBannerProps) {
  return (
    <>
      {/* Top Refetch Shimmer Bar (tampil saat background refetch berlangsung) */}
      {isRefetching && (
        <div
          className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-primary/20 overflow-hidden pointer-events-none"
          role="progressbar"
          aria-label="Memperbarui data di latar belakang"
        >
          <div className="h-full w-full bg-primary animate-[pulse_1.2s_ease-in-out_infinite]" />
        </div>
      )}

      {/* Loading Status Banner (hanya tampil jika message diberikan) */}
      {message && (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2 text-xs font-medium text-foreground backdrop-blur-xs ${className}`}
        >
          <Loader2 className="size-3.5 animate-spin text-primary shrink-0" />
          <span className="truncate">{message}</span>
        </div>
      )}
    </>
  );
}
