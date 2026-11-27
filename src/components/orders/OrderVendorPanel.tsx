"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Send,
  Copy,
  Check,
  ShieldCheck,
  Link as LinkIcon,
  Save,
  Loader2,
  Banknote,
  Edit3,
  Clock,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import { isSafeHttpsDesignUrl } from "@/lib/validators/vendor";
import { buildVendorSpkText, buildVendorWhatsAppUrl } from "@/lib/vendors/spk-text";
import { VendorStatusBadge } from "@/components/vendors/VendorStatusBadge";
import {
  VendorPaymentModal,
  type VendorOptionItem,
} from "@/components/orders/VendorPaymentModal";
import { VendorCostAdjustModal } from "@/components/orders/VendorCostAdjustModal";
import type { VendorPaymentStatus } from "@/lib/vendors/settlement";

export interface OrderVendorItemData {
  id: string;
  productNameSnapshot: string;
  pricingTypeSnapshot: "UNIT" | "AREA" | "CUSTOM";
  widthM: number | null;
  heightM: number | null;
  billedAreaM2: number | null;
  quantity: number;
  vendorId?: string | null;
  vendorNameSnapshot?: string | null;
  vendor?: {
    id: string;
    name: string;
    whatsapp: string;
    contactName: string | null;
    leadTimeDays: number;
    isActive: boolean;
  } | null;
  itemNotes: string | null;
  finishings: {
    id: string;
    finishingNameSnapshot: string;
    quantity: number;
  }[];
}

export interface VendorPaymentRecord {
  id: string;
  orderId: string;
  vendorId: string | null;
  vendorNameSnapshot: string;
  amount: number;
  paymentMethod: "CASH" | "TRANSFER" | "QRIS" | string;
  referenceNote: string | null;
  paidAt: string;
  recordedByUserName: string | null;
}

interface OrderVendorPanelProps {
  order: {
    id: string;
    invoiceNumber: string;
    grandTotal: number;
    totalProductionCost?: number;
    vendorPaidAmount?: number;
    vendorPaymentStatus?: VendorPaymentStatus;
    spkSentAt?: string | null;
    designFileUrl?: string | null;
    estimatedReadyAt: string | null;
    productionStatus: string;
    items: OrderVendorItemData[];
    vendorPayments?: VendorPaymentRecord[];
  };
  onRefresh: () => void;
}

interface DirectoryVendor {
  id: string;
  name: string;
  whatsapp: string;
  isActive: boolean;
}

async function copyTextSafe(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Lanjut fallback textarea untuk konteks WebView Capacitor yang ketat
    }
  }
  if (typeof document !== "undefined") {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  }
  return false;
}

