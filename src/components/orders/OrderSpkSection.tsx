"use client";

import React from "react";
import {
  Building2,
  Send,
  Copy,
  Check,
  ShieldCheck,
  Link as LinkIcon,
  Save,
  Loader2,
  Clock,
  ChevronDown,
} from "lucide-react";
import { formatShortDateTimeId } from "@/lib/format";
import type { OrderVendorItemData } from "./OrderVendorPanel";

export interface DirectoryVendorOption {
  id: string;
  name: string;
  whatsapp: string;
  isActive: boolean;
}

export interface VendorSpkGroup {
  vendor: DirectoryVendorOption;
  items: OrderVendorItemData[];
}

interface OrderSpkSectionProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  spkSentAt?: string | null;
  isCancelled: boolean;
  items: OrderVendorItemData[];
  selectableVendors: DirectoryVendorOption[];
  itemVendors: Record<string, string>;
  onItemVendorChange: (itemId: string, vendorId: string) => void;
  designFileUrl: string;
  onDesignFileUrlChange: (url: string) => void;
  spkNote: string;
  onSpkNoteChange: (note: string) => void;
  isSavingAssignment: boolean;
  onSaveAssignment: () => void;
  vendorGroups: VendorSpkGroup[];
  buildGroupSpkText: (group: VendorSpkGroup) => string;
  copiedVendorId: string | null;
  sendingVendorId: string | null;
  onCopySpk: (group: VendorSpkGroup) => void;
  onSendSpkWa: (group: VendorSpkGroup) => void;
}

/** Bagian penugasan vendor per item dan pengiriman SPK bebas data klien ke WhatsApp. */
export function OrderSpkSection({
  isOpen,
  onToggleOpen,
  spkSentAt,
  isCancelled,
  items,
  selectableVendors,
  itemVendors,
  onItemVendorChange,
  designFileUrl,
  onDesignFileUrlChange,
  spkNote,
  onSpkNoteChange,
  isSavingAssignment,
  onSaveAssignment,
  vendorGroups,
  buildGroupSpkText,
  copiedVendorId,
  sendingVendorId,
  onCopySpk,
  onSendSpkWa,
}: OrderSpkSectionProps) {
  return (
    <div id="section-vendor-spk" className="bg-card border border-border rounded-2xl shadow-2xs overflow-hidden">
      <button
        type="button"
        onClick={onToggleOpen}
        aria-expanded={isOpen}
        className="w-full p-4 sm:p-5 border-b border-border bg-muted/40 flex flex-wrap items-center justify-between gap-2.5 text-left cursor-pointer hover:bg-muted/60 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Building2 className="size-4.5 text-primary shrink-0" />
            <span>Produksi Vendor &amp; SPK WhatsApp</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Pilih rekanan per item lalu kirim perintah kerja (bebas data pelanggan &amp; harga jual).
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {spkSentAt && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 tabular-nums">
              <Clock className="size-3.5" />
              <span>SPK dikirim: {formatShortDateTimeId(spkSentAt)}</span>
            </span>
          )}
          <ChevronDown
            className={`size-4 text-muted-foreground transition-transform duration-150 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="p-4 sm:p-5 space-y-5">
          <div className="space-y-3">
            {items.map((item) => (
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
                  onChange={(e) => onItemVendorChange(item.id, e.target.value)}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
                Tautan File Desain (Wajib HTTPS)
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="url"
                  disabled={isCancelled}
                  value={designFileUrl}
                  onChange={(e) => onDesignFileUrlChange(e.target.value)}
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
                onChange={(e) => onSpkNoteChange(e.target.value)}
                placeholder="Contoh: Packing gulung rapi, ambil jam 4 sore"
                className="h-11 w-full px-3.5 text-base sm:text-sm bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          {!isCancelled && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onSaveAssignment}
                disabled={isSavingAssignment}
                className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted active:not-disabled:scale-[0.96] disabled:opacity-50 transition-[transform,background-color] cursor-pointer"
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

          {vendorGroups.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-border text-xs sm:text-sm text-muted-foreground text-center">
              Pilih minimal satu vendor mitra di item di atas untuk menyiapkan pesan SPK WhatsApp 1-klik.
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

                    <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => onCopySpk(group)}
                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted active:scale-[0.96] transition-[transform,background-color] cursor-pointer"
                      >
                        {isCopied ? (
                          <Check className="size-4 text-emerald-600" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                        <span>{isCopied ? "Tersalin" : "Salin Teks SPK"}</span>
                      </button>

                      <button
                        type="button"
                        disabled={isSending}
                        onClick={() => onSendSpkWa(group)}
                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-2xs active:not-disabled:scale-[0.96] disabled:opacity-50 transition-[transform,background-color] cursor-pointer"
                      >
                        {isSending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Send className="size-4" />
                        )}
                        <span>Kirim SPK via WA</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
