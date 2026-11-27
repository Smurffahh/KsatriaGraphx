"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import { isSafeHttpsDesignUrl } from "@/lib/validators/vendor";
import { buildVendorSpkText, buildVendorWhatsAppUrl } from "@/lib/vendors/spk-text";
import {
  VendorPaymentModal,
  type VendorOptionItem,
} from "@/components/orders/VendorPaymentModal";
import { VendorCostAdjustModal } from "@/components/orders/VendorCostAdjustModal";
import type { VendorPaymentStatus } from "@/lib/vendors/settlement";
import {
  OrderSpkSection,
  type DirectoryVendorOption,
  type VendorSpkGroup,
} from "./OrderSpkSection";
import { OrderVendorSettlementSection } from "./OrderVendorSettlementSection";

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

async function copyTextSafe(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback textarea untuk WebView tanpa clipboard API
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
  const [directoryVendors, setDirectoryVendors] = useState<DirectoryVendorOption[]>([]);
  const [itemVendors, setItemVendors] = useState<Record<string, string>>({});
  const [designFileUrl, setDesignFileUrl] = useState(order.designFileUrl || "");
  const [spkNote, setSpkNote] = useState("");
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [copiedVendorId, setCopiedVendorId] = useState<string | null>(null);
  const [sendingVendorId, setSendingVendorId] = useState<string | null>(null);

  const [isSpkOpen, setIsSpkOpen] = useState(true);
  const [isSettlementOpen, setIsSettlementOpen] = useState(true);
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
      .get<DirectoryVendorOption[]>("/api/vendors?isActive=true&limit=200")
      .then((res) => {
        if (res.success && res.data) {
          setDirectoryVendors(res.data);
        }
      })
      .catch(() => {});
  }, []);

  const allVendorsMap = useMemo(() => {
    const map = new Map<string, DirectoryVendorOption>();
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
    const groups = new Map<string, VendorSpkGroup>();
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

  function buildGroupSpkText(group: VendorSpkGroup) {
    const trimmedUrl = designFileUrl.trim();
    const safeUrl = trimmedUrl && isSafeHttpsDesignUrl(trimmedUrl) ? trimmedUrl : null;

    return buildVendorSpkText({
      invoiceNumber: order.invoiceNumber,
      vendorName: group.vendor.name,
      targetDeadline: targetDeadlineLabel,
      designFileUrl: safeUrl,
      additionalNote: spkNote.trim() || null,
      items: group.items.map((item) => ({
        productName: item.productNameSnapshot,
        dimensionsLabel:
          item.pricingTypeSnapshot === "AREA" && item.widthM && item.heightM
            ? `${Number(item.widthM)}m × ${Number(item.heightM)}m (${Number(item.billedAreaM2 ?? 0)} m²)`
            : null,
        quantity: item.quantity,
        unitLabel: item.pricingTypeSnapshot === "AREA" ? "pcs" : "pcs",
        finishings: item.finishings.map((f) => f.finishingNameSnapshot),
        itemNote: item.itemNotes,
      })),
    });
  }

  async function saveAssignment(markSpkSent: boolean) {
    const trimmedUrl = designFileUrl.trim();
    if (trimmedUrl && !isSafeHttpsDesignUrl(trimmedUrl)) {
      toast.error("Link file desain wajib menggunakan HTTPS (contoh: https://drive.google.com/...)");
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

  async function handleCopySpk(group: VendorSpkGroup) {
    const copied = await copyTextSafe(buildGroupSpkText(group));
    if (copied) {
      setCopiedVendorId(group.vendor.id);
      toast.success(`Teks SPK untuk ${group.vendor.name} disalin.`);
      setTimeout(() => setCopiedVendorId(null), 2000);
    } else {
      toast.error("Gagal menyalin teks SPK secara otomatis.");
    }
  }

  async function handleSendSpkWa(group: VendorSpkGroup) {
    const trimmedUrl = designFileUrl.trim();
    if (trimmedUrl && !isSafeHttpsDesignUrl(trimmedUrl)) {
      toast.error("Link file desain wajib diawali protokol https://");
      return;
    }

    const waUrl = buildVendorWhatsAppUrl(group.vendor.whatsapp, buildGroupSpkText(group));
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

  function jumpTo(sectionId: string, openSetter: React.Dispatch<React.SetStateAction<boolean>>) {
    openSetter(true);
    setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => jumpTo("section-vendor-spk", setIsSpkOpen)}
          className="min-h-11 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          1. Kirim SPK ke Vendor (WA)
        </button>
        <button
          type="button"
          onClick={() => jumpTo("section-vendor-settlement", setIsSettlementOpen)}
          className="min-h-11 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          2. Setoran Modal Vendor
        </button>
      </div>

      <OrderSpkSection
        isOpen={isSpkOpen}
        onToggleOpen={() => setIsSpkOpen((prev) => !prev)}
        spkSentAt={order.spkSentAt}
        isCancelled={isCancelled}
        items={order.items}
        selectableVendors={selectableVendors}
        itemVendors={itemVendors}
        onItemVendorChange={(itemId, vendorId) =>
          setItemVendors((prev) => ({ ...prev, [itemId]: vendorId }))
        }
        designFileUrl={designFileUrl}
        onDesignFileUrlChange={setDesignFileUrl}
        spkNote={spkNote}
        onSpkNoteChange={setSpkNote}
        isSavingAssignment={isSavingAssignment}
        onSaveAssignment={handleSaveAssignment}
        vendorGroups={vendorGroups}
        buildGroupSpkText={buildGroupSpkText}
        copiedVendorId={copiedVendorId}
        sendingVendorId={sendingVendorId}
        onCopySpk={handleCopySpk}
        onSendSpkWa={handleSendSpkWa}
      />

      <OrderVendorSettlementSection
        isOpen={isSettlementOpen}
        onToggleOpen={() => setIsSettlementOpen((prev) => !prev)}
        vendorPaymentStatus={order.vendorPaymentStatus}
        totalCost={totalCost}
        paidAmount={paidAmount}
        remainingPayable={remainingPayable}
        progressPercent={progressPercent}
        isCancelled={isCancelled}
        vendorPayments={order.vendorPayments ?? []}
        onOpenCostModal={() => setVendorCostModalOpen(true)}
        onOpenPaymentModal={() => setVendorPaymentModalOpen(true)}
      />

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
