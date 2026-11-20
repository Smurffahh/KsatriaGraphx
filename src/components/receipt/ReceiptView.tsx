"use client";

import React, { useState } from "react";
import {
  Printer,
  Download,
  MessageCircle,
} from "lucide-react";
import {
  buildWhatsAppReceiptUrl,
  exportReceiptAsPng,
  type ReceiptOrderData,
  type ReceiptStoreSettings,
} from "@/lib/printer/share";

interface ReceiptViewProps {
  order: ReceiptOrderData;
  storeSettings?: ReceiptStoreSettings;
  defaultPaperWidth?: "58mm" | "80mm" | "A5";
  showActions?: boolean;
}

export function ReceiptView({
  order,
  storeSettings = {
    storeName: "Ksatria Graphx",
    tagline: "Percetakan, Sablon & Digital Printing",
    address: "Jl. Percetakan No. 1, Kota",
    phone: "0812-3456-7890",
  },
  defaultPaperWidth = "58mm",
  showActions = true,
}: ReceiptViewProps) {
  const [paperWidth, setPaperWidth] = useState<"58mm" | "80mm" | "A5">(defaultPaperWidth);
  const [isExporting, setIsExporting] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPng = async () => {
    setIsExporting(true);
    try {
      await exportReceiptAsPng(
        order,
        storeSettings,
        paperWidth === "A5" ? "80mm" : paperWidth
      );
    } catch (err) {
      console.error("Gagal export PNG:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareWhatsApp = () => {
    const url = buildWhatsAppReceiptUrl(
      order.customerPhoneSnapshot,
      order,
      storeSettings
    );
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const is58 = paperWidth === "58mm";
  const is80 = paperWidth === "80mm";

  const containerWidthClass = is58
    ? "max-w-[280px]"
    : is80
    ? "max-w-[360px]"
    : "max-w-[540px]";

  const dateFormatted = new Date(order.createdAt).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-4">
      {/* Top Action Bar (Screen Only) */}
      {showActions && (
        <div className="no-print p-3 rounded-2xl bg-surface border border-border flex flex-wrap items-center justify-between gap-3 shadow-xs">
          {/* Paper Switcher */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-text-muted font-medium mr-1">Format Kertas:</span>
            <button
              type="button"
              onClick={() => setPaperWidth("58mm")}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                paperWidth === "58mm"
                  ? "bg-primary text-white"
                  : "bg-surface-muted text-text-muted hover:text-text"
              }`}
            >
              58 mm
            </button>
            <button
              type="button"
              onClick={() => setPaperWidth("80mm")}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                paperWidth === "80mm"
                  ? "bg-primary text-white"
                  : "bg-surface-muted text-text-muted hover:text-text"
              }`}
            >
              80 mm
            </button>
            <button
              type="button"
              onClick={() => setPaperWidth("A5")}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                paperWidth === "A5"
                  ? "bg-primary text-white"
                  : "bg-surface-muted text-text-muted hover:text-text"
              }`}
            >
              A5 / Nota
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary hover:bg-primary-hover text-white rounded-xl shadow-xs transition-colors min-h-[38px]"
            >
              <Printer className="size-3.5" />
              <span>Print Nota / PDF</span>
            </button>

            <button
              type="button"
              onClick={handleExportPng}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-surface-muted hover:bg-border text-text rounded-xl transition-colors min-h-[38px] disabled:opacity-50"
            >
              <Download className="size-3.5" />
              <span>{isExporting ? "Menyimpan..." : "Unduh Gambar (PNG)"}</span>
            </button>

            {order.customerPhoneSnapshot && (
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors min-h-[38px]"
              >
                <MessageCircle className="size-3.5" />
                <span>Kirim ke WhatsApp</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Printable Receipt Paper Container */}
      <div className="flex justify-center">
        <div
          id="receipt-print-area"
          className={`receipt-print-area w-full ${containerWidthClass} bg-white text-black p-4 sm:p-5 rounded-2xl shadow-md border border-neutral-300 font-mono text-[11px] leading-relaxed transition-all`}
        >
          {/* Store Header */}
          <div className="text-center space-y-0.5 border-b border-dashed border-neutral-400 pb-3 mb-3">
            <h1 className="text-sm sm:text-base font-extrabold tracking-tight">
              {(storeSettings.storeName || "KSATRIA GRAPHX").toUpperCase()}
            </h1>
            {storeSettings.tagline && (
              <p className="text-[10px] text-neutral-600">{storeSettings.tagline}</p>
            )}
            {storeSettings.address && (
              <p className="text-[10px] text-neutral-600 leading-snug">{storeSettings.address}</p>
            )}
            {storeSettings.phone && (
              <p className="text-[10px] text-neutral-600">Telp/WA: {storeSettings.phone}</p>
            )}
          </div>

          {/* Meta Info */}
          <div className="space-y-1 border-b border-dashed border-neutral-400 pb-2.5 mb-2.5 text-[10px]">
            <div className="flex justify-between">
              <span className="text-neutral-600">No. Nota</span>
              <span className="font-bold">{order.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-600">Tanggal</span>
              <span>{dateFormatted}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-600">Pelanggan</span>
              <span className="font-semibold">{order.customerNameSnapshot}</span>
            </div>
            {order.customerPhoneSnapshot && (
              <div className="flex justify-between">
                <span className="text-neutral-600">Kontak WA</span>
                <span className="tabular-nums">{order.customerPhoneSnapshot}</span>
              </div>
            )}
            {order.cashierName && (
              <div className="flex justify-between">
                <span className="text-neutral-600">Kasir</span>
                <span>{order.cashierName}</span>
              </div>
            )}
          </div>

          {/* Items List */}
          <div className="space-y-2 border-b border-dashed border-neutral-400 pb-3 mb-3">
            <div className="font-bold text-[10px] uppercase text-neutral-600">Rincian Item:</div>
            {order.items.map((item, idx) => {
              const hasArea = Boolean(item.widthM && item.heightM);
              return (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between items-start gap-1 font-semibold">
                    <span className="break-words">
                      {idx + 1}. {item.productNameSnapshot}
                    </span>
                    <span className="tabular-nums shrink-0">
                      Rp {item.itemSubtotal.toLocaleString("id-ID")}
                    </span>
                  </div>

                  <div className="text-[10px] text-neutral-600 pl-3">
                    {hasArea && (
                      <div>
                        Ukuran: {item.widthM}m × {item.heightM}m
                      </div>
                    )}
                    <div>
                      {item.quantity} × Rp {item.unitPrice.toLocaleString("id-ID")}
                    </div>

                    {item.finishings && item.finishings.length > 0 && (
                      <div className="mt-0.5 space-y-0.5 pl-1 border-l border-neutral-300">
                        {item.finishings.map((f, fIdx) => (
                          <div key={fIdx} className="flex justify-between text-[9px]">
                            <span>+ {f.finishingNameSnapshot}</span>
                            <span className="tabular-nums">
                              Rp {f.subtotal.toLocaleString("id-ID")}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totals Summary */}
          <div className="space-y-1 border-b border-dashed border-neutral-400 pb-3 mb-3 text-[10px]">
            <div className="flex justify-between">
              <span className="text-neutral-600">Subtotal:</span>
              <span className="tabular-nums">Rp {order.subtotal.toLocaleString("id-ID")}</span>
            </div>

            {order.designFee && order.designFee > 0 ? (
              <div className="flex justify-between">
                <span className="text-neutral-600">Biaya Desain:</span>
                <span className="tabular-nums">Rp {order.designFee.toLocaleString("id-ID")}</span>
              </div>
            ) : null}

            {order.discountAmount && order.discountAmount > 0 ? (
              <div className="flex justify-between text-neutral-800">
                <span>Diskon:</span>
                <span className="tabular-nums">- Rp {order.discountAmount.toLocaleString("id-ID")}</span>
              </div>
            ) : null}

            <div className="flex justify-between text-xs font-extrabold pt-1 border-t border-neutral-300">
              <span>GRAND TOTAL:</span>
              <span className="tabular-nums">Rp {order.grandTotal.toLocaleString("id-ID")}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-neutral-600">Total Dibayar:</span>
              <span className="tabular-nums font-semibold">
                Rp {order.paidAmount.toLocaleString("id-ID")}
              </span>
            </div>

            {order.remainingAmount > 0 ? (
              <div className="flex justify-between font-bold">
                <span>Sisa Tagihan:</span>
                <span className="tabular-nums">
                  Rp {order.remainingAmount.toLocaleString("id-ID")}
                </span>
              </div>
            ) : null}

            <div className="flex justify-between items-center pt-1">
              <span className="text-neutral-600">Status Pembayaran:</span>
              <span className="font-extrabold uppercase">[{order.paymentStatus}]</span>
            </div>
          </div>

          {/* Payment & Bank Info */}
          {storeSettings.paymentInfo && (
            <div className="text-[10px] text-neutral-600 border-b border-dashed border-neutral-400 pb-2.5 mb-2.5">
              <div className="font-bold text-neutral-800 mb-0.5">Info Pembayaran:</div>
              <p className="whitespace-pre-line leading-tight">{storeSettings.paymentInfo}</p>
            </div>
          )}

          {/* Receipt Footer */}
          <div className="text-center text-[10px] text-neutral-600 pt-1">
            <p className="leading-snug">
              {storeSettings.receiptFooter ||
                "Nota ini adalah bukti sah pemesanan. Terima kasih atas kunjungan Anda!"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
