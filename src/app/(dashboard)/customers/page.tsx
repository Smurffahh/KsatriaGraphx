"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Plus,
  Phone,
  MessageCircle,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Receipt,
  AlertCircle,
  Eye,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import {
  CustomerFormModal,
  type CustomerData,
} from "@/components/customers/CustomerFormModal";
import { Skeleton } from "@/components/ui/skeleton";
import { PageLoadingBanner } from "@/components/ui/page-loading-banner";
import { Button } from "@/components/ui/button";

interface CustomerListItem extends CustomerData {
  createdAt: string;
  updatedAt: string;
  totalOrders: number;
  totalPiutang: number;
}

interface CustomersApiResponse {
  data: CustomerListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface CurrentUser {
  id: string;
  name: string;
  role: "OWNER" | "KASIR";
}

function CustomersSkeleton() {
  return (
    <div className="space-y-4">
      <PageLoadingBanner message="Memuat data pelanggan..." />
      {/* Mobile Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 lg:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <Skeleton className="h-5 w-32 rounded-md" />
                <Skeleton className="h-3 w-24 rounded-md" />
              </div>
              <Skeleton className="size-8 rounded-xl" />
            </div>
            <div className="pt-2 border-t border-border/50 flex items-center justify-between">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-7 w-20 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table Skeleton */}
      <div className="hidden lg:block rounded-2xl bg-card border border-border shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border">
          <Skeleton className="h-5 w-40 rounded-md" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4 py-2 border-b border-border/40 last:border-none"
            >
              <Skeleton className="h-4 w-36 rounded-md" />
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-4 w-48 rounded-md" />
              <Skeleton className="h-4 w-16 rounded-md" />
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-7 w-24 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(
    null
  );

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    apiClient
      .get<{ user: CurrentUser }>("/api/auth/me")
      .then((res) => {
        if (res.success && res.data?.user) {
          setCurrentUser(res.data.user);
        }
      })
      .catch(() => {});
  }, []);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    setActionError("");
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      if (search.trim()) {
        params.set("search", search.trim());
      }

