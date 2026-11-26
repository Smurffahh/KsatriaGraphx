"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Printer,
  Bluetooth,
  RefreshCw,
  CheckCircle2,
  Trash2,
  AlertCircle,
  FileText,
  Smartphone,
} from "lucide-react";
import {
  listPairedPrinters,
  getDefaultPrinter,
  saveDefaultPrinter,
  clearDefaultPrinter,
  printTestReceipt,
  type ThermalPrinterDevice,
  type DefaultPrinterConfig,
} from "@/lib/printer/bluetooth";
import { isNativeApp } from "@/lib/platform";
import { toast } from "sonner";

export function ThermalPrinterPanel({ storeName = "Ksatria Graphx" }: { storeName?: string }) {
  const [isNative, setIsNative] = useState(false);
  const [pairedDevices, setPairedDevices] = useState<ThermalPrinterDevice[]>([]);
  const [currentPrinter, setCurrentPrinter] = useState<DefaultPrinterConfig | null>(null);
  const [paperWidth, setPaperWidth] = useState<"58mm" | "80mm">("58mm");
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const loadCurrentSettings = useCallback(() => {
    const saved = getDefaultPrinter();
    if (saved) {
      setCurrentPrinter(saved);
      setPaperWidth(saved.paperWidth || "58mm");
    } else {
      setCurrentPrinter(null);
    }
  }, []);

  useEffect(() => {
    const native = isNativeApp();
    setIsNative(native);
    loadCurrentSettings();
  }, [loadCurrentSettings]);

  const handleScanPrinters = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const devices = await listPairedPrinters();
      setPairedDevices(devices);
      if (devices.length === 0) {
        setStatusMessage({
          type: "info",
          text: "Tidak ada printer Bluetooth yang terpasang. Pastikan printer telah di-pairing di menu Pengaturan Bluetooth HP Anda.",
        });
      } else {
        setStatusMessage({
          type: "success",
          text: `Ditemukan ${devices.length} perangkat Bluetooth terpasang.`,
        });
      }
    } catch {
      setStatusMessage({
        type: "error",
        text: "Gagal memindai perangkat Bluetooth. Periksa izin Bluetooth perangkat Anda.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPrinter = (device: ThermalPrinterDevice) => {
    const config: DefaultPrinterConfig = {
      name: device.name,
      address: device.address,
      paperWidth,
    };
    saveDefaultPrinter(config);
    setCurrentPrinter(config);
    toast.success(`Printer "${device.name}" berhasil ditetapkan sebagai printer default.`);
    setStatusMessage({
      type: "success",
      text: `Printer "${device.name}" berhasil ditetapkan sebagai printer default.`,
    });
  };

  const handleWidthChange = (width: "58mm" | "80mm") => {
    setPaperWidth(width);
    if (currentPrinter) {
      const updated: DefaultPrinterConfig = {
        ...currentPrinter,
        paperWidth: width,
      };
      saveDefaultPrinter(updated);
      setCurrentPrinter(updated);
    }
  };

  const handleDisconnectPrinter = () => {
    clearDefaultPrinter();
    setCurrentPrinter(null);
    toast.info("Printer default telah diputus.");
    setStatusMessage({
      type: "info",
      text: "Printer default telah diputus dan dihapus dari memori aplikasi.",
    });
  };

  const handleTestPrint = async () => {
    if (!currentPrinter) {
      toast.error("Pilih printer thermal terlebih dahulu sebelum mencetak tes.");
      setStatusMessage({
        type: "error",
        text: "Pilih printer thermal terlebih dahulu sebelum mencetak tes.",
      });
      return;
    }

    setIsTesting(true);
    setStatusMessage(null);
    try {
      const res = await printTestReceipt(storeName, paperWidth);
      if (res.success) {
        toast.success("Struk tes berhasil dikirim ke printer thermal!");
        setStatusMessage({
          type: "success",
          text: "Struk tes berhasil dikirim ke printer thermal!",
        });
      } else {
        toast.error(res.message);
        setStatusMessage({
          type: "error",
          text: res.message,
        });
      }
    } catch {
      const errMsg = "Terjadi kesalahan saat mengirim perintah cetak ke printer.";
      toast.error(errMsg);
      setStatusMessage({
        type: "error",
        text: errMsg,
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-border shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <Bluetooth className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text">Printer Thermal Bluetooth (Android POS)</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Sambungkan printer struk thermal 58mm atau 80mm via koneksi Bluetooth SPP/ESC-POS
            </p>
          </div>
        </div>

        {/* Badge Platform */}
        <span
          className={`self-start sm:self-auto px-3 py-1 text-xs font-semibold rounded-lg border ${
            isNative
              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              : "bg-surface-muted text-text-muted border-border"
          }`}
        >
          {isNative ? "Aplikasi Android Native" : "Mode Web Browser"}
        </span>
      </div>

      {/* Warning on Web */}
      {!isNative && (
        <div className="p-4 rounded-xl bg-surface-muted/60 border border-border text-xs sm:text-sm text-text-muted flex items-start gap-2.5">
          <Smartphone className="size-4 shrink-0 text-text-muted mt-0.5" />
          <p className="leading-relaxed">
            Pengaturan koneksi langsung ke printer thermal Bluetooth dirancang untuk aplikasi <strong>Android APK</strong>.{" "}
            Pada mode browser Web ini, sistem menggunakan dialog <strong>Web Print (PDF)</strong> bawaan peramban.
          </p>
        </div>
      )}

      {/* Status Message */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs sm:text-sm flex items-center gap-2.5 ${
            statusMessage.type === "success"
              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
              : statusMessage.type === "error"
              ? "bg-danger/10 text-danger border border-danger/20"
              : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : (
            <AlertCircle className="size-4 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Active Printer Card */}
      <div className="p-4 rounded-xl bg-surface-muted/40 border border-border space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs sm:text-sm font-medium text-text-muted">Printer Terpilih Saat Ini:</span>
          {currentPrinter && (
            <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-600">
              Siap Cetak
            </span>
          )}
        </div>

        {currentPrinter ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2.5">
              <Printer className="size-5 text-primary" />
              <div>
                <p className="font-semibold text-sm text-text">{currentPrinter.name}</p>
                <p className="text-xs font-mono text-text-muted">{currentPrinter.address}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleTestPrint}
                disabled={isTesting}
                className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors min-h-10 disabled:opacity-50 cursor-pointer"
              >
                {isTesting ? "Mencetak..." : "Tes Cetak Struk"}
              </button>

              <button
                type="button"
                onClick={handleDisconnectPrinter}
                className="p-2 text-danger hover:bg-danger/10 rounded-xl transition-colors min-h-10 min-w-10 flex items-center justify-center cursor-pointer"
                aria-label="Putus koneksi printer"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs sm:text-sm text-text-muted italic py-1">
            Belum ada printer Bluetooth yang dipilih sebagai printer default.
          </p>
        )}
      </div>

      {/* Paper Width Selector */}
      <div className="space-y-2">
        <label className="block text-xs sm:text-sm font-semibold text-text">Ukuran Kertas Thermal Struk</label>
        <div className="grid grid-cols-2 gap-3 max-w-sm">
          <button
            type="button"
            onClick={() => handleWidthChange("58mm")}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs sm:text-sm font-semibold transition-colors min-h-[44px] cursor-pointer ${
              paperWidth === "58mm"
                ? "bg-primary text-white border-primary shadow-xs"
                : "bg-surface-muted text-text-muted border-border hover:bg-surface-muted/80 hover:text-text"
            }`}
          >
            <FileText className="size-4" />
            <span>58mm (32 Kolom)</span>
          </button>

          <button
            type="button"
            onClick={() => handleWidthChange("80mm")}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs sm:text-sm font-semibold transition-colors min-h-[44px] cursor-pointer ${
              paperWidth === "80mm"
                ? "bg-primary text-white border-primary shadow-xs"
                : "bg-surface-muted text-text-muted border-border hover:bg-surface-muted/80 hover:text-text"
            }`}
          >
            <FileText className="size-4" />
            <span>80mm (48 Kolom)</span>
          </button>
        </div>
      </div>

      {/* Scan & List Devices */}
      <div className="space-y-3 pt-2 border-t border-border/60">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs sm:text-sm font-semibold text-text">Daftar Printer Bluetooth Terpasang (Paired)</span>
          <button
            type="button"
            onClick={handleScanPrinters}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface-muted hover:bg-border text-text text-xs sm:text-sm font-medium rounded-xl transition-colors min-h-10 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
            <span>{isLoading ? "Memindai..." : "Pindai Perangkat"}</span>
          </button>
        </div>

        {pairedDevices.length > 0 && (
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {pairedDevices.map((dev) => {
              const isSelected = currentPrinter?.address === dev.address;
              return (
                <div
                  key={dev.address}
                  className={`flex items-center justify-between gap-2 p-3.5 rounded-xl border transition-colors ${
                    isSelected
                      ? "bg-primary/5 border-primary/40"
                      : "bg-surface-muted/40 border-border"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Bluetooth className="size-4 text-blue-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-xs sm:text-sm text-text truncate">{dev.name}</p>
                      <p className="text-xs font-mono text-text-muted truncate">{dev.address}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectPrinter(dev)}
                    className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-colors min-h-10 shrink-0 cursor-pointer ${
                      isSelected
                        ? "bg-emerald-600 text-white"
                        : "bg-primary text-white hover:bg-primary-hover"
                    }`}
                  >
                    {isSelected ? "Terpilih" : "Pilih Printer"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
