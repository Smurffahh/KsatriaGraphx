"use client";

import React from "react";
import { AlertCircle, RotateCw, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStatePanelProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

/** Menampilkan panduan visual bersih saat daftar data belum tersedia atau hasil filter kosong. */
export function EmptyStatePanel({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: EmptyStatePanelProps) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-border bg-card px-5 py-10 sm:py-12 text-center space-y-3.5 ${className}`}
    >
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="size-6" />
      </div>
      <div className="mx-auto max-w-md space-y-1.5">
        <h3 className="text-base font-semibold text-foreground text-balance">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
          {description}
        </p>
      </div>
      {action ? <div className="pt-1 flex justify-center">{action}</div> : null}
    </div>
  );
}

interface ErrorStatePanelProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/** Menampilkan banner kesalahan ramah pengguna dengan tombol muat ulang. */
export function ErrorStatePanel({
  title = "Data belum berhasil dimuat",
  description = "Periksa koneksi internet Anda lalu coba muat ulang.",
  onRetry,
  retryLabel = "Muat Ulang",
  className = "",
}: ErrorStatePanelProps) {
  return (
    <div
      className={`rounded-2xl border border-destructive/25 bg-destructive/5 px-5 py-8 sm:py-10 text-center space-y-4 max-w-lg mx-auto ${className}`}
    >
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
        <AlertCircle className="size-6" />
      </div>
      <div className="space-y-1">
        <h2 className="text-base sm:text-lg font-semibold text-foreground">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
      {onRetry ? (
        <Button onClick={onRetry} variant="outline" className="gap-2">
          <RotateCw className="size-4" />
          <span>{retryLabel}</span>
        </Button>
      ) : null}
    </div>
  );
}
