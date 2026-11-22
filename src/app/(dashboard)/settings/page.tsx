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
  Sparkles,
  ExternalLink,
  RefreshCw,
  ArrowUpCircle,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import { ThermalPrinterPanel } from "@/components/settings/ThermalPrinterPanel";
import { APP_VERSION } from "@/lib/version";
import { isNativeApp } from "@/lib/platform";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageLoadingBanner } from "@/components/ui/page-loading-banner";

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

function SettingsSkeleton() {
  return (
    <div className="space-y-6 pb-16">
      <PageLoadingBanner message="Memuat pengaturan toko..." />
      <div className="space-y-2">
        <Skeleton className="h-7 w-64 rounded-xl" />
        <Skeleton className="h-4 w-96 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        <div className="lg:col-span-7 space-y-6">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
        <div className="lg:col-span-5 space-y-4">
          <Skeleton className="h-[460px] w-full max-w-[360px] mx-auto rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const isNative = isNativeApp();
  const {
    latestVersion,
    hasUpdate,
    isManualChecking,
    checkForUpdate,
    setIsModalOpen,
  } = useAppUpdate();

  const handleCheckUpdateClick = async () => {
    const result = await checkForUpdate({ force: true, silent: true });
    if (result.status === "update-available") {
      setIsModalOpen(true);
      toast.info(`Pembaruan v${result.latestVersion} tersedia!`, {
        description: "Buka dialog pembaruan untuk melihat rincian perbaikan.",
      });
    } else if (result.status === "up-to-date") {
      toast.success(`Aplikasi sudah menggunakan versi terbaru (v${result.currentVersion})`, {
        description: "Tidak ada pembaruan tertunda.",
      });
    } else {
      toast.error("Gagal memeriksa pembaruan", {
        description:
          result.errorMessage ||
          "Pastikan koneksi internet aktif dan coba beberapa saat lagi.",
      });
    }
  };

  const [formData, setFormData] = useState<StoreSettingsData>({
    storeName: "Ksatria Graphx",
    tagline: "Percetakan, Sablon & Digital Printing",
    address: "Jl. Percetakan No. 1, Kota",
    phone: "0812-3456-7890",
    paymentInfo: "BCA 123456789 a/n Ksatria Graphx | QRIS tersedia di kasir",
    receiptFooter:
      "Nota ini adalah bukti sah pemesanan. Terima kasih atas kunjungan Anda!",
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
            const settingsRes =
              await apiClient<StoreSettingsData>("/api/settings");
            if (settingsRes.success && settingsRes.data) {
              setFormData({
                storeName: settingsRes.data.storeName || "Ksatria Graphx",
                tagline: settingsRes.data.tagline || "",
                address: settingsRes.data.address || "",
                phone: settingsRes.data.phone || "",
                paymentInfo: settingsRes.data.paymentInfo || "",
                receiptFooter: settingsRes.data.receiptFooter || "",
                invoicePrefix: settingsRes.data.invoicePrefix || "KGX",
                defaultPaperWidth:
                  settingsRes.data.defaultPaperWidth || "MM_58",
                maxCashierDiscountPercent:
                  settingsRes.data.maxCashierDiscountPercent ?? 10,
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

  if (isLoading) {
    return <SettingsSkeleton />;
  }

  // Komponen Kartu Tentang Aplikasi & Pembaruan (Titik 4 Versi)
  const VersionInfoCard = (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">
              Tentang Aplikasi & Pembaruan
            </h2>
            <p className="text-xs text-muted-foreground">
              Informasi rilis, status platform, dan verifikasi versi Ksatria Graphx
            </p>
          </div>
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          v{APP_VERSION}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-1">
          <span className="text-muted-foreground">Platform Lingkungan</span>
          <p className="font-semibold text-foreground">
            {isNative
              ? "Android APK (Capacitor Native)"
              : "Web Application (Next.js)"}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-1">
          <span className="text-muted-foreground">Status Versi</span>
          <div className="flex items-center gap-2">
            {hasUpdate ? (
              <span className="font-semibold text-primary">
                Tersedia pembaruan: v{latestVersion}
              </span>
            ) : (
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                Versi paling mutakhir (Up-to-date)
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        <a
          href="https://github.com/Smurffahh/KsatriaGraphx/releases"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="size-3.5" />
          <span>Lihat Riwayat Rilis di GitHub</span>
        </a>

        <div className="flex items-center gap-2 justify-end">
          {hasUpdate && (
            <Button
              type="button"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="gap-1.5"
            >
              <ArrowUpCircle className="size-4" />
              <span>Lihat & Unduh Pembaruan</span>
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isManualChecking}
            onClick={handleCheckUpdateClick}
            className="gap-1.5"
          >
            <RefreshCw
              className={`size-3.5 ${isManualChecking ? "animate-spin" : ""}`}
            />
            <span>{isManualChecking ? "Memeriksa..." : "Periksa Pembaruan"}</span>
          </Button>
        </div>
      </div>
    </div>
  );

  // Jika Kasir, izinkan akses ke Thermal Printer Panel dan Kartu Versi (profil toko terkunci)
  if (user && user.role !== "OWNER") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Pengaturan Printer Kasir
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Konfigurasi koneksi printer thermal Bluetooth untuk mencetak nota transaksi kasir.
          </p>
        </div>

        <ThermalPrinterPanel storeName="Ksatria Graphx" />

        {/* Titik 4 Versi untuk Kasir */}
        {VersionInfoCard}

        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 text-xs text-muted-foreground">
          <ShieldAlert className="size-5 shrink-0 text-amber-500" />
          <span>
            Pengaturan profil toko, rekening pembayaran, dan plafon diskon kasir dikunci khusus akun Owner.
          </span>
        </div>
      </div>
    );
  }

  // Tampilan Owner Lengkap
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Pengaturan Toko & Format Nota
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
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
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-border pb-3">
              <Store className="size-5 text-primary" />
              <h2 className="text-sm font-bold text-foreground">
                Profil Usaha & Kontak
              </h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Nama Toko / Usaha <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={formData.storeName}
                  onChange={(e) =>
                    setFormData({ ...formData, storeName: e.target.value })
                  }
                  required
                  placeholder="Ksatria Graphx"
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-hidden focus:ring-2 focus:ring-ring/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Tagline / Deskripsi Singkat
                </label>
                <input
                  type="text"
                  value={formData.tagline || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, tagline: e.target.value })
                  }
                  placeholder="Contoh: Digital Printing, Banner & Merchandise Berkualitas"
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-hidden focus:ring-2 focus:ring-ring/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    No. Telepon / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formData.phone || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="0812-3456-7890"
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-hidden focus:ring-2 focus:ring-ring/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Prefix Nomor Nota <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={formData.invoicePrefix}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        invoicePrefix: e.target.value.toUpperCase(),
                      })
                    }
                    required
                    placeholder="KGX"
                    className="w-full font-mono uppercase text-base sm:text-sm rounded-xl border border-input bg-background px-3.5 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-hidden focus:ring-2 focus:ring-ring/20"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Contoh format nota: {formData.invoicePrefix}-20261120-0001
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Alamat Workshop
                </label>
                <textarea
                  rows={2}
                  value={formData.address || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Jl. Percetakan Raya No. 45, Kecamatan..."
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-hidden focus:ring-2 focus:ring-ring/20"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Pengaturan Kasir & Plafon Diskon */}
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-border pb-3">
              <Percent className="size-5 text-primary" />
              <h2 className="text-sm font-bold text-foreground">
                Kontrol Plafon Diskon Kasir
              </h2>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-semibold text-foreground">
                    Batas Maksimal Diskon Kasir (%)
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Kasir tidak diizinkan memberikan diskon melebihi persentase ini saat transaksi POS.
                  </p>
                </div>
                <div className="flex items-center gap-1 font-mono font-bold text-base text-primary bg-primary/10 px-3 py-1 rounded-lg">
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
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxCashierDiscountPercent: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>0% (Tanpa Diskon)</span>
                <span>25%</span>
                <span>50%</span>
                <span>100% (Bebas)</span>
              </div>
            </div>
          </div>

          {/* Card 3: Konfigurasi Pembayaran & Footer Nota */}
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-border pb-3">
              <Receipt className="size-5 text-primary" />
              <h2 className="text-sm font-bold text-foreground">
                Format Nota & Informasi Pembayaran
              </h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Lebar Kertas Thermal Default
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, defaultPaperWidth: "MM_58" })
                    }
                    className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-semibold transition-[color,background-color,border-color,box-shadow] ${
                      formData.defaultPaperWidth === "MM_58"
                        ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                        : "border-border bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    <Printer className="size-4" />
                    58 mm (Standar Mini)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, defaultPaperWidth: "MM_80" })
                    }
                    className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-semibold transition-[color,background-color,border-color,box-shadow] ${
                      formData.defaultPaperWidth === "MM_80"
                        ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                        : "border-border bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    <Printer className="size-4" />
                    80 mm (Standar Lebar)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Panduan Pembayaran (Ditampilkan di Bawah Nota)
                </label>
                <textarea
                  rows={2}
                  value={formData.paymentInfo || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, paymentInfo: e.target.value })
                  }
                  placeholder="Contoh: BCA 123456789 a/n Ksatria Graphx"
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-hidden focus:ring-2 focus:ring-ring/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Catatan Kaki Nota (Receipt Footer)
                </label>
                <textarea
                  rows={2}
                  value={formData.receiptFooter || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, receiptFooter: e.target.value })
                  }
                  placeholder="Contoh: Barang yang sudah dicetak tidak dapat dibatalkan. Terima kasih!"
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-hidden focus:ring-2 focus:ring-ring/20"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSaving}
              className="min-h-[44px] gap-2"
            >
              <Save className="size-4" />
              {isSaving ? "Menyimpan Pengaturan..." : "Simpan Pengaturan"}
            </Button>
          </div>
        </form>

        {/* Kolom Kanan: Live Receipt Thermal Preview (100% JSX Safe) & Card Versi */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Live Preview Nota Thermal (
                {formData.defaultPaperWidth === "MM_58" ? "58mm" : "80mm"})
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                Real-Time
              </span>
            </div>

            {/* Struk Thermal Mockup */}
            <div className="mx-auto flex justify-center">
              <div
                className={`rounded-2xl border border-border bg-card p-5 text-foreground shadow-lg font-mono text-xs transition-[width,border-color,box-shadow] ${
                  formData.defaultPaperWidth === "MM_58"
                    ? "w-[280px]"
                    : "w-[360px]"
                }`}
              >
                {/* Header Nota */}
                <div className="text-center space-y-0.5 border-b border-dashed border-border pb-3">
                  <h3 className="font-bold text-sm uppercase tracking-wide">
                    {formData.storeName || "KSATRIA GRAPHX"}
                  </h3>
                  {formData.tagline && (
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      {formData.tagline}
                    </p>
                  )}
                  {formData.address && (
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      {formData.address}
                    </p>
                  )}
                  {formData.phone && (
                    <p className="text-[10px] text-muted-foreground">
                      Telp: {formData.phone}
                    </p>
                  )}
                </div>

                {/* Info Nota */}
                <div className="py-2.5 border-b border-dashed border-border text-[11px] space-y-1">
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
                <div className="py-2.5 border-b border-dashed border-border text-[11px] space-y-2">
                  <div>
                    <div className="flex justify-between font-semibold">
                      <span>Banner Flexi 280gr</span>
                      <span className="tabular-nums">Rp 75.000</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>3.00m x 1.00m (3.00m²) x 1 pcs</span>
                      <span>@Rp 25.000</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground/80 italic">
                      + Mata Ayam 4 Sudut (Rp 5.000)
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-semibold">
                      <span>Stiker Vinyl Glossy</span>
                      <span className="tabular-nums">Rp 30.000</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>2 pcs x @Rp 15.000</span>
                    </div>
                  </div>
                </div>

                {/* Total Calculation */}
                <div className="py-2.5 border-b border-dashed border-border text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="tabular-nums">Rp 110.000</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Diskon Promo (5%)</span>
                    <span className="tabular-nums">-Rp 5.500</span>
                  </div>
                  <div className="flex justify-between font-bold text-xs pt-1 border-t border-border">
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
                <div className="pt-3 text-center space-y-1.5 text-[10px] text-muted-foreground leading-snug">
                  {formData.paymentInfo && (
                    <p className="bg-muted p-1.5 rounded font-medium text-foreground">
                      {formData.paymentInfo}
                    </p>
                  )}
                  {formData.receiptFooter && (
                    <p className="italic">{formData.receiptFooter}</p>
                  )}
                  <p className="text-[9px] text-muted-foreground">
                    --- Powered by Ksatria Graphx ---
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Titik 4 Versi untuk Owner */}
          {VersionInfoCard}
        </div>
      </div>

      {/* Panel Printer Thermal Bluetooth */}
      <ThermalPrinterPanel storeName={formData.storeName} />
    </div>
  );
}
