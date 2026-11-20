"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  Search,
  ShoppingCart,
  Trash2,
  Edit2,
  Package,
  ArrowRight,
  Calculator,
  Loader2,
  AlertCircle,
  Plus,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import {
  PosItemCalculator,
  type PosProductItem,
  type PosFinishingOption,
  type CartItem,
} from "@/components/pos/PosItemCalculator";
import { PosCheckoutModal } from "@/components/pos/PosCheckoutModal";
import { PosSuccessModal } from "@/components/pos/PosSuccessModal";

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface CurrentUser {
  id: string;
  name: string;
  role: "OWNER" | "KASIR";
}

export default function PosPage() {
  const [products, setProducts] = useState<PosProductItem[]>([]);
  const [finishings, setFinishings] = useState<PosFinishingOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const [cart, setCart] = useState<CartItem[]>([]);

  const [calcModalOpen, setCalcModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<PosProductItem | null>(null);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);

  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<{
    id: string;
    invoiceNumber: string;
    grandTotal: number;
    paidAmount: number;
    remainingAmount: number;
    changeAmount: number;
    paymentStatus: string;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      apiClient.get<{ user: CurrentUser }>("/api/auth/me"),
      apiClient.get<CategoryOption[]>("/api/categories"),
      apiClient.get<PosProductItem[]>("/api/products"),
      apiClient.get<PosFinishingOption[]>("/api/finishings"),
    ])
      .then(([meRes, catRes, prodRes, finRes]) => {
        if (meRes.success && meRes.data?.user) setCurrentUser(meRes.data.user);
        if (catRes.success && catRes.data) setCategories(catRes.data);
        if (prodRes.success && prodRes.data) setProducts(prodRes.data);
        if (finRes.success && finRes.data) setFinishings(finRes.data);
      })
      .catch((err: unknown) => {
        const errorObj = err as { message?: string };
        setError(errorObj.message || "Gagal memuat katalog kasir");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        search.trim() === "" ||
        p.name.toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    });
  }, [products, search]);

  const cartSubtotal = cart.reduce((acc, curr) => acc + curr.itemSubtotal, 0);
  const totalCartQty = cart.reduce((acc, curr) => acc + curr.quantity, 0);

  const handleOpenProduct = (p: PosProductItem) => {
    setSelectedProduct(p);
    setEditingCartItem(null);
    setCalcModalOpen(true);
  };

  const handleEditCartItem = (ci: CartItem) => {
    setSelectedProduct(ci.product);
    setEditingCartItem(ci);
    setCalcModalOpen(true);
  };

  const handleAddToCart = (item: CartItem) => {
    setCart((prev) => {
      const existsIndex = prev.findIndex((i) => i.cartItemId === item.cartItemId);
      if (existsIndex >= 0) {
        const copy = [...prev];
        copy[existsIndex] = item;
        return copy;
      }
      return [...prev, item];
    });
  };

  const handleRemoveCartItem = (cartItemId: string) => {
    setCart((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleOrderSuccess = (orderResult: {
    id: string;
    invoiceNumber: string;
    grandTotal: number;
    paidAmount: number;
    remainingAmount: number;
    changeAmount: number;
    paymentStatus: string;
  }) => {
    setCompletedOrder(orderResult);
    setCart([]);
    setSuccessModalOpen(true);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-24 lg:pb-0">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text flex items-center gap-2">
            <Calculator className="size-6 text-primary" />
            <span>Kalkulator & Kasir POS</span>
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Pilih produk percetakan, hitung dimensi & finishing, lalu simpan nota
          </p>
        </div>

        {cart.length > 0 && (
          <button
            type="button"
            onClick={handleClearCart}
            className="text-xs text-text-muted hover:text-danger self-start sm:self-auto flex items-center gap-1 min-h-[44px]"
          >
            <Trash2 className="size-3.5" />
            <span>Kosongkan Keranjang</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Catalog (Left) + Cart (Right Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Catalog Column (Left) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Search Bar & Category Filter */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari produk percetakan (Banner, Kaos, Brosur...)"
                className="w-full pl-10 pr-4 py-2.5 text-base sm:text-sm bg-surface border border-border rounded-xl text-text placeholder:text-text-muted/60 focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
            </div>

            {categories.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("ALL")}
                  className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-colors ${
                    selectedCategory === "ALL"
                      ? "bg-primary text-white"
                      : "bg-surface border border-border text-text-muted hover:text-text"
                  }`}
                >
                  Semua Kategori
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCategory(c.id)}
                    className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-colors ${
                      selectedCategory === c.id
                        ? "bg-primary text-white"
                        : "bg-surface border border-border text-text-muted hover:text-text"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Grid */}
          {isLoading ? (
            <div className="p-12 text-center text-text-muted">
              <Loader2 className="size-6 animate-spin mx-auto mb-2 text-primary" />
              <span className="text-sm">Memuat katalog produk...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-surface border border-border">
              <Package className="size-10 mx-auto text-text-muted/40 mb-3" />
              <h3 className="text-base font-semibold text-text">Produk Tidak Ditemukan</h3>
              <p className="text-xs text-text-muted mt-1">
                Silakan periksa kata kunci pencarian atau tambah produk baru di Katalog Produk.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleOpenProduct(p)}
                  className="group bg-surface border border-border hover:border-primary/50 rounded-2xl p-3 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    {/* Thumbnail Image */}
                    <div className="w-full aspect-square rounded-xl bg-surface-muted border border-border/40 overflow-hidden relative mb-2.5 flex items-center justify-center">
                      {p.imageUrl ? (
                        <Image
                          src={p.imageUrl}
                          alt={p.name}
                          fill
                          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <Package className="size-8 text-text-muted/40" />
                      )}
                      <span className="absolute top-2 left-2 px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-black/60 text-white backdrop-blur-xs">
                        {p.pricingType}
                      </span>
                    </div>

                    <h3 className="font-semibold text-xs text-text line-clamp-2 leading-snug">
                      {p.name}
                    </h3>
                  </div>

                  <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-text-muted">Mulai dari</div>
                      <div className="text-xs font-bold text-primary tabular-nums">
                        Rp {p.basePrice.toLocaleString("id-ID")}
                      </div>
                    </div>
                    <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                      <Plus className="size-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop Cart Column (Right) */}
        <div className="hidden lg:block lg:col-span-5 xl:col-span-4 bg-surface border border-border rounded-2xl shadow-xs overflow-hidden sticky top-20">
          <div className="p-4 border-b border-border bg-surface-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="size-4 text-primary" />
              <h2 className="text-sm font-bold text-text">Keranjang Nota</h2>
            </div>
            <span className="text-xs text-text-muted tabular-nums">
              {cart.length} item ({totalCartQty} pcs)
            </span>
          </div>

          {/* Cart Item List */}
          <div className="p-4 max-h-[calc(100dvh-320px)] overflow-y-auto space-y-3">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-text-muted">
                <ShoppingCart className="size-8 mx-auto text-text-muted/40 mb-2" />
                <p className="text-xs font-medium">Keranjang masih kosong</p>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Klik produk di samping untuk menghitung harga & finishing
                </p>
              </div>
            ) : (
              cart.map((ci) => (
                <div
                  key={ci.cartItemId}
                  className="p-3 rounded-xl bg-surface-muted/30 border border-border/70 space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-semibold text-text">{ci.product.name}</span>
                      <div className="text-[11px] text-text-muted mt-0.5">
                        {ci.product.pricingType === "AREA" && (
                          <span>
                            {ci.width} × {ci.height} {ci.unit} ({ci.billedAreaM2} m²) •{" "}
                          </span>
                        )}
                        <span>
                          {ci.quantity} {ci.product.unitLabel} @ Rp{" "}
                          {ci.unitPrice.toLocaleString("id-ID")}
                        </span>
                        {ci.isPriceOverridden && (
                          <span className="ml-1 text-amber-500 font-semibold">(Override)</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEditCartItem(ci)}
                        className="p-1 text-text-muted hover:text-text rounded-md hover:bg-surface"
                        title="Ubah"
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveCartItem(ci.cartItemId)}
                        className="p-1 text-text-muted hover:text-danger rounded-md hover:bg-surface"
                        title="Hapus"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Finishing Tags */}
                  {ci.finishings.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1 border-t border-border/50 text-[10px]">
                      {ci.finishings.map((f) => (
                        <span
                          key={f.finishingId}
                          className="px-1.5 py-0.5 rounded bg-surface border border-border/80 text-text-muted"
                        >
                          {f.name} (Rp {f.subtotal.toLocaleString("id-ID")})
                        </span>
                      ))}
                    </div>
                  )}

                  {ci.itemNotes && (
                    <div className="text-[10px] text-text-muted italic bg-surface/50 p-1.5 rounded">
                      {ci.itemNotes}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-border/50 font-medium">
                    <span className="text-text-muted">Subtotal Item:</span>
                    <span className="font-bold text-text tabular-nums">
                      Rp {ci.itemSubtotal.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Footer */}
          {cart.length > 0 && (
            <div className="p-4 border-t border-border bg-surface-muted/30 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-muted font-medium">Estimasi Subtotal:</span>
                <span className="font-bold text-primary text-base tabular-nums">
                  Rp {cartSubtotal.toLocaleString("id-ID")}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setCheckoutModalOpen(true)}
                className="w-full inline-flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl shadow-xs transition-colors min-h-[44px]"
              >
                <span>Proses Checkout Nota</span>
                <ArrowRight className="size-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Bar (Mobile Only) */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-16 left-0 right-0 p-3 bg-surface border-t border-border shadow-lg flex items-center justify-between z-30">
          <div>
            <div className="text-[11px] text-text-muted">
              {cart.length} item ({totalCartQty} pcs)
            </div>
            <div className="text-base font-bold text-primary tabular-nums">
              Rp {cartSubtotal.toLocaleString("id-ID")}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCheckoutModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl shadow-xs min-h-[44px]"
          >
            <span>Checkout</span>
            <ArrowRight className="size-4" />
          </button>
        </div>
      )}

      {/* Modals */}
      <PosItemCalculator
        isOpen={calcModalOpen}
        onClose={() => setCalcModalOpen(false)}
        product={selectedProduct}
        availableFinishings={finishings}
        onAddToCart={handleAddToCart}
        userRole={currentUser?.role}
        initialCartItem={editingCartItem}
      />

      <PosCheckoutModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        cartItems={cart}
        userRole={currentUser?.role}
        onSuccess={handleOrderSuccess}
      />

      <PosSuccessModal
        isOpen={successModalOpen}
        onNewTransaction={() => setSuccessModalOpen(false)}
        orderData={completedOrder}
      />
    </div>
  );
}
