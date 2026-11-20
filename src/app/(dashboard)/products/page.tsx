"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Layers,
  Scissors,
  AlertCircle,
  ImageIcon,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { ProductFormModal, type ProductFormData } from "@/components/products/ProductFormModal";
import { CategoryTab, type CategoryItem } from "@/components/products/CategoryTab";
import { FinishingTab, type FinishingItem } from "@/components/products/FinishingTab";

interface ProductItem {
  id: string;
  categoryId: string;
  categoryName: string | null;
  categorySlug: string | null;
  sku: string | null;
  name: string;
  description: string | null;
  imageUrl: string | null;
  imageKey: string | null;
  pricingType: "AREA" | "UNIT" | "CUSTOM";
  unitLabel: string;
  basePrice: number;
  minArea: number;
  areaRounding: "EXACT" | "ROUND_UP_0_5" | "ROUND_UP_1";
  isActive: boolean;
  priceTiers?: {
    id: string;
    minQty: number;
    maxQty: number | null;
    unitPrice: number;
  }[];
}

interface UserProfile {
  id: string;
  name: string;
  role: "OWNER" | "KASIR";
}

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState<"products" | "categories" | "finishings">("products");
  const [user, setUser] = useState<UserProfile | null>(null);

  // Data states
  const [productsList, setProductsList] = useState<ProductItem[]>([]);
  const [categoriesList, setCategoriesList] = useState<CategoryItem[]>([]);
  const [finishingsList, setFinishingsList] = useState<FinishingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");

  // Modal Product Form state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductFormData | null>(null);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);

  // Modal Delete Product state
  const [deleteProductTarget, setDeleteProductTarget] = useState<ProductItem | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const [deleteProductError, setDeleteProductError] = useState<string | null>(null);

  const isOwner = user?.role === "OWNER";

  // Load User & All Master Data
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setPageError(null);
    try {
      // 1. Profil pengguna
      const meRes = await apiClient<{ user: UserProfile }>("/api/auth/me");
      if (meRes.success && meRes.data?.user) {
        setUser(meRes.data.user);
      }

      // 2. Kategori
      const catRes = await apiClient<CategoryItem[]>("/api/categories");
      if (catRes.success && catRes.data) {
        setCategoriesList(catRes.data);
      }

      // 3. Finishing
      const finRes = await apiClient<FinishingItem[]>("/api/finishings");
      if (finRes.success && finRes.data) {
        setFinishingsList(finRes.data);
      }

      // 4. Produk
      const prodRes = await apiClient<ProductItem[]>("/api/products?includeInactive=true");
      if (prodRes.success && prodRes.data) {
        setProductsList(prodRes.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memuat katalog data";
      setPageError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return productsList.filter((p) => {
      // Filter kategori
      if (selectedCategoryFilter !== "ALL" && p.categoryId !== selectedCategoryFilter) {
        return false;
      }
      // Filter pencarian nama / SKU
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(query);
        const matchSku = p.sku ? p.sku.toLowerCase().includes(query) : false;
        if (!matchName && !matchSku) return false;
      }
      return true;
    });
  }, [productsList, selectedCategoryFilter, searchQuery]);

  // Handler CRUD Produk
  function handleOpenAddProduct() {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  }

  function handleOpenEditProduct(p: ProductItem) {
    setEditingProduct({
      id: p.id,
      categoryId: p.categoryId,
      name: p.name,
      sku: p.sku || "",
      description: p.description || "",
      imageUrl: p.imageUrl,
      imageKey: p.imageKey,
      pricingType: p.pricingType,
      unitLabel: p.unitLabel,
      basePrice: p.basePrice,
      minArea: p.minArea,
      areaRounding: p.areaRounding,
      isActive: p.isActive,
      tiers: p.priceTiers?.map((t) => ({
        minQty: t.minQty,
        maxQty: t.maxQty,
        unitPrice: t.unitPrice,
      })) || [],
    });
    setIsProductModalOpen(true);
  }

  async function handleProductSubmit(formData: ProductFormData) {
    setIsSubmittingProduct(true);
    try {
      if (formData.id) {
        // Edit Produk
        const res = await apiClient(`/api/products/${formData.id}`, {
          method: "PATCH",
          body: JSON.stringify(formData),
        });
        if (!res.success) {
          throw new Error(res.error || "Gagal memperbarui produk");
        }
      } else {
        // Tambah Produk
        const res = await apiClient("/api/products", {
          method: "POST",
          body: JSON.stringify(formData),
        });
        if (!res.success) {
          throw new Error(res.error || "Gagal menambahkan produk");
        }
      }

      await loadInitialData();
      setIsProductModalOpen(false);
    } finally {
      setIsSubmittingProduct(false);
    }
  }

  async function handleDeleteProductConfirm() {
    if (!deleteProductTarget) return;

    setIsDeletingProduct(true);
    setDeleteProductError(null);

    try {
      const res = await apiClient(`/api/products/${deleteProductTarget.id}`, {
        method: "DELETE",
      });

      if (!res.success) {
        throw new Error(res.error || "Gagal menghapus produk");
      }

      await loadInitialData();
      setDeleteProductTarget(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat menghapus";
      setDeleteProductError(msg);
    } finally {
      setIsDeletingProduct(false);
    }
  }

  function getPricingTypeBadge(type: "AREA" | "UNIT" | "CUSTOM") {
    switch (type) {
      case "AREA":
        return <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">Meteran (P x L)</span>;
      case "UNIT":
        return <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">Satuan / Tier</span>;
      case "CUSTOM":
        return <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">Custom</span>;
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Halaman */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50">
            Katalog Produk & Master Percetakan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola produk percetakan, harga meteran/grosir bertingkat, kategori, dan opsi finishing.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-2xs dark:border-slate-800 dark:bg-slate-900 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("products")}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "products"
                ? "bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-900"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            }`}
          >
            <Package className="size-3.5" />
            Produk ({productsList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("categories")}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "categories"
                ? "bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-900"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            }`}
          >
            <Layers className="size-3.5" />
            Kategori ({categoriesList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("finishings")}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "finishings"
                ? "bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-900"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            }`}
          >
            <Scissors className="size-3.5" />
            Finishing ({finishingsList.length})
          </button>
        </div>
      </div>

      {pageError && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-xs sm:text-sm text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
          <AlertCircle className="size-5 shrink-0" />
          <span>{pageError}</span>
        </div>
      )}

      {/* Konten Tab Aktif */}
      {activeTab === "categories" && (
        <CategoryTab
          categories={categoriesList}
          onRefresh={loadInitialData}
          isOwner={isOwner}
        />
      )}

      {activeTab === "finishings" && (
        <FinishingTab
          finishings={finishingsList}
          onRefresh={loadInitialData}
          isOwner={isOwner}
        />
      )}

      {activeTab === "products" && (
        <div className="space-y-4">
          {/* Action & Filter Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama produk atau SKU..."
                className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            {/* Tombol Tambah Produk (Hanya OWNER) */}
            {isOwner && (
              <button
                type="button"
                onClick={handleOpenAddProduct}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-95"
              >
                <Plus className="size-4" />
                Tambah Produk
              </button>
            )}
          </div>

          {/* Filter Pills Kategori */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategoryFilter("ALL")}
              className={`min-h-[34px] shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                selectedCategoryFilter === "ALL"
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              Semua Kategori
            </button>
            {categoriesList.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryFilter(cat.id)}
                className={`min-h-[34px] shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                  selectedCategoryFilter === cat.id
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Daftar Produk (Responsive: Cards on Mobile, Table on Desktop) */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-900">
              <div className="size-8 animate-spin rounded-full border-2 border-slate-900 border-t-transparent dark:border-slate-100" />
              <p className="mt-3 text-xs text-slate-500">Memuat katalog produk...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-900">
              <Package className="size-12 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {searchQuery || selectedCategoryFilter !== "ALL"
                  ? "Tidak Ada Produk yang Cocok"
                  : "Katalog Produk Masih Kosong"}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                {searchQuery || selectedCategoryFilter !== "ALL"
                  ? "Coba sesuaikan kata kunci pencarian atau ganti filter kategori."
                  : "Mulai tambahkan produk percetakan meteran atau satuan dengan foto dan harga tier."}
              </p>
            </div>
          ) : (
            <>
              {/* Tampilan Desktop (Table View) */}
              <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                      <th className="py-3 px-4 w-16">Foto</th>
                      <th className="py-3 px-4">Nama Produk & SKU</th>
                      <th className="py-3 px-4">Kategori</th>
                      <th className="py-3 px-4">Tipe & Satuan</th>
                      <th className="py-3 px-4">Harga Dasar & Tier</th>
                      <th className="py-3 px-4">Status</th>
                      {isOwner && <th className="py-3 px-4 text-right">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                    {filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        {/* Thumbnail Foto */}
                        <td className="py-3 px-4">
                          <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 flex items-center justify-center">
                            {p.imageUrl ? (
                              <Image
                                src={p.imageUrl}
                                alt={p.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <ImageIcon className="size-5 text-slate-400 dark:text-slate-600" />
                            )}
                          </div>
                        </td>

                        {/* Nama & SKU */}
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900 dark:text-slate-100">{p.name}</p>
                          {p.sku && (
                            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                              SKU: {p.sku}
                            </span>
                          )}
                        </td>

                        {/* Kategori */}
                        <td className="py-3 px-4">
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            {p.categoryName || "-"}
                          </span>
                        </td>

                        {/* Tipe & Satuan */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            {getPricingTypeBadge(p.pricingType)}
                            <span className="text-xs text-slate-500">
                              Satuan: <strong className="text-slate-700 dark:text-slate-300">{p.unitLabel}</strong>
                            </span>
                          </div>
                        </td>

                        {/* Harga Dasar & Tier */}
                        <td className="py-3 px-4">
                          <div>
                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                              Rp {p.basePrice.toLocaleString("id-ID")}
                            </span>
                            <span className="text-xs text-slate-500"> / {p.unitLabel}</span>
                          </div>
                          {p.pricingType === "UNIT" && p.priceTiers && p.priceTiers.length > 0 && (
                            <p className="mt-0.5 text-[11px] text-blue-600 dark:text-blue-400">
                              {p.priceTiers.length} tingkat harga grosir
                            </p>
                          )}
                          {p.pricingType === "AREA" && (
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              Min: {p.minArea} m² &bull; {p.areaRounding}
                            </p>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              p.isActive
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {p.isActive ? "Aktif" : "Nonaktif"}
                          </span>
                        </td>

                        {/* Aksi OWNER */}
                        {isOwner && (
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditProduct(p)}
                                className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                              >
                                <Edit2 className="size-3.5" />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteProductTarget(p);
                                  setDeleteProductError(null);
                                }}
                                className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 active:scale-95 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300"
                              >
                                <Trash2 className="size-3.5" />
                                Hapus
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tampilan Mobile (Card View) */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {filteredProducts.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-start gap-3">
                      {/* Thumbnail Foto */}
                      <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 flex items-center justify-center">
                        {p.imageUrl ? (
                          <Image
                            src={p.imageUrl}
                            alt={p.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <ImageIcon className="size-7 text-slate-400 dark:text-slate-600" />
                        )}
                      </div>

                      {/* Detail Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-slate-500 truncate">
                            {p.categoryName || "Umum"}
                          </span>
                          <span
                            className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              p.isActive
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {p.isActive ? "Aktif" : "Nonaktif"}
                          </span>
                        </div>

                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-snug mt-0.5 line-clamp-2">
                          {p.name}
                        </h3>

                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="font-mono font-bold text-base text-slate-900 dark:text-slate-50 tabular-nums">
                            Rp {p.basePrice.toLocaleString("id-ID")}
                          </span>
                          <span className="text-xs text-slate-500">/ {p.unitLabel}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-slate-800">
                      <div className="flex items-center gap-1.5">
                        {getPricingTypeBadge(p.pricingType)}
                        {p.pricingType === "UNIT" && p.priceTiers && p.priceTiers.length > 0 && (
                          <span className="text-[11px] text-blue-600 font-medium">
                            {p.priceTiers.length} tier grosir
                          </span>
                        )}
                      </div>

                      {isOwner && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditProduct(p)}
                            className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          >
                            <Edit2 className="size-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteProductTarget(p);
                              setDeleteProductError(null);
                            }}
                            className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300"
                          >
                            <Trash2 className="size-3.5" />
                            Hapus
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Modal Form Tambah/Edit Produk */}
          <ProductFormModal
            isOpen={isProductModalOpen}
            onClose={() => setIsProductModalOpen(false)}
            onSubmit={handleProductSubmit}
            initialData={editingProduct}
            categories={categoriesList}
            isSubmitting={isSubmittingProduct}
          />

          {/* Dialog Konfirmasi Hapus Produk */}
          {deleteProductTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setDeleteProductTarget(null)} />
              <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Hapus Produk?
                </h3>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Anda yakin ingin menghapus <strong>{deleteProductTarget.name}</strong>? Foto di storage akan otomatis dibersihkan.
                </p>

                {deleteProductError && (
                  <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{deleteProductError}</span>
                  </div>
                )}

                <div className="mt-5 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteProductTarget(null)}
                    disabled={isDeletingProduct}
                    className="min-h-[40px] rounded-xl border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteProductConfirm}
                    disabled={isDeletingProduct}
                    className="min-h-[40px] rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    {isDeletingProduct ? "Menghapus..." : "Ya, Hapus"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
