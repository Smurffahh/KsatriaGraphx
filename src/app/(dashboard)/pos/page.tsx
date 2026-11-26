"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search,
  ShoppingCart,
  Trash2,
  Edit2,
  Package,
  ArrowRight,
  Calculator,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PageLoadingBanner } from "@/components/ui/page-loading-banner";
import { m, AnimatePresence } from "motion/react";
import { EASE_SMOOTH, EASE_EXIT } from "@/lib/motion";
import {
  consumePendingCartItems,
  subscribePosAppendItem,
} from "@/lib/pos/cart-bridge";

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface PosCatalogItem extends PosProductItem {
  categoryId?: string | null;
  description?: string | null;
  isActive?: boolean;
}

interface CurrentUser {
  id: string;
  name: string;
  role: "OWNER" | "KASIR";
}

function PosCatalogSkeleton() {
  return (
    <div className="space-y-4">
      <PageLoadingBanner message="Memuat katalog kasir POS..." />
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border bg-card p-3 shadow-xs space-y-3"
        >
          <Skeleton className="w-full aspect-square rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-3/4 rounded-md" />
            <Skeleton className="h-3 w-1/2 rounded-md" />
          </div>
          <div className="pt-2 border-t border-border/50 flex items-center justify-between">
            <Skeleton className="h-5 w-20 rounded-md" />
            <Skeleton className="size-7 rounded-lg" />
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}

export default function PosPage() {
  const queryClient = useQueryClient();
  const [products, setProducts] = useState<PosCatalogItem[]>([]);
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
      apiClient.get<PosCatalogItem[]>("/api/products"),
      apiClient.get<PosFinishingOption[]>("/api/finishings"),
    ])
      .then(([meRes, catRes, prodRes, finRes]) => {
        if (meRes.success && meRes.data?.user) setCurrentUser(meRes.data.user);
        if (catRes.success && catRes.data) setCategories(catRes.data);
        if (prodRes.success && prodRes.data) setProducts(prodRes.data);
        if (finRes.success && finRes.data) setFinishings(finRes.data);
      })
      .catch((err) => {
        console.error("Gagal memuat data master POS:", err);
        setError("Gagal memuat data produk & kalkulator. Silakan muat ulang.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    // 1. Konsumsi antrean item dari QuickCalculator jika baru navigasi dari halaman lain
    const pendingItems = consumePendingCartItems();
    if (pendingItems.length > 0) {
      setCart((prev) => [...prev, ...pendingItems]);
      toast.success(
        pendingItems.length === 1
          ? `${pendingItems[0].product.name} ditambahkan ke keranjang POS`
          : `${pendingItems.length} item ditambahkan ke keranjang POS`
      );
    }

    // 2. Berlangganan event jika kasir berada di /pos dan mengirim item dari QuickCalculator
    const unsubscribe = subscribePosAppendItem((newItem) => {
      setCart((prev) => [...prev, newItem]);
      toast.success(`${newItem.product.name} ditambahkan ke keranjang POS`);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat =
        selectedCategory === "ALL" || p.categoryId === selectedCategory;
      const matchSearch =
        !search.trim() ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
      return matchCat && matchSearch && p.isActive;
    });
  }, [products, selectedCategory, search]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.itemSubtotal, 0);
  }, [cart]);

  const totalCartQty = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  const handleOpenProduct = (p: PosProductItem) => {
    setSelectedProduct(p);
    setEditingCartItem(null);
    setCalcModalOpen(true);
  };

  const handleEditCartItem = (item: CartItem) => {
    setSelectedProduct(item.product);
    setEditingCartItem(item);
    setCalcModalOpen(true);
  };

  const handleAddToCart = (item: CartItem) => {
    if (editingCartItem) {
      setCart((prev) =>
        prev.map((c) => (c.cartItemId === item.cartItemId ? item : c))
      );
      toast.success("Item berhasil diperbarui");
    } else {
      setCart((prev) => [...prev, item]);
      toast.success("Produk ditambahkan ke keranjang");
    }
    setCalcModalOpen(false);
    setEditingCartItem(null);
  };

  const handleRemoveCartItem = (cartItemId: string) => {
    setCart((prev) => prev.filter((c) => c.cartItemId !== cartItemId));
    toast.info("Item dihapus dari keranjang");
  };

  const handleClearCart = () => {
    if (window.confirm("Kosongkan semua item di keranjang?")) {
      setCart([]);
      toast.info("Keranjang telah dikosongkan");
    }
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
    setCheckoutModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["reports"] });
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    setCompletedOrder(orderResult);
    setCart([]);
    setSuccessModalOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-foreground flex items-center gap-2.5">
            <Calculator className="size-6 sm:size-7 text-primary shrink-0" />
            <span>Kalkulator &amp; Kasir POS</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pilih produk percetakan, hitung dimensi &amp; finishing, lalu simpan nota
          </p>
        </div>

        {cart.length > 0 && (
          <button
            type="button"
            onClick={handleClearCart}
            className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-destructive self-start sm:self-auto flex items-center gap-1.5 min-h-[44px] px-2 cursor-pointer"
          >
            <Trash2 className="size-4" />
            <span>Kosongkan Keranjang</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2.5">
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
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari produk percetakan (Banner, Kaos, Brosur...)"
                className="h-11 w-full pl-10 pr-4 text-base sm:text-sm bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
            </div>

            {categories.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("ALL")}
                  className={`min-h-10 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium shrink-0 transition-colors cursor-pointer ${
                    selectedCategory === "ALL"
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "bg-card border border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Semua Kategori
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCategory(c.id)}
                    className={`min-h-10 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium shrink-0 transition-colors cursor-pointer ${
                      selectedCategory === c.id
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "bg-card border border-border text-muted-foreground hover:text-foreground"
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
            <PosCatalogSkeleton />
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-card border border-border">
              <Package className="size-10 mx-auto text-muted-foreground/40 mb-3" />
              <h3 className="text-base font-semibold text-foreground">
                Produk Tidak Ditemukan
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Silakan periksa kata kunci pencarian atau tambah produk baru di Katalog Produk.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
              {filteredProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleOpenProduct(p)}
                  className="group bg-card border border-border hover:border-primary/50 rounded-2xl p-3.5 shadow-xs hover:shadow-md motion-safe:hover:-translate-y-0.5 active:scale-[0.98] transition-[transform,border-color,box-shadow] duration-150 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    {/* Thumbnail Image */}
                    <div className="w-full aspect-square rounded-xl bg-muted outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10 overflow-hidden relative mb-3 flex items-center justify-center">
                      {p.imageUrl ? (
                        <Image
                          src={p.imageUrl}
                          alt={p.name}
                          fill
                          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <Package className="size-8 text-muted-foreground/40" />
                      )}
                      <span className="absolute top-2 left-2 px-2 py-0.5 text-xs font-semibold rounded-md bg-black/65 text-white backdrop-blur-xs">
                        {p.pricingType}
                      </span>
                    </div>

                    <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-snug">
                      {p.name}
                    </h3>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">Mulai dari</div>
                      <div className="text-sm sm:text-base font-bold text-primary tabular-nums truncate">
                        Rp {p.basePrice.toLocaleString("id-ID")}
                      </div>
                    </div>
                    <div className="size-9 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Plus className="size-4.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop Cart Column (Right) */}
        <div className="hidden lg:block lg:col-span-5 xl:col-span-4 bg-card border border-border rounded-2xl shadow-xs overflow-hidden sticky top-20">
          <div className="p-4 sm:p-5 border-b border-border bg-muted/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="size-4.5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Keranjang Nota</h2>
            </div>
            <m.span
              key={cart.length}
              initial={{ scale: 1.15 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2 }}
              className="text-xs sm:text-sm text-muted-foreground tabular-nums inline-block"
            >
              {cart.length} item ({totalCartQty} pcs)
            </m.span>
          </div>

          {/* Cart Item List */}
          <div className="p-4 sm:p-5 max-h-[calc(100dvh-340px)] overflow-y-auto space-y-3">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <ShoppingCart className="size-9 mx-auto text-muted-foreground/40 mb-2.5" />
                <p className="text-sm font-medium text-foreground">Keranjang masih kosong</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Klik produk di samping untuk menghitung harga &amp; finishing
                </p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {cart.map((ci) => (
                  <m.div
                    key={ci.cartItemId}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, x: 20, transition: { duration: 0.15, ease: EASE_EXIT } }}
                    transition={{ duration: 0.2, ease: EASE_SMOOTH }}
                    className="p-3.5 rounded-xl bg-muted/30 border border-border/70 space-y-2.5 text-sm"
                  >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-semibold text-foreground leading-snug block">{ci.product.name}</span>
                      <div className="text-xs text-muted-foreground mt-1">
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

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEditCartItem(ci)}
                        className="size-9 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-lg hover:bg-card transition-colors"
                        title="Ubah"
                        aria-label="Ubah item"
                      >
                        <Edit2 className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveCartItem(ci.cartItemId)}
                        className="size-9 flex items-center justify-center text-muted-foreground hover:text-destructive rounded-lg hover:bg-card transition-colors"
                        title="Hapus"
                        aria-label="Hapus item"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>

                  {/* Finishing Tags */}
                  {ci.finishings.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/50 text-xs">
                      {ci.finishings.map((f) => (
                        <span
                          key={f.finishingId}
                          className="px-2 py-0.5 rounded-md bg-card border border-border/80 text-muted-foreground"
                        >
                          {f.name} (Rp {f.subtotal.toLocaleString("id-ID")})
                        </span>
                      ))}
                    </div>
                  )}

                  {ci.itemNotes && (
                    <div className="text-xs text-muted-foreground italic bg-muted/40 p-2 rounded-lg">
                      {ci.itemNotes}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-border/50 font-medium text-sm">
                    <span className="text-muted-foreground">Subtotal Item:</span>
                    <span className="font-bold text-foreground tabular-nums">
                      Rp {ci.itemSubtotal.toLocaleString("id-ID")}
                    </span>
                  </div>
                </m.div>
              ))}
            </AnimatePresence>
          )}
        </div>

          {/* Cart Footer */}
          {cart.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-border bg-muted/40 space-y-3.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-medium">Estimasi Subtotal:</span>
                <span className="font-bold text-primary text-lg tabular-nums">
                  Rp {cartSubtotal.toLocaleString("id-ID")}
                </span>
              </div>

              <Button
                type="button"
                size="lg"
                onClick={() => setCheckoutModalOpen(true)}
                className="w-full gap-2 font-semibold"
              >
                <span>Proses Checkout Nota</span>
                <ArrowRight className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Bar (Mobile Only) */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-16 left-0 right-0 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-card/95 backdrop-blur-md border-t border-border shadow-lg flex items-center justify-between gap-3 z-30">
          <div>
            <div className="text-xs text-muted-foreground">
              {cart.length} item ({totalCartQty} pcs)
            </div>
            <div className="text-lg font-bold text-primary tabular-nums">
              Rp {cartSubtotal.toLocaleString("id-ID")}
            </div>
          </div>

          <Button
            type="button"
            size="lg"
            onClick={() => setCheckoutModalOpen(true)}
            className="gap-2 px-5 font-semibold shrink-0"
          >
            <span>Checkout</span>
            <ArrowRight className="size-4" />
          </Button>
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
