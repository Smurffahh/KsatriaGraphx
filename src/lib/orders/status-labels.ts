export type OrderPaymentStatus = "UNPAID" | "PARTIAL" | "PAID";
export type OrderProductionStatus =
  | "QUEUED"
  | "IN_PROGRESS"
  | "READY"
  | "COMPLETED"
  | "CANCELLED";

const PAYMENT_STATUS_META: Record<
  OrderPaymentStatus,
  { label: string; badgeClass: string }
> = {
  PAID: {
    label: "Lunas",
    badgeClass:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
  },
  PARTIAL: {
    label: "Panjar (DP)",
    badgeClass:
      "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25",
  },
  UNPAID: {
    label: "Belum Bayar",
    badgeClass: "bg-destructive/10 text-destructive border-destructive/25",
  },
};

const PRODUCTION_STATUS_META: Record<
  OrderProductionStatus,
  { label: string; badgeClass: string }
> = {
  QUEUED: {
    label: "Antrean Cetak",
    badgeClass: "bg-muted text-muted-foreground border-border",
  },
  IN_PROGRESS: {
    label: "Sedang Dikerjakan",
    badgeClass:
      "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25",
  },
  READY: {
    label: "Siap Diambil",
    badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25",
  },
  COMPLETED: {
    label: "Selesai Diambil",
    badgeClass:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
  },
  CANCELLED: {
    label: "Dibatalkan",
    badgeClass:
      "bg-destructive/10 text-destructive border-destructive/25 line-through",
  },
};

export function getPaymentStatusMeta(status: string): {
  label: string;
  badgeClass: string;
} {
  return (
    PAYMENT_STATUS_META[status as OrderPaymentStatus] ??
    PAYMENT_STATUS_META.UNPAID
  );
}

export function getProductionStatusMeta(status: string): {
  label: string;
  badgeClass: string;
} {
  return (
    PRODUCTION_STATUS_META[status as OrderProductionStatus] ??
    PRODUCTION_STATUS_META.QUEUED
  );
}