      const res = await apiClient.get<CustomersApiResponse>(
        `/api/customers?${params.toString()}`
      );
      if (res.success && res.data) {
        setCustomers(res.data.data);
        setTotalPages(res.data.pagination.totalPages);
        setTotalRecords(res.data.pagination.total);
      } else {
        setActionError(res.error || "Gagal memuat data pelanggan");
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setActionError(errorObj.message || "Gagal memuat data pelanggan");
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  const handleOpenAddModal = () => {
    setSelectedCustomer(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (c: CustomerListItem) => {
    setSelectedCustomer(c);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    setActionError("");
    try {
      const res = await apiClient.delete(`/api/customers/${id}`);
      if (res.success) {
        toast.success("Data pelanggan berhasil dihapus");
        setDeleteConfirmId(null);
        fetchCustomers();
      } else {
        toast.error(res.error || "Gagal menghapus pelanggan");
        setActionError(res.error || "Gagal menghapus pelanggan");
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      toast.error(errorObj.message || "Terjadi kesalahan sistem");
      setActionError(errorObj.message || "Terjadi kesalahan sistem");
    } finally {
      setIsDeleting(false);
    }
  };

  const totalPiutangSemua = customers.reduce(
    (acc, curr) => acc + (curr.totalPiutang || 0),
    0
  );

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="size-6 text-primary" />
            <span>Data Pelanggan</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Kelola kontak pelanggan, riwayat transaksi, dan catatan piutang nota
          </p>
        </div>

        <Button onClick={handleOpenAddModal} className="gap-2 min-h-[44px]">
          <Plus className="size-4" />
          <span>Tambah Pelanggan</span>
        </Button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Users className="size-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">
              Total Pelanggan Terdaftar
            </div>
            <div className="text-xl font-bold text-foreground tabular-nums">
              {totalRecords}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
            <Receipt className="size-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">
              Total Piutang di Halaman Ini
            </div>
            <div className="text-xl font-bold text-foreground tabular-nums">
              Rp {totalPiutangSemua.toLocaleString("id-ID")}
            </div>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="size-5 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari berdasarkan nama atau no. WA..."
            className="h-11 w-full pl-10 pr-4 text-base sm:text-sm bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary transition-[border-color,box-shadow]"
          />
        </div>
      </div>

      {/* Content: Mobile Cards + Desktop Table */}
      {isLoading ? (
        <CustomersSkeleton />
      ) : customers.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-card border border-border">
          <Users className="size-10 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-semibold text-foreground">
            Belum ada pelanggan ditemukan
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            {search
              ? "Tidak ada pelanggan yang cocok dengan kata kunci pencarian Anda."
              : "Mulai catat pelanggan agar nama dan nomor WhatsApp otomatis tersimpan saat transaksi POS."}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card View (hidden on lg) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 lg:hidden">
            {customers.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-foreground text-base">
                      {c.name}
                    </h3>
                    {c.phone ? (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <Phone className="size-3.5 text-primary" />
                        <span className="tabular-nums">{c.phone}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        Tidak ada nomor
                      </span>
                    )}
                  </div>

                  {c.phone && (
                    <a
                      href={`https://wa.me/${c.phone.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="size-10 flex items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors shrink-0"
                      title="Kirim pesan WhatsApp"
                      aria-label={`Chat WhatsApp ${c.name}`}
                    >
                      <MessageCircle className="size-4.5" />
                    </a>
                  )}
                </div>

                {c.address && (
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                    {c.address}
                  </p>
                )}

                <div className="pt-2.5 border-t border-border/50 text-xs sm:text-sm flex items-center justify-between">
                  <span className="text-muted-foreground">Total Transaksi:</span>
                  <span className="font-semibold text-foreground tabular-nums">
                    {c.totalOrders} nota
                  </span>
                </div>

                {c.totalPiutang > 0 && (
                  <div className="text-xs sm:text-sm flex items-center justify-between text-amber-600 font-medium">
                    <span>Sisa Piutang:</span>
                    <span className="font-bold tabular-nums">
                      Rp {c.totalPiutang.toLocaleString("id-ID")}
                    </span>
                  </div>
                )}

                <div className="pt-2.5 border-t border-border/50 flex items-center justify-between gap-2">
                  <Link
                    href={`/customers/detail?id=${c.id}`}
                    className="inline-flex min-h-10 items-center gap-1.5 px-2 -ml-2 text-xs sm:text-sm text-primary font-medium hover:underline"
                  >
                    <Eye className="size-4" />
                    <span>Lihat Riwayat</span>
                  </Link>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(c)}
                      className="size-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                      title="Ubah Data"
                      aria-label={`Ubah data ${c.name}`}
                    >
                      <Edit2 className="size-4" />
                    </button>
                    {currentUser?.role === "OWNER" && (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(c.id!)}
                        className="size-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        title="Hapus Pelanggan"
                        aria-label={`Hapus ${c.name}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View (hidden on < lg) */}
          <div className="hidden lg:block rounded-2xl bg-card border border-border shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                    <th className="py-3.5 px-4">Nama Pelanggan</th>
                    <th className="py-3.5 px-4">No. WhatsApp</th>
                    <th className="py-3.5 px-4">Alamat</th>
                    <th className="py-3.5 px-4 text-center">Transaksi</th>
                    <th className="py-3.5 px-4 text-right">Sisa Piutang</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {customers.map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-semibold text-foreground">
                        <Link
                          href={`/customers/detail?id=${c.id}`}
                          className="hover:text-primary transition-colors"
                        >
                          {c.name}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        {c.phone ? (
                          <div className="flex items-center gap-2 tabular-nums text-foreground">
                            <span>{c.phone}</span>
                            <a
                              href={`https://wa.me/${c.phone.replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-600 hover:text-emerald-700 p-1 rounded"
                              title="Chat WhatsApp"
                              aria-label={`Chat WhatsApp ${c.name}`}
                            >
                              <MessageCircle className="size-4" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground max-w-xs truncate">
                        {c.address || "-"}
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-foreground tabular-nums">
                        {c.totalOrders}
                      </td>
                      <td className="py-3.5 px-4 text-right tabular-nums">
                        {c.totalPiutang > 0 ? (
                          <span className="font-semibold text-amber-600">
                            Rp {c.totalPiutang.toLocaleString("id-ID")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Rp 0</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/customers/detail?id=${c.id}`}
                            className="size-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                            title="Rincian Nota"
                            aria-label={`Rincian ${c.name}`}
                          >
                            <Eye className="size-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(c)}
                            className="size-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                            title="Edit"
                            aria-label={`Edit ${c.name}`}
                          >
                            <Edit2 className="size-4" />
                          </button>
                          {currentUser?.role === "OWNER" && (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(c.id!)}
                              className="size-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                              title="Hapus"
                              aria-label={`Hapus ${c.name}`}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <span className="text-xs sm:text-sm text-muted-foreground">
                Halaman{" "}
                <span className="font-semibold text-foreground tabular-nums">
                  {page}
                </span>{" "}
                dari{" "}
                <span className="font-semibold text-foreground tabular-nums">
                  {totalPages}
                </span>{" "}
                (Total {totalRecords} pelanggan)
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="gap-1.5 min-h-[44px]"
                >
                  <ChevronLeft className="size-4" />
                  <span>Sebelumnya</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="gap-1.5 min-h-[44px]"
                >
                  <span>Berikutnya</span>
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Form Modal */}
      <CustomerFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialData={selectedCustomer}
        onSuccess={fetchCustomers}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-4">
            <h3 className="font-semibold text-base text-foreground">
              Hapus Data Pelanggan?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pelanggan hanya dapat dihapus bila belum memiliki riwayat nota
              transaksi di dalam sistem.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmId(null)}
                disabled={isDeleting}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={isDeleting}
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
