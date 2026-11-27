"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Search,
  Plus,
  MessageCircle,
  Edit2,
  Trash2,
  AlertCircle,
  Clock,
  Package,
  Power,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import {
  VendorFormModal,
  type VendorData,
} from "@/components/vendors/VendorFormModal";
import { Skeleton } from "@/components/ui/skeleton";
import { PageLoadingBanner } from "@/components/ui/page-loading-banner";
import { Button } from "@/components/ui/button";

interface VendorListItem extends VendorData {
  productCount: number;
  assignedProductionCost: number;
  settledAmount: number;
  remainingPayable: number;
  createdAt: string;
  updatedAt: string;
}

interface CurrentUser {
  id: string;
  name: string;
  role: "OWNER" | "KASIR";
}

function VendorsSkeleton() {
  return (
    <div className="space-y-4">
      <PageLoadingBanner message="Memuat daftar vendor mitra..." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 lg:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-3">
            <Skeleton className="h-5 w-40 rounded-md" />
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>
        ))}
      </div>
      <div className="hidden lg:block rounded-2xl bg-card border border-border shadow-xs p-5 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default function VendorsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [vendorsList, setVendorsList] = useState<VendorListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "true" | "false">("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<VendorData | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<VendorListItem | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  useEffect(() => {
    apiClient
      .get<{ user: CurrentUser }>("/api/auth/me")
      .then((res) => {
        if (res.success && res.data?.user) {
          if (res.data.user.role !== "OWNER") {
            toast.error("Akses ditolak: Master Vendor Mitra khusus Pemilik Usaha (Owner).");
            router.replace("/dashboard");
            return;
          }
          setCurrentUser(res.data.user);
        }
      })
      .catch(() => {});
  }, [router]);

  const fetchVendors = useCallback(async () => {
    if (currentUser?.role !== "OWNER") return;
    setIsLoading(true);
    setErrorMsg("");
    try {
      const params = new URLSearchParams({
        isActive: statusFilter,
        limit: "200",
      });
      if (search.trim()) params.set("q", search.trim());

      const res = await apiClient.get<VendorListItem[]>(`/api/vendors?${params.toString()}`);
      if (res.success && res.data) {
        setVendorsList(res.data);
      } else {
        setErrorMsg(res.error || "Gagal memuat data vendor mitra");
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal memuat data vendor mitra");
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVendors();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchVendors]);

  const invalidateVendorConsumers = () => {
    queryClient.invalidateQueries({ queryKey: ["vendors"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
  };

  async function handleToggleActive(vendor: VendorListItem) {
    setIsMutating(true);
    try {
      const res = await apiClient.patch(`/api/vendors/${vendor.id}`, {
        isActive: !vendor.isActive,
      });
      if (!res.success) {
        throw new Error(res.error || "Gagal memperbarui status vendor");
      }
      toast.success(
        !vendor.isActive
          ? `Vendor "${vendor.name}" diaktifkan kembali`
          : `Vendor "${vendor.name}" dinonaktifkan`
      );
      invalidateVendorConsumers();
      await fetchVendors();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah status vendor");
    } finally {
      setIsMutating(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setIsMutating(true);
    try {
      const res = await apiClient.delete<{ deleted: boolean; softDeleted: boolean }>(
        `/api/vendors/${deleteTarget.id}`
      );
      if (!res.success) {
        throw new Error(res.error || "Gagal menghapus vendor");
      }
      toast.success(
        res.message ||
          (res.data?.softDeleted
            ? `Vendor "${deleteTarget.name}" dinonaktifkan`
            : `Vendor "${deleteTarget.name}" dihapus permanen`)
      );
      setDeleteTarget(null);
      invalidateVendorConsumers();
      await fetchVendors();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus vendor");
    } finally {
      setIsMutating(false);
    }
  }

  const totalPayable = vendorsList.reduce((sum, v) => sum + (v.remainingPayable ?? 0), 0);
  const activeCount = vendorsList.filter((v) => v.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-foreground flex items-center gap-2.5">
            <Building2 className="size-6 sm:size-7 text-primary shrink-0" />
            <span>Master Vendor Mitra</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Direktori percetakan, konveksi, dan rekanan produksi internal Owner
          </p>
        </div>

        <Button
          size="lg"
          onClick={() => {
            setEditingVendor(null);
            setModalOpen(true);
          }}
          className="gap-2 w-full sm:w-auto min-h-[44px]"
        >
          <Plus className="size-4" />
          <span>Tambah Vendor</span>
        </Button>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 tabular-nums">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-2xs">
          <span className="text-xs font-medium text-muted-foreground block">
            Total Vendor Terdaftar
          </span>
          <span className="text-2xl font-bold text-foreground mt-1 block">
            {vendorsList.length}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border shadow-2xs">
          <span className="text-xs font-medium text-muted-foreground block">
            Vendor Aktif
          </span>
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
            {activeCount}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border shadow-2xs">
          <span className="text-xs font-medium text-muted-foreground block">
            Estimasi Sisa Tagihan Item Terkait
          </span>
          <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 block">
            Rp {totalPayable.toLocaleString("id-ID")}
          </span>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama vendor, PIC, spesialisasi, atau nomor WA..."
            className="h-11 w-full pl-10 pr-4 text-base sm:text-sm bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0 overflow-x-auto">
          {(
            [
              { key: "all", label: "Semua" },
              { key: "true", label: "Aktif" },
              { key: "false", label: "Nonaktif" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`min-h-11 px-4 rounded-xl text-xs sm:text-sm font-medium border transition-colors cursor-pointer ${
                statusFilter === tab.key
                  ? "bg-primary text-primary-foreground border-primary font-semibold"
                  : "bg-muted/50 text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2.5">
          <AlertCircle className="size-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {isLoading ? (
        <VendorsSkeleton />
      ) : vendorsList.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-card border border-dashed border-border space-y-2.5">
          <Building2 className="size-10 mx-auto text-muted-foreground/40" />
          <h3 className="text-base font-semibold text-foreground">
            {search ? "Vendor Tidak Ditemukan" : "Belum Ada Vendor Mitra"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {search
              ? "Coba kata kunci atau filter status lain."
              : "Tambahkan percetakan atau konveksi rekanan untuk mengirim SPK WhatsApp 1-klik dan memantau setoran modal."}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 lg:hidden">
            {vendorsList.map((v) => (
              <div
                key={v.id}
                className="p-4 rounded-2xl bg-card border border-border shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-base text-foreground truncate">
                      {v.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {v.contactName ? `PIC: ${v.contactName}` : "Tanpa nama PIC"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      v.isActive
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {v.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </div>

                {v.specialty && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{v.specialty}</p>
                )}

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs tabular-nums">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="size-3.5 shrink-0" />
                    <span>Estimasi {v.leadTimeDays} hari</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground justify-end">
                    <Package className="size-3.5 shrink-0" />
                    <span>{v.productCount} produk default</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
                  <a
                    href={`https://wa.me/${v.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                  >
                    <MessageCircle className="size-3.5" />
                    <span className="tabular-nums">+{v.whatsapp}</span>
                  </a>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingVendor(v);
                        setModalOpen(true);
                      }}
                      className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
                    >
                      <Edit2 className="size-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      disabled={isMutating}
                      onClick={() => setDeleteTarget(v)}
                      className="inline-flex min-h-10 items-center justify-center rounded-lg border border-destructive/20 bg-destructive/10 px-2.5 text-destructive hover:bg-destructive/20 cursor-pointer"
                      aria-label={`Hapus ${v.name}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block rounded-2xl bg-card border border-border shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                    <th className="py-3.5 px-4">Vendor &amp; PIC</th>
                    <th className="py-3.5 px-4">Spesialisasi &amp; Lead Time</th>
                    <th className="py-3.5 px-4">WhatsApp</th>
                    <th className="py-3.5 px-4 text-center">Produk</th>
                    <th className="py-3.5 px-4 text-right">Sisa Tagihan</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {vendorsList.map((v) => (
                    <tr key={v.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-foreground">{v.name}</p>
                        {v.contactName && (
                          <p className="text-xs text-muted-foreground mt-0.5">PIC: {v.contactName}</p>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="text-foreground">{v.specialty || "-"}</p>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          Estimasi {v.leadTimeDays} hari kerja
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <a
                          href={`https://wa.me/${v.whatsapp}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:underline tabular-nums"
                        >
                          <MessageCircle className="size-3.5" />
                          <span>+{v.whatsapp}</span>
                        </a>
                      </td>
                      <td className="py-3.5 px-4 text-center tabular-nums font-medium">
                        {v.productCount}
                      </td>
                      <td className="py-3.5 px-4 text-right tabular-nums font-semibold">
                        {v.remainingPayable > 0 ? (
                          <span className="text-amber-600 dark:text-amber-400">
                            Rp {v.remainingPayable.toLocaleString("id-ID")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Rp 0</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            v.isActive
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {v.isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(v)}
                            disabled={isMutating}
                            title={v.isActive ? "Nonaktifkan vendor" : "Aktifkan vendor"}
                            className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                          >
                            <Power className="size-3.5" />
                            <span>{v.isActive ? "Nonaktif" : "Aktifkan"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingVendor(v);
                              setModalOpen(true);
                            }}
                            className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
                          >
                            <Edit2 className="size-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(v)}
                            disabled={isMutating}
                            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-destructive/20 bg-destructive/10 px-2.5 text-destructive hover:bg-destructive/20 cursor-pointer"
                            aria-label={`Hapus ${v.name}`}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <VendorFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialData={editingVendor}
        onSuccess={() => {
          invalidateVendorConsumers();
          fetchVendors();
        }}
      />

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-semibold text-foreground">
              Hapus atau Nonaktifkan Vendor?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Vendor <strong>{deleteTarget.name}</strong> akan dihapus permanen bila belum memiliki
              riwayat produk/transaksi, atau otomatis dinonaktifkan agar histori nota tetap aman.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isMutating}
                onClick={() => setDeleteTarget(null)}
                className="min-h-[44px] rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isMutating}
                onClick={handleDeleteConfirm}
                className="min-h-[44px] rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 cursor-pointer"
              >
                {isMutating ? "Memproses..." : "Ya, Lanjutkan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
