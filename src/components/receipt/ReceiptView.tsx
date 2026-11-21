"use client";

import React, { useState, useEffect } from "react";
import {
  Printer,
  Download,
  MessageCircle,
  Bluetooth,
  Share2,
} from "lucide-react";
import {
  buildWhatsAppReceiptUrl,
  exportReceiptAsPng,
  shareReceiptNative,
  type ReceiptOrderData,
  type ReceiptStoreSettings,
} from "@/lib/printer/share";
import { printReceiptThermal } from "@/lib/printer/bluetooth";
import { isNativeApp } from "@/lib/platform";
import { toast } from "sonner";

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
  const [isNative, setIsNative] = useState(false);
  const [isPrintingThermal, setIsPrintingThermal] = useState(false);
  const [thermalFeedback, setThermalFeedback] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    setIsNative(isNativeApp());
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handlePrintThermal = async () => {
    setIsPrintingThermal(true);
    setThermalFeedback(null);
    try {
      const res = await printReceiptThermal(
        order,
        storeSettings,
        paperWidth === "A5" ? "80mm" : paperWidth
      );
      if (res.success) {
        toast.success("Struk berhasil dikirim ke printer thermal");
      } else {
        toast.error(res.message);
      }
      setThermalFeedback({ text: res.message, error: !res.success });
      setTimeout(() => setThermalFeedback(null), 5000);
    } catch {
      const errMsg = "Gagal menghubungkan ke printer thermal.";
      toast.error(errMsg);
      setThermalFeedback({
        text: errMsg,
        error: true,
      });
    } finally {
      setIsPrintingThermal(false);
    }
  };

  const handleExportPng = async () => {
    setIsExporting(true);
    try {
      await exportReceiptAsPng(
        order,
        storeSettings,
        paperWidth === "A5" ? "80mm" : paperWidth
      );
      toast.success("Gambar nota PNG berhasil diunduh");
    } catch (err) {
      console.error("Gagal export PNG:", err);
      toast.error("Gagal mengekspor gambar nota PNG");
    } finally {
      setIsExporting(false);
    }
  };

  const handleNativeShare = async () => {
    setIsExporting(true);
    try {
      await shareReceiptNative(
        order,
        storeSettings,
        paperWidth === "A5" ? "80mm" : paperWidth
      );
      toast.success("Nota berhasil dibagikan");
    } catch (err) {
      console.error("Gagal share native:", err);
      toast.error("Gagal membagikan nota");
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
    toast.success("Membuka WhatsApp untuk mengirim nota...");
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
        <div className="no-print p-3 rounded-2xl bg-surface border border-border space-y-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
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
              {isNative ? (
                <>
                  {/* Mode APK Native: Tombol Cetak Thermal Bluetooth */}
                  <button
                    type="button"
                    onClick={handlePrintThermal}
                    disabled={isPrintingThermal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary hover:bg-primary-hover text-white rounded-xl shadow-xs transition-colors min-h-[38px] disabled:opacity-50"
                  >
                    <Bluetooth className="size-3.5" />
                    <span>{isPrintingThermal ? "Mencetak..." : "Cetak Thermal"}</span>
                  </button>

                  {/* Mode APK Native: Tombol Bagikan Nota */}
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    disabled={isExporting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors min-h-[38px] disabled:opacity-50"
                  >
                    <Share2 className="size-3.5" />
                    <span>Bagikan Gambar / WA</span>
                  </button>
                </>
              ) : (
                <>
                  {/* Mode Web: Tombol Cetak Browser */}
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
                </>
              )}
            </div>
          </div>

          {/* Feedback Cetak Thermal */}
          {thermalFeedback && (
            <div
              className={`p-2.5 rounded-xl text-xs font-medium ${
                thermalFeedback.error
                  ? "bg-danger/10 text-danger border border-danger/20"
                  : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
              }`}
            >
              {thermalFeedback.text}
            </div>
          )}
        </div>
      )}

      {/* Printable Receipt Paper Container */}
      <div className="flex justify-center">
        <div
          id="receipt-print-area"
          className={`receipt-print-area w-full ${containerWidthClass} bg-white text-black p-4 sm:p-5 rounded-2xl shadow-md border border-neutral-300 font-mono text-[11px] leading-relaxed transition-all`}
        >
          {/* Store Header */}
          <div className="text-center border-b border-dashed border-neutral-400 pb-3 mb-3">
            <h2 className="font-extrabold text-sm tracking-wider uppercase text-neutral-900">
              {storeSettings.storeName || "KSATRIA GRAPHX"}
            </h2>
            {storeSettings.tagline && (
              <p className="text-[10px] text-neutral-600 italic mt-0.5">{storeSettings.tagline}</p>
            )}
            {storeSettings.address && (
              <p className="text-[10px] text-neutral-600 mt-1">{storeSettings.address}</p>
            )}
            {storeSettings.phone && (
              <p className="text-[10px] text-neutral-600">Telp/WA: {storeSettings.phone}</p>
            )}
          </div>

          {/* Invoice Meta */}
          <div className="border-b border-dashed border-neutral-400 pb-2.5 mb-2.5 space-y-0.5 text-neutral-700 text-[10px]">
            <div className="flex justify-between">
              <span className="font-semibold text-neutral-900">No. Nota:</span>
              <span className="font-bold text-neutral-900">{order.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Tanggal :</span>
              <span>{dateFormatted}</span>
            </div>
            <div className="flex justify-between">
              <span>Pelanggan:</span>
              <span className="font-medium text-neutral-900 truncate max-w-[150px]">
                {order.customerNameSnapshot}
              </span>
            </div>
            {order.customerPhoneSnapshot && (
              <div className="flex justify-between">
                <span>Telepon :</span>
                <span>{order.customerPhoneSnapshot}</span>
              </div>
            )}
            {order.cashierName && (
              <div className="flex justify-between">
                <span>Kasir   :</span>
                <span>{order.cashierName}</span>
              </div>
            )}
          </div>

          {/* Item Rows */}
          <div className="border-b border-dashed border-neutral-400 pb-2.5 mb-2.5 space-y-2">
            <div className="font-bold text-[10px] uppercase text-neutral-800 border-b border-neutral-200 pb-1">
              Rincian Item
            </div>
            {order.items.map((item, index) => {
              const isArea = item.pricingTypeSnapshot === "AREA" && item.widthM && item.heightM;
              return (
                <div key={index} className="space-y-0.5 text-[10px]">
                  <div className="font-bold text-neutral-900">
                    {index + 1}. {item.productNameSnapshot}
                  </div>

                  {isArea && (
                    <div className="text-neutral-500 pl-2">
                      Dimensi: {item.widthM}m x {item.heightM}m
                    </div>
                  )}

                  <div className="flex justify-between pl-2 text-neutral-600">
                    <span>
                      {item.quantity} x Rp {item.unitPrice.toLocaleString("id-ID")}
                    </span>
                    <span className="font-semibold text-neutral-900 tabular-nums">
                      Rp {item.itemSubtotal.toLocaleString("id-ID")}
                    </span>
                  </div>

                  {item.finishings && item.finishings.length > 0 && (
                    <div className="pl-3 space-y-0.5 text-neutral-500 text-[9px]">
                      {item.finishings.map((f, fIdx) => (
                        <div key={fIdx} className="flex justify-between">
                          <span>+ {f.finishingNameSnapshot}</span>
                          <span className="tabular-nums">Rp {f.subtotal.toLocaleString("id-ID")}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Financial Breakdown */}
          <div className="space-y-1 text-[10px] border-b border-dashed border-neutral-400 pb-2.5 mb-2.5">
            <div className="flex justify-between">
              <span className="text-neutral-600">Subtotal:</span>
              <span className="tabular-nums">Rp {order.subtotal.toLocaleString("id-ID")}</span>
            </div>

            {order.designFee && order.designFee > 0 ? (
              <div className="flex justify-between text-neutral-600">
                <span>Biaya Desain:</span>
                <span className="tabular-nums">Rp {order.designFee.toLocaleString("id-ID")}</span>
              </div>
            ) : null}

            {order.discountAmount && order.discountAmount > 0 ? (
              <div className="flex justify-between text-neutral-600">
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
