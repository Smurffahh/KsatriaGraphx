"use client";

import React, { useState, useEffect } from "react";
import {
  Store,
  Receipt,
  ShieldAlert,
  Percent,
  Save,
  CheckCircle2,
  AlertCircle,
  Printer,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import { ThermalPrinterPanel } from "@/components/settings/ThermalPrinterPanel";

interface StoreSettingsData {
  id?: number;
  storeName: string;
  tagline: string | null;
  address: string | null;
  phone: string | null;
  paymentInfo: string | null;
  receiptFooter: string | null;
  invoicePrefix: string;
  defaultPaperWidth: "MM_58" | "MM_80";
  maxCashierDiscountPercent: number;
}

interface UserProfile {
  id: string;
  name: string;
  role: "OWNER" | "KASIR";
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formData, setFormData] = useState<StoreSettingsData>({
    storeName: "Ksatria Graphx",
    tagline: "Percetakan, Sablon & Digital Printing",
    address: "Jl. Percetakan No. 1, Kota",
    phone: "0812-3456-7890",
    paymentInfo: "BCA 123456789 a/n Ksatria Graphx | QRIS tersedia di kasir",
    receiptFooter: "Nota ini adalah bukti sah pemesanan. Terima kasih atas kunjungan Anda!",
    invoicePrefix: "KGX",
    defaultPaperWidth: "MM_58",
    maxCashierDiscountPercent: 10,
  });

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const meRes = await apiClient<{ user: UserProfile }>("/api/auth/me");
        if (meRes.success && meRes.data?.user) {
          setUser(meRes.data.user);
          if (meRes.data.user.role === "OWNER") {
            const settingsRes = await apiClient<StoreSettingsData>("/api/settings");
            if (settingsRes.success && settingsRes.data) {
              setFormData({
                storeName: settingsRes.data.storeName || "Ksatria Graphx",
                tagline: settingsRes.data.tagline || "",
                address: settingsRes.data.address || "",
                phone: settingsRes.data.phone || "",
                paymentInfo: settingsRes.data.paymentInfo || "",
                receiptFooter: settingsRes.data.receiptFooter || "",
                invoicePrefix: settingsRes.data.invoicePrefix || "KGX",
                defaultPaperWidth: settingsRes.data.defaultPaperWidth || "MM_58",
                maxCashierDiscountPercent: settingsRes.data.maxCashierDiscountPercent ?? 10,
              });
            }
          }
        }
      } catch (err: unknown) {
        console.error("Gagal memuat pengaturan toko:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const res = await apiClient<StoreSettingsData>("/api/settings", {
        method: "PATCH",
        body: JSON.stringify(formData),
      });

      if (res.success) {
        toast.success("Pengaturan toko dan format nota berhasil disimpan.");
        setStatusMessage({
          type: "success",
          text: "Pengaturan toko dan format nota berhasil disimpan.",
        });
      } else {
        const errorText = res.error || "Gagal memperbarui pengaturan toko.";
        toast.error(errorText);
        setStatusMessage({
          type: "error",
          text: errorText,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error(msg);
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setIsSaving(false);
    }
  }

  // Jika Kasir, izinkan akses ke Thermal Printer Panel tetapi kunci profil toko
  if (!isLoading && user && user.role !== "OWNER") {
    return (
      <div className="space-y-6 pb-16 max-w-4xl mx-auto">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50">
            Pengaturan Printer Kasir
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Konfigurasi koneksi printer thermal Bluetooth untuk mencetak nota transaksi kasir.
          </p>
        </div>

        <ThermalPrinterPanel storeName="Ksatria Graphx" />

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 text-xs text-slate-500">
          <ShieldAlert className="size-5 shrink-0 text-amber-500" />
          <span>Pengaturan profil toko, rekening pembayaran, dan plafon diskon kasir dikunci khusus akun Owner.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50">
          Pengaturan Toko & Format Nota
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Atur identitas Ksatria Graphx, batas diskon kasir, dan pratinjau struk thermal 58mm/80mm.
        </p>
      </div>

      {statusMessage && (
        <div
          className={`flex items-center gap-2 rounded-xl p-4 text-xs sm:text-sm font-medium ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200"
              : "bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="size-5 shrink-0 text-rose-600" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Grid: Form di Kiri, Live Preview Struk di Kanan */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Kolom Kiri: Form Settings */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-6">
          {/* Card 1: Identitas Toko */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3 dark:border-slate-800">
              <Store className="size-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Profil Usaha & Kontak
              </h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nama Toko / Usaha <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.storeName}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  required
                  placeholder="Ksatria Graphx"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tagline / Deskripsi Singkat
                </label>
                <input
                  type="text"
                  value={formData.tagline || ""}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  placeholder="Contoh: Digital Printing, Banner & Merchandise Berkualitas"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    No. Telepon / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formData.phone || ""}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0812-3456-7890"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Prefix Nomor Nota <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={formData.invoicePrefix}
                    onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value.toUpperCase() })}
                    required
                    placeholder="KGX"
                    className="w-full font-mono uppercase text-base sm:text-sm rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                  <p className="text-[11px] text-slate-500">Contoh format nota: {formData.invoicePrefix}-20261120-0001</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Alamat Workshop
                </label>
                <textarea
                  rows={2}
                  value={formData.address || ""}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Jl. Percetakan Raya No. 45, Kecamatan..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Pengaturan Kasir & Plafon Diskon */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3 dark:border-slate-800">
              <Percent className="size-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Kontrol Plafon Diskon Kasir
              </h2>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Batas Maksimal Diskon Kasir (%)
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Kasir tidak diizinkan memberikan diskon melebihi persentase ini saat transaksi POS.
                  </p>
                </div>
                <div className="flex items-center gap-1 font-mono font-bold text-base text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-lg">
                  <span>{formData.maxCashierDiscountPercent}</span>
                  <span>%</span>
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={formData.maxCashierDiscountPercent}
                onChange={(e) => setFormData({ ...formData, maxCashierDiscountPercent: parseInt(e.target.value, 10) || 0 })}
                className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg cursor-pointer dark:bg-slate-700"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>0% (Tanpa Diskon)</span>
                <span>25%</span>
                <span>50%</span>
                <span>100% (Bebas)</span>
              </div>
            </div>
          </div>

          {/* Card 3: Konfigurasi Pembayaran & Footer Nota */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3 dark:border-slate-800">
              <Receipt className="size-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Format Nota & Informasi Pembayaran
              </h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Lebar Kertas Thermal Default
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, defaultPaperWidth: "MM_58" })}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-semibold transition-all ${
                      formData.defaultPaperWidth === "MM_58"
                        ? "border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-600/20 dark:bg-blue-950/50 dark:text-blue-300"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    <Printer className="size-4" />
                    58 mm (Standar Mini)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, defaultPaperWidth: "MM_80" })}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-semibold transition-all ${
                      formData.defaultPaperWidth === "MM_80"
                        ? "border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-600/20 dark:bg-blue-950/50 dark:text-blue-300"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    <Printer className="size-4" />
                    80 mm (Standar Lebar)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Panduan Pembayaran (Ditampilkan di Bawah Nota)
                </label>
                <textarea
                  rows={2}
                  value={formData.paymentInfo || ""}
                  onChange={(e) => setFormData({ ...formData, paymentInfo: e.target.value })}
                  placeholder="Contoh: BCA 123456789 a/n Ksatria Graphx"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Catatan Kaki Nota (Receipt Footer)
                </label>
                <textarea
                  rows={2}
                  value={formData.receiptFooter || ""}
                  onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
                  placeholder="Contoh: Barang yang sudah dicetak tidak dapat dibatalkan. Terima kasih!"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
            >
              <Save className="size-4" />
              {isSaving ? "Menyimpan Pengaturan..." : "Simpan Pengaturan"}
            </button>
          </div>
        </form>

        {/* Kolom Kanan: Live Receipt Thermal Preview (100% JSX Safe) */}
        <div className="lg:col-span-5 sticky top-20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Live Preview Nota Thermal ({formData.defaultPaperWidth === "MM_58" ? "58mm" : "80mm"})
            </span>
            <span className="text-[11px] text-slate-400 font-mono">Real-Time</span>
          </div>

          {/* Struk Thermal Mockup */}
          <div className="mx-auto flex justify-center">
            <div
              className={`rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-lg font-mono text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 transition-all ${
                formData.defaultPaperWidth === "MM_58" ? "w-[280px]" : "w-[360px]"
              }`}
            >
              {/* Header Nota */}
              <div className="text-center space-y-0.5 border-b border-dashed border-slate-300 pb-3 dark:border-slate-700">
                <h3 className="font-bold text-sm uppercase tracking-wide">
                  {formData.storeName || "KSATRIA GRAPHX"}
                </h3>
                {formData.tagline && (
                  <p className="text-[10px] text-slate-500 leading-tight">{formData.tagline}</p>
                )}
                {formData.address && (
                  <p className="text-[10px] text-slate-500 leading-tight">{formData.address}</p>
                )}
                {formData.phone && (
                  <p className="text-[10px] text-slate-500">Telp: {formData.phone}</p>
                )}
              </div>

              {/* Info Nota */}
              <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-1 dark:border-slate-700">
                <div className="flex justify-between">
                  <span>No: {formData.invoicePrefix}-20261120-0001</span>
                  <span>20/11/26 14:30</span>
                </div>
                <div className="flex justify-between">
                  <span>Kasir: {user?.name || "Kasir Utama"}</span>
                  <span>Pelanggan: Umum</span>
                </div>
              </div>

              {/* Sample Order Items */}
              <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-2 dark:border-slate-700">
                <div>
                  <div className="flex justify-between font-semibold">
                    <span>Banner Flexi 280gr</span>
                    <span className="tabular-nums">Rp 75.000</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>3.00m x 1.00m (3.00m²) x 1 pcs</span>
                    <span>@Rp 25.000</span>
                  </div>
                  <div className="text-[10px] text-slate-400 italic">
                    + Mata Ayam 4 Sudut (Rp 5.000)
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold">
                    <span>Stiker Vinyl Glossy</span>
                    <span className="tabular-nums">Rp 30.000</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>2 pcs x @Rp 15.000</span>
                  </div>
                </div>
              </div>

              {/* Total Calculation */}
              <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-1 dark:border-slate-700">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="tabular-nums">Rp 110.000</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Diskon Promo (5%)</span>
                  <span className="tabular-nums">-Rp 5.500</span>
                </div>
                <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-200 dark:border-slate-800">
                  <span>TOTAL AKHIR</span>
                  <span className="tabular-nums">Rp 104.500</span>
                </div>
                <div className="flex justify-between text-[11px] pt-1">
                  <span>Bayar Tunai</span>
                  <span className="tabular-nums">Rp 110.000</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Kembalian</span>
                  <span className="tabular-nums">Rp 5.500</span>
                </div>
              </div>

              {/* Info Pembayaran & Footer */}
              <div className="pt-3 text-center space-y-1.5 text-[10px] text-slate-500 leading-snug">
                {formData.paymentInfo && (
                  <p className="bg-slate-50 p-1.5 rounded dark:bg-slate-800/60 font-medium">
                    {formData.paymentInfo}
                  </p>
                )}
                {formData.receiptFooter && (
                  <p className="italic">{formData.receiptFooter}</p>
                )}
                <p className="text-[9px] text-slate-400">--- Powered by Ksatria Graphx ---</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Panel Printer Thermal Bluetooth */}
      <ThermalPrinterPanel storeName={formData.storeName} />
    </div>
  );
}
