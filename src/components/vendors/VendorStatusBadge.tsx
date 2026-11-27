"use client";

import React from "react";
import type { VendorPaymentStatus } from "@/lib/vendors/settlement";

interface VendorStatusBadgeProps {
  status?: VendorPaymentStatus | null;
  className?: string;
}

const STATUS_CONFIG: Record<
  VendorPaymentStatus,
  { label: string; classes: string }
> = {
  NOT_APPLICABLE: {
    label: "Tanpa Vendor",
    classes: "bg-muted text-muted-foreground border-border",
  },
  UNPAID: {
    label: "Belum Setor",
    classes: "bg-destructive/10 text-destructive border-destructive/20",
  },
  PARTIAL: {
    label: "DP Vendor",
    classes: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  },
  PAID: {
    label: "Lunas Vendor",
    classes: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  },
};

export function VendorStatusBadge({ status, className = "" }: VendorStatusBadgeProps) {
  const safeStatus: VendorPaymentStatus =
    status && status in STATUS_CONFIG ? status : "NOT_APPLICABLE";
  const cfg = STATUS_CONFIG[safeStatus];

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-md border px-2.5 py-0.5 text-xs font-semibold ${cfg.classes} ${className}`}
    >
      {cfg.label}
    </span>
  );
}
