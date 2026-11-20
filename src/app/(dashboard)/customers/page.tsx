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
  Loader2,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { CustomerFormModal, type CustomerData } from "@/components/customers/CustomerFormModal";

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

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);

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

      const res = await apiClient.get<CustomersApiResponse>(`/api/customers?${params.toString()}`);
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
      if (!res.success) {
        throw new Error(res.error || "Gagal menghapus pelanggan");
      }
      setDeleteConfirmId(null);
      fetchCustomers();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setActionError(errorObj.message || "Gagal menghapus pelanggan");
    } finally {
      setIsDeleting(false);
    }
  };

  const totalPiutangSemua = customers.reduce((acc, curr) => acc + (curr.totalPiutang || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Daftar Pelanggan</h1>
          <p className="text-sm text-text-muted mt-1">
            Kelola data kontak, riwayat nota, dan pantau piutang pelanggan
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-xl shadow-xs transition-colors min-h-[44px]"
        >
          <Plus className="size-4" />
          <span>Tambah Pelanggan</span>
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Users className="size-5" />
          </div>
          <div>
            <div className="text-xs text-text-muted">Total Pelanggan Terdaftar</div>
            <div className="text-xl font-bold text-text tabular-nums">{totalRecords}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
            <Receipt className="size-5" />
          </div>
          <div>
            <div className="text-xs text-text-muted">Total Piutang di Halaman Ini</div>
            <div className="text-xl font-bold text-text tabular-nums">
              Rp {totalPiutangSemua.toLocaleString("id-ID")}
            </div>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm flex items-center gap-2">
          <AlertCircle className="size-5 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari berdasarkan nama atau no. WA..."
            className="w-full pl-10 pr-4 py-2.5 text-base sm:text-sm bg-surface border border-border rounded-xl text-text placeholder:text-text-muted/60 focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* Content: Mobile Cards + Desktop Table */}
      {isLoading ? (
        <div className="p-12 text-center text-text-muted">
          <Loader2 className="size-6 animate-spin mx-auto mb-2 text-primary" />
          <span className="text-sm">Memuat data pelanggan...</span>
        </div>
      ) : customers.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-surface border border-border">
          <Users className="size-10 mx-auto text-text-muted/40 mb-3" />
          <h3 className="text-base font-semibold text-text">Belum ada pelanggan ditemukan</h3>
          <p className="text-sm text-text-muted mt-1 max-w-md mx-auto">
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
                className="p-4 rounded-2xl bg-surface border border-border shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-text text-base">{c.name}</h3>
                    {c.phone ? (
                      <div className="flex items-center gap-1.5 text-xs text-text-muted mt-0.5">
                        <Phone className="size-3.5 text-primary" />
                        <span className="tabular-nums">{c.phone}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-text-muted italic">Tidak ada nomor</span>
                    )}
                  </div>

                  {c.phone && (
                    <a
                      href={`https://wa.me/${c.phone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors min-h-[36px]"
                    >
                      <MessageCircle className="size-3.5" />
                      <span>WA</span>
                    </a>
                  )}
                </div>

                {c.address && (
                  <p className="text-xs text-text-muted line-clamp-2">{c.address}</p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                  <div>
                    <span className="text-text-muted">Total Nota: </span>
                    <span className="font-medium text-text tabular-nums">{c.totalOrders}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Piutang: </span>
                    <span
                      className={`font-semibold tabular-nums ${
                        c.totalPiutang > 0 ? "text-amber-500" : "text-emerald-500"
                      }`}
                    >
                      Rp {c.totalPiutang.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Link
                    href={`/customers/detail?id=${c.id}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors min-h-[44px]"
                  >
                    <Eye className="size-3.5" />
                    <span>Detail</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(c)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text hover:bg-surface-muted rounded-lg transition-colors min-h-[44px]"
                  >
                    <Edit2 className="size-3.5" />
                    <span>Ubah</span>
                  </button>

                  {currentUser?.role === "OWNER" && (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(c.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 rounded-lg transition-colors min-h-[44px]"
                    >
                      <Trash2 className="size-3.5" />
                      <span>Hapus</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View (hidden on mobile) */}
          <div className="hidden lg:block bg-surface border border-border rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/40 text-text-muted text-xs">
                    <th className="py-3.5 px-4 font-medium">Nama Pelanggan</th>
                    <th className="py-3.5 px-4 font-medium">WhatsApp</th>
                    <th className="py-3.5 px-4 font-medium">Alamat</th>
                    <th className="py-3.5 px-4 font-medium text-center">Jumlah Nota</th>
                    <th className="py-3.5 px-4 font-medium text-right">Total Piutang</th>
                    <th className="py-3.5 px-4 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-surface-muted/20 transition-colors">
                      <td className="py-3 px-4 font-medium text-text">
                        <Link
                          href={`/customers/detail?id=${c.id}`}
                          className="hover:text-primary transition-colors hover:underline"
                        >
                          {c.name}
                        </Link>
                        {c.notes && (
                          <div className="text-[11px] text-text-muted line-clamp-1">{c.notes}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {c.phone ? (
                          <div className="flex items-center gap-2">
                            <span className="tabular-nums text-text">{c.phone}</span>
                            <a
                              href={`https://wa.me/${c.phone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded-md text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                              title="Chat WhatsApp"
                            >
                              <MessageCircle className="size-4" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-text-muted italic text-xs">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-text-muted max-w-xs truncate">
                        {c.address || "-"}
                      </td>
                      <td className="py-3 px-4 text-center tabular-nums text-text">
                        {c.totalOrders}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums font-medium">
                        <span
                          className={c.totalPiutang > 0 ? "text-amber-500 font-semibold" : "text-emerald-600"}
                        >
                          Rp {c.totalPiutang.toLocaleString("id-ID")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            href={`/customers/detail?id=${c.id}`}
                            className="p-2 text-text-muted hover:text-primary hover:bg-surface-muted rounded-lg transition-colors"
                            title="Lihat Detail & Riwayat Nota"
                          >
                            <Eye className="size-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(c)}
                            className="p-2 text-text-muted hover:text-text hover:bg-surface-muted rounded-lg transition-colors"
                            title="Ubah Data"
                          >
                            <Edit2 className="size-4" />
                          </button>
                          {currentUser?.role === "OWNER" && (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(c.id)}
                              className="p-2 text-danger/80 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                              title="Hapus Pelanggan"
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
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-text-muted">
                Halaman <span className="font-semibold text-text tabular-nums">{page}</span> dari{" "}
                <span className="font-semibold text-text tabular-nums">{totalPages}</span> (Total{" "}
                {totalRecords} pelanggan)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-text bg-surface border border-border rounded-xl hover:bg-surface-muted disabled:opacity-40 transition-colors min-h-[44px]"
                >
                  <ChevronLeft className="size-4" />
                  <span>Sebelumnya</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-text bg-surface border border-border rounded-xl hover:bg-surface-muted disabled:opacity-40 transition-colors min-h-[44px]"
                >
                  <span>Berikutnya</span>
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-surface border border-border rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-danger">
              <AlertCircle className="size-6" />
              <h3 className="font-semibold text-base text-text">Hapus Data Pelanggan?</h3>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              Tindakan ini tidak dapat dibatalkan. Pelanggan tidak dapat dihapus jika masih
              memiliki riwayat transaksi aktif.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-medium text-text-muted hover:text-text rounded-xl hover:bg-surface-muted transition-colors min-h-[44px]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-medium bg-danger hover:bg-danger/90 text-white rounded-xl shadow-xs transition-colors min-h-[44px] inline-flex items-center gap-1.5"
              >
                {isDeleting && <Loader2 className="size-3.5 animate-spin" />}
                <span>Hapus Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      <CustomerFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => fetchCustomers()}
        initialData={selectedCustomer}
      />
    </div>
  );
}