export function OrderVendorPanel({ order, onRefresh }: OrderVendorPanelProps) {
  const queryClient = useQueryClient();
  const [directoryVendors, setDirectoryVendors] = useState<DirectoryVendor[]>([]);
  const [itemVendors, setItemVendors] = useState<Record<string, string>>({});
  const [designFileUrl, setDesignFileUrl] = useState(order.designFileUrl || "");
  const [spkNote, setSpkNote] = useState("");
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [copiedVendorId, setCopiedVendorId] = useState<string | null>(null);
  const [sendingVendorId, setSendingVendorId] = useState<string | null>(null);

  const [vendorPaymentModalOpen, setVendorPaymentModalOpen] = useState(false);
  const [vendorCostModalOpen, setVendorCostModalOpen] = useState(false);

  useEffect(() => {
    const initialMap: Record<string, string> = {};
    for (const item of order.items) {
      initialMap[item.id] = item.vendorId || "";
    }
    setItemVendors(initialMap);
    setDesignFileUrl(order.designFileUrl || "");
  }, [order.items, order.designFileUrl]);

  useEffect(() => {
    apiClient
      .get<DirectoryVendor[]>("/api/vendors?isActive=true&limit=200")
      .then((res) => {
        if (res.success && res.data) {
          setDirectoryVendors(res.data);
        }
      })
      .catch(() => {});
  }, []);

  const allVendorsMap = useMemo(() => {
    const map = new Map<string, DirectoryVendor>();
    for (const v of directoryVendors) {
      map.set(v.id, v);
    }
    for (const item of order.items) {
      if (item.vendor && !map.has(item.vendor.id)) {
        map.set(item.vendor.id, {
          id: item.vendor.id,
          name: item.vendor.name,
          whatsapp: item.vendor.whatsapp,
          isActive: item.vendor.isActive,
        });
      }
    }
    return map;
  }, [directoryVendors, order.items]);

  const selectableVendors = useMemo(
    () => Array.from(allVendorsMap.values()),
    [allVendorsMap]
  );

  const vendorGroups = useMemo(() => {
    const groups = new Map<
      string,
      { vendor: DirectoryVendor; items: OrderVendorItemData[] }
    >();

    for (const item of order.items) {
      const assignedId = itemVendors[item.id];
      if (!assignedId) continue;
      const vendor = allVendorsMap.get(assignedId);
      if (!vendor) continue;
      const existing = groups.get(vendor.id);
      if (existing) {
        existing.items.push(item);
      } else {
        groups.set(vendor.id, { vendor, items: [item] });
      }
    }
    return Array.from(groups.values());
  }, [order.items, itemVendors, allVendorsMap]);

  const vendorOptionsForPayment: VendorOptionItem[] = useMemo(() => {
    const seen = new Map<string, VendorOptionItem>();
    for (const g of vendorGroups) {
      seen.set(g.vendor.id, { id: g.vendor.id, name: g.vendor.name });
    }
    for (const v of selectableVendors) {
      if (!seen.has(v.id)) {
        seen.set(v.id, { id: v.id, name: v.name });
      }
    }
    return Array.from(seen.values());
  }, [vendorGroups, selectableVendors]);

  const totalCost = order.totalProductionCost ?? 0;
  const paidAmount = order.vendorPaidAmount ?? 0;
  const paymentModalOrder = useMemo(
    () => ({
      id: order.id,
      invoiceNumber: order.invoiceNumber,
      totalProductionCost: totalCost,
      vendorPaidAmount: paidAmount,
    }),
    [order.id, order.invoiceNumber, totalCost, paidAmount]
  );
  const costAdjustModalOrder = useMemo(
    () => ({
      id: order.id,
      invoiceNumber: order.invoiceNumber,
      grandTotal: order.grandTotal,
      totalProductionCost: totalCost,
      vendorPaidAmount: paidAmount,
    }),
    [order.id, order.invoiceNumber, order.grandTotal, totalCost, paidAmount]
  );
  const remainingPayable = Math.max(0, totalCost - paidAmount);
  const progressPercent =
    totalCost > 0 ? Math.min(100, Math.round((paidAmount / totalCost) * 100)) : 0;
  const isCancelled = order.productionStatus === "CANCELLED";

  const targetDeadlineLabel = order.estimatedReadyAt
    ? new Date(order.estimatedReadyAt).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  function buildGroupSpkText(group: { vendor: DirectoryVendor; items: OrderVendorItemData[] }) {
    const trimmedUrl = designFileUrl.trim();
    const safeUrl = trimmedUrl && isSafeHttpsDesignUrl(trimmedUrl) ? trimmedUrl : null;

    return buildVendorSpkText({
      invoiceNumber: order.invoiceNumber,
      vendorName: group.vendor.name,
      targetDeadline: targetDeadlineLabel,
      designFileUrl: safeUrl,
      additionalNote: spkNote.trim() || null,
      items: group.items.map((item) => {
        const dimensionsLabel =
          item.pricingTypeSnapshot === "AREA" && item.widthM && item.heightM
            ? `${Number(item.widthM)}m x ${Number(item.heightM)}m (${Number(
                item.billedAreaM2 ?? 0
              )} m²)`
            : null;
        return {
          productName: item.productNameSnapshot,
          dimensionsLabel,
          quantity: item.quantity,
          unitLabel: item.pricingTypeSnapshot === "AREA" ? "lbr/pcs" : "pcs",
          finishings: item.finishings.map((f) => f.finishingNameSnapshot),
          itemNote: item.itemNotes,
        };
      }),
    });
  }

  async function saveAssignment(markSpkSent: boolean): Promise<boolean> {
    const trimmedUrl = designFileUrl.trim();
    if (trimmedUrl && !isSafeHttpsDesignUrl(trimmedUrl)) {
      toast.error("Link file desain wajib diawali protokol https://");
      return false;
    }

    const res = await apiClient.patch(`/api/orders/${order.id}/vendor-assignment`, {
      items: order.items.map((item) => ({
        orderItemId: item.id,
        vendorId: itemVendors[item.id] ? itemVendors[item.id] : null,
      })),
      designFileUrl: trimmedUrl || null,
      markSpkSent,
    });

    if (!res.success) {
      toast.error(res.error || "Gagal menyimpan penugasan vendor");
      return false;
    }

    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["order", order.id] });
    queryClient.invalidateQueries({ queryKey: ["vendors"] });
    onRefresh();
    return true;
  }

  async function handleSaveAssignment() {
    setIsSavingAssignment(true);
    try {
      const ok = await saveAssignment(false);
      if (ok) {
        toast.success("Penugasan vendor dan link file desain tersimpan.");
      }
    } finally {
      setIsSavingAssignment(false);
    }
  }

  async function handleCopySpk(group: { vendor: DirectoryVendor; items: OrderVendorItemData[] }) {
    const text = buildGroupSpkText(group);
    const copied = await copyTextSafe(text);
    if (copied) {
      setCopiedVendorId(group.vendor.id);
      toast.success(`Teks SPK untuk ${group.vendor.name} disalin.`);
      setTimeout(() => setCopiedVendorId(null), 2000);
    } else {
      toast.error("Gagal menyalin teks SPK secara otomatis.");
    }
  }

  async function handleSendSpkWa(group: { vendor: DirectoryVendor; items: OrderVendorItemData[] }) {
    const trimmedUrl = designFileUrl.trim();
    if (trimmedUrl && !isSafeHttpsDesignUrl(trimmedUrl)) {
      toast.error("Link file desain wajib diawali protokol https://");
      return;
    }

    const text = buildGroupSpkText(group);
    const waUrl = buildVendorWhatsAppUrl(group.vendor.whatsapp, text);

    setSendingVendorId(group.vendor.id);
    try {
      if (!isCancelled) {
        await saveAssignment(true);
      }
      window.open(waUrl, "_blank", "noopener,noreferrer");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menyiapkan link WhatsApp SPK");
    } finally {
      setSendingVendorId(null);
    }
  }

  const vendorPayments = order.vendorPayments ?? [];

  return (
    <div className="space-y-6">
      {/* Seksi 1: Penugasan Vendor & SPK WhatsApp Zero-Leak */}
      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border bg-muted/40 flex flex-wrap items-center justify-between gap-2.5">
          <div>
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Building2 className="size-4.5 text-primary" />
              <span>Produksi Vendor &amp; SPK WhatsApp</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pilih vendor mitra per item pesanan dan kirim instruksi kerja (SPK) bebas data klien &amp; harga jual.
            </p>
          </div>
          {order.spkSentAt && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <Clock className="size-3.5" />
              <span>
                SPK dikirim:{" "}
                {new Date(order.spkSentAt).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </span>
          )}
        </div>

        <div className="p-4 sm:p-5 space-y-5">
          {/* Penugasan vendor per item */}
          <div className="space-y-3">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/70"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {item.productNameSnapshot}
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
                    Qty {item.quantity}
                    {item.pricingTypeSnapshot === "AREA" && item.widthM && item.heightM
                      ? ` • ${Number(item.widthM)}m × ${Number(item.heightM)}m (${Number(
                          item.billedAreaM2 ?? 0
                        )} m²)`
                      : ""}
                    {item.finishings.length > 0
                      ? ` • ${item.finishings.map((f) => f.finishingNameSnapshot).join(", ")}`
                      : ""}
                  </p>
                </div>
                <select
                  aria-label={`Vendor untuk ${item.productNameSnapshot}`}
                  disabled={isCancelled}
                  value={itemVendors[item.id] || ""}
                  onChange={(e) =>
                    setItemVendors((prev) => ({
                      ...prev,
                      [item.id]: e.target.value,
                    }))
                  }
                  className="h-11 sm:w-64 px-3 text-base sm:text-sm bg-background border border-border rounded-xl text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">-- Belum pilih vendor --</option>
                  {selectableVendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Link File Desain & Catatan Tambahan SPK */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
                Link File Desain (Khusus HTTPS)
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="url"
                  disabled={isCancelled}
                  value={designFileUrl}
                  onChange={(e) => setDesignFileUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                  className="h-11 w-full pl-10 pr-4 text-base sm:text-sm bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
                Catatan Tambahan SPK (Opsional)
              </label>
              <input
                type="text"
                value={spkNote}
                onChange={(e) => setSpkNote(e.target.value)}
                placeholder="Contoh: Packing gulung rapi, ambil jam 4 sore"
                className="h-11 w-full px-3.5 text-base sm:text-sm bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          {!isCancelled && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveAssignment}
                disabled={isSavingAssignment}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted active:scale-[0.98] disabled:opacity-50 transition-transform cursor-pointer"
              >
                {isSavingAssignment ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                <span>Simpan Penugasan &amp; Link Desain</span>
              </button>
            </div>
          )}

          {/* Kartu Preview & Kirim SPK per Vendor */}
          {vendorGroups.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-border text-xs sm:text-sm text-muted-foreground text-center">
              Pilih minimal satu vendor mitra di item pesanan di atas untuk menyiapkan SPK WhatsApp 1-klik.
            </div>
          ) : (
            <div className="space-y-4">
              {vendorGroups.map((group) => {
                const spkPreview = buildGroupSpkText(group);
                const isCopied = copiedVendorId === group.vendor.id;
                const isSending = sendingVendorId === group.vendor.id;

                return (
                  <div
                    key={group.vendor.id}
                    className="rounded-xl border border-border bg-muted/20 p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          SPK untuk {group.vendor.name}
                        </p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {group.items.length} item &bull; WA +{group.vendor.whatsapp}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                        <ShieldCheck className="size-3.5" />
                        <span>Bebas Nama Klien &amp; Harga Jual</span>
                      </span>
                    </div>

                    <pre className="p-3.5 rounded-xl bg-background border border-border text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed overflow-x-auto">
                      {spkPreview}
                    </pre>

                    <div className="flex flex-wrap items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleCopySpk(group)}
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted active:scale-[0.98] transition-transform cursor-pointer"
                      >
                        {isCopied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                        <span>{isCopied ? "Tersalin" : "Salin Teks SPK"}</span>
                      </button>

                      <button
                        type="button"
                        disabled={isSending}
                        onClick={() => handleSendSpkWa(group)}
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-xs active:scale-[0.98] disabled:opacity-50 transition-transform cursor-pointer"
                      >
                        {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                        <span>Kirim SPK via WA</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Seksi 2: Setoran Modal ke Vendor (Accounts Payable) */}
      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border bg-muted/40 flex flex-wrap items-center justify-between gap-2.5">
          <div>
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Banknote className="size-4.5 text-amber-600" />
              <span>Setoran Modal ke Vendor</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pantau pelunasan modal produksi dari kas ke percetakan rekanan (ledger append-only).
            </p>
          </div>
          <VendorStatusBadge status={order.vendorPaymentStatus} />
        </div>

        <div className="p-4 sm:p-5 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
              <span>Progres Pelunasan Modal</span>
              <span className="font-semibold text-foreground">{progressPercent}%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-[width] duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 tabular-nums">
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60">
              <span className="text-xs text-muted-foreground block">Total Modal Vendor</span>
              <span className="text-lg font-bold text-foreground mt-0.5 block">
                Rp {totalCost.toLocaleString("id-ID")}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60">
              <span className="text-xs text-muted-foreground block">Sudah Disetor</span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                Rp {paidAmount.toLocaleString("id-ID")}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60">
              <span className="text-xs text-muted-foreground block">Sisa Wajib Setor</span>
              <span className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">
                Rp {remainingPayable.toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          {!isCancelled && (
            <div className="flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setVendorCostModalOpen(true)}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted active:scale-[0.98] transition-transform cursor-pointer"
              >
                <Edit3 className="size-4" />
                <span>Sesuaikan Modal Aktual</span>
              </button>
              <button
                type="button"
                disabled={remainingPayable <= 0}
                onClick={() => setVendorPaymentModalOpen(true)}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 transition-transform cursor-pointer"
              >
                <Banknote className="size-4" />
                <span>Catat Setoran Vendor</span>
              </button>
            </div>
          )}

          {vendorPayments.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs sm:text-sm text-muted-foreground">
              Belum ada riwayat setoran modal ke vendor untuk pesanan ini.
            </div>
          ) : (
            <div className="divide-y divide-border/60 rounded-xl border border-border overflow-hidden">
              {vendorPayments.map((vp) => (
                <div
                  key={vp.id}
                  className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm bg-card"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground tabular-nums">
                        Rp {vp.amount.toLocaleString("id-ID")}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-semibold bg-muted rounded border border-border">
                        {vp.paymentMethod}
                      </span>
                      <span className="text-xs font-medium text-primary">
                        {vp.vendorNameSnapshot}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Dicatat oleh {vp.recordedByUserName || "Owner"} &bull;{" "}
                      {new Date(vp.paidAt).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {vp.referenceNote && (
                    <span className="text-xs text-muted-foreground italic">
                      {vp.referenceNote}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <VendorPaymentModal
        isOpen={vendorPaymentModalOpen}
        onClose={() => setVendorPaymentModalOpen(false)}
        order={paymentModalOrder}
        vendorOptions={vendorOptionsForPayment}
        onSuccess={onRefresh}
      />

      <VendorCostAdjustModal
        isOpen={vendorCostModalOpen}
        onClose={() => setVendorCostModalOpen(false)}
        order={costAdjustModalOrder}
        onSuccess={onRefresh}
      />
    </div>
  );
}
