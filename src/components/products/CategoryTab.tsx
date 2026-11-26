"use client";

import React, { useState } from "react";
import { Plus, Edit2, Trash2, X, AlertCircle, Save, Folder } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
}

interface CategoryTabProps {
  categories: CategoryItem[];
  onRefresh: () => Promise<void>;
  isOwner: boolean;
}

export function CategoryTab({ categories, onRefresh, isOwner }: CategoryTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Hapus State
  const [deleteTarget, setDeleteTarget] = useState<CategoryItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function handleOpenAdd() {
    setSelectedCategory(null);
    setName("");
    setSlug("");
    setSortOrder(categories.length > 0 ? Math.max(...categories.map((c) => c.sortOrder)) + 1 : 0);
    setIsActive(true);
    setErrorMessage(null);
    setIsModalOpen(true);
  }

  function handleOpenEdit(cat: CategoryItem) {
    setSelectedCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setSortOrder(cat.sortOrder);
    setIsActive(cat.isActive);
    setErrorMessage(null);
    setIsModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Nama kategori wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (selectedCategory) {
        // Edit existing
        const res = await apiClient(`/api/categories/${selectedCategory.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: name.trim(),
            slug: slug.trim() || undefined,
            sortOrder,
            isActive,
          }),
        });

        if (!res.success) {
          throw new Error(res.error || "Gagal memperbarui kategori");
        }
        toast.success("Kategori berhasil diperbarui");
      } else {
        // Create new
        const res = await apiClient("/api/categories", {
          method: "POST",
          body: JSON.stringify({
            name: name.trim(),
            slug: slug.trim() || undefined,
            sortOrder,
            isActive,
          }),
        });

        if (!res.success) {
          throw new Error(res.error || "Gagal menambahkan kategori");
        }
        toast.success("Kategori baru berhasil ditambahkan");
      }

      await onRefresh();
      setIsModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await apiClient(`/api/categories/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!res.success) {
        throw new Error(res.error || "Gagal menghapus kategori");
      }

      toast.success(`Kategori "${deleteTarget.name}" berhasil dihapus`);
      await onRefresh();
      setDeleteTarget(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      setDeleteError(msg);
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-foreground">
            Daftar Kategori Produk
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Kelompokkan produk percetakan (Banner, Kaos, Merchandise, Stiker, dll.)
          </p>
        </div>

        {isOwner && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 active:scale-95 cursor-pointer"
          >
            <Plus className="size-4" />
            Tambah Kategori
          </button>
        )}
      </div>

      {/* Daftar Kategori */}
      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-12 text-center px-4">
          <Folder className="size-10 text-muted-foreground/40 mb-2" />
          <p className="text-base font-semibold text-foreground">Belum Ada Kategori</p>
          <p className="text-sm text-muted-foreground mt-1">Mulai dengan menambahkan kategori produk percetakan pertama Anda.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xs">
          <div className="divide-y divide-border">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex flex-col gap-3 p-4 sm:p-5 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Folder className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm sm:text-base font-semibold text-foreground">
                        {cat.name}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          cat.isActive
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {cat.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      Slug: <span className="font-mono text-foreground">{cat.slug}</span> &bull; Urutan: {cat.sortOrder}
                    </p>
                  </div>
                </div>

                {isOwner && (
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(cat)}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted transition-colors cursor-pointer"
                    >
                      <Edit2 className="size-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteTarget(cat);
                        setDeleteError(null);
                      }}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/10 px-3.5 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                      Hapus
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Kategori */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-xs" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">
                {selectedCategory ? "Edit Kategori" : "Tambah Kategori Baru"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex size-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                aria-label="Tutup"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              {errorMessage && (
                <div className="flex items-center gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-sm text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold text-foreground">
                  Nama Kategori <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!selectedCategory) {
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
                    }
                  }}
                  required
                  placeholder="Contoh: Digital Printing, Sablon Kaos"
                  className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold text-foreground">
                  Slug URL (Otomatis)
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="contoh: digital-printing"
                  className="h-11 w-full font-mono text-base sm:text-sm rounded-xl border border-input bg-background px-3.5 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-foreground">
                    Urutan Tampil
                  </label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                    className="h-11 w-full font-mono text-base sm:text-sm rounded-xl border border-input bg-background px-3.5 text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                </div>
                <div className="flex items-center gap-2.5 pt-6">
                  <input
                    type="checkbox"
                    id="catIsActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="size-4.5 rounded border-input text-primary focus:ring-ring"
                  />
                  <label htmlFor="catIsActive" className="text-sm font-medium text-foreground select-none">
                    Status Aktif
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="min-h-[44px] rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <Save className="size-4" />
                  {isSubmitting ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog Konfirmasi Hapus */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-xs" onClick={() => setDeleteTarget(null)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-base font-semibold text-foreground">
              Hapus Kategori?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Anda yakin ingin menghapus kategori <strong className="text-foreground">{deleteTarget.name}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>

            {deleteError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="min-h-[44px] rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="min-h-[44px] rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
