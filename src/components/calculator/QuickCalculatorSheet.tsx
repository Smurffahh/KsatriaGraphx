"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Calculator,
  Copy,
  RotateCcw,
  ShoppingCart,
  Layers,
  Check,
  Plus,
  Minus,
  Sparkles,
  Package,
  ChevronDown,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api/client";
import {
  QuickCatalogPicker,
  resolveProductImageUrl,
  type CatalogPickerCategory,
} from "@/components/calculator/QuickCatalogPicker";
import {
  calculateOrderItem,
  type PricingType,
  type AreaDimensionUnit,
  type AreaRounding,
  type PriceTier,
  type FinishingItemCalculation,
  type CalculateItemResult,
} from "@/lib/calculator/pricing";
import {
  formatSingleEstimateText,
  formatComparisonEstimateText,
  formatRupiah,
} from "@/lib/calculator/estimate-text";
import { queueCartItemForPos } from "@/lib/pos/cart-bridge";
import type { CartItem } from "@/components/pos/PosItemCalculator";

export interface QuickCalcProduct {
  id: string;
  name: string;
  sku?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  imageKey?: string | null;
  pricingType: PricingType;
  unitLabel: string;
  basePrice: number;
  minArea?: string | number | null;
  areaRounding: AreaRounding;
  tiers?: PriceTier[];
  priceTiers?: PriceTier[];
  isActive: boolean;
}

export interface QuickCalcFinishing {
  id: string;
  name: string;
  chargeType: "FLAT" | "PER_QTY" | "PER_AREA";
  defaultPrice: number;
  unitLabel: string;
  isActive: boolean;
}

interface QuickCalculatorSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickCalculatorSheet({
  isOpen,
  onClose,
}: QuickCalculatorSheetProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const {
    data: products = [],
    isLoading: isLoadingProducts,
    isError: isErrorProducts,
    refetch: refetchProducts,
  } = useQuery<QuickCalcProduct[]>({
    queryKey: ["products", "active"],
    queryFn: async () => {
      const res = await apiClient<QuickCalcProduct[]>("/api/products?includeInactive=false");
      return (res.data || []).filter((p) => p.isActive);
    },
    staleTime: 60 * 1000,
  });

  const { data: categories = [] } = useQuery<CatalogPickerCategory[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await apiClient<CatalogPickerCategory[]>("/api/categories");
      return res.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: finishings = [],
    isLoading: isLoadingFinishings,
  } = useQuery<QuickCalcFinishing[]>({
    queryKey: ["quick-calc-finishings"],
    queryFn: async () => {
      const res = await apiClient<QuickCalcFinishing[]>("/api/finishings");
      return (res.data || []).filter((f) => f.isActive);
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: storeInfo } = useQuery<{ storeName: string }>({
    queryKey: ["quick-calc-settings"],
    queryFn: async () => {
      const res = await apiClient<{ storeName: string }>("/api/settings/public");
      return res.data || { storeName: "Ksatria Graphx" };
    },
    staleTime: 10 * 60 * 1000,
  });

  const [productAId, setProductAId] = useState<string>("");
  const [productBId, setProductBId] = useState<string>("");
  const [isPickerAOpen, setIsPickerAOpen] = useState(false);
  const [isPickerBOpen, setIsPickerBOpen] = useState(false);
  const [isComparisonMode, setIsComparisonMode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      refetchProducts();
    }
  }, [isOpen, refetchProducts]);

  const [width, setWidth] = useState<number | "">(2);
  const [height, setHeight] = useState<number | "">(1);
  const [dimensionUnit, setDimensionUnit] = useState<AreaDimensionUnit>("m");
  const [quantity, setQuantity] = useState<number>(1);

  const [selectedFinishingIds, setSelectedFinishingIds] = useState<string[]>([]);

  useEffect(() => {
    if (products.length > 0 && !productAId) {
      setProductAId(products[0].id);
    }
  }, [products, productAId]);

  const productA = useMemo(() => {
    return products.find((p) => p.id === productAId) || products[0] || null;
  }, [products, productAId]);

  const availableProductsB = useMemo(() => {
    if (!productA) return [];
    return products.filter(
      (p) => p.pricingType === productA.pricingType && p.id !== productA.id
    );
  }, [products, productA]);

  useEffect(() => {
    if (isComparisonMode && availableProductsB.length > 0) {
      if (!productBId || !availableProductsB.some((p) => p.id === productBId)) {
        setProductBId(availableProductsB[0].id);
      }
    }
  }, [isComparisonMode, availableProductsB, productBId]);

  const productB = useMemo(() => {
    if (!isComparisonMode) return null;
    return availableProductsB.find((p) => p.id === productBId) || null;
  }, [isComparisonMode, availableProductsB, productBId]);

  const handleToggleFinishing = (finishingId: string) => {
    setSelectedFinishingIds((prev) =>
      prev.includes(finishingId)
        ? prev.filter((id) => id !== finishingId)
        : [...prev, finishingId]
    );
  };

  const handleApplyPreset = (w: number, h: number) => {
    setWidth(w);
    setHeight(h);
    setDimensionUnit("m");
  };

  const handleReset = () => {
    setWidth(2);
    setHeight(1);
    setDimensionUnit("m");
    setQuantity(1);
    setSelectedFinishingIds([]);
    setIsComparisonMode(false);
    toast.info("Input kalkulator telah direset ke default.");
  };

  const calcFinishingInputs = useMemo<FinishingItemCalculation[]>(() => {
    return selectedFinishingIds
      .map((id) => {
        const f = finishings.find((item) => item.id === id);
        if (!f) return null;
        return {
          finishingId: f.id,
          name: f.name,
          chargeType: f.chargeType,
          unitPrice: f.defaultPrice,
          quantity: 1,
        };
      })
      .filter(Boolean) as FinishingItemCalculation[];
  }, [selectedFinishingIds, finishings]);

  const calcResultA = useMemo<CalculateItemResult | null>(() => {
    if (!productA) return null;
    const safeQty = Math.max(1, Number(quantity) || 1);
    return calculateOrderItem({
      pricingType: productA.pricingType,
      quantity: safeQty,
      basePrice: productA.basePrice,
      priceTiers: productA.tiers,
      width: productA.pricingType === "AREA" ? Number(width) || 0 : undefined,
      height: productA.pricingType === "AREA" ? Number(height) || 0 : undefined,
      unit: dimensionUnit,
      minArea: productA.minArea,
      areaRounding: productA.areaRounding,
      finishings: calcFinishingInputs,
    });
  }, [productA, quantity, width, height, dimensionUnit, calcFinishingInputs]);

  const calcResultB = useMemo<CalculateItemResult | null>(() => {
    if (!productB || !isComparisonMode) return null;
    const safeQty = Math.max(1, Number(quantity) || 1);
    return calculateOrderItem({
      pricingType: productB.pricingType,
      quantity: safeQty,
      basePrice: productB.basePrice,
      priceTiers: productB.tiers,
      width: productB.pricingType === "AREA" ? Number(width) || 0 : undefined,
      height: productB.pricingType === "AREA" ? Number(height) || 0 : undefined,
      unit: dimensionUnit,
      minArea: productB.minArea,
      areaRounding: productB.areaRounding,
      finishings: calcFinishingInputs,
    });
  }, [productB, isComparisonMode, quantity, width, height, dimensionUnit, calcFinishingInputs]);

  const handleCopyEstimate = async () => {
    if (!productA || !calcResultA) return;

    let text = "";
    const storeName = storeInfo?.storeName || "Ksatria Graphx";

    if (isComparisonMode && productB && calcResultB) {
      const finishingsSummary = calcResultA.finishings.map(
        (f) => `${f.name} (${formatRupiah(f.subtotal)})`
      );
      text = formatComparisonEstimateText({
        storeName,
        pricingType: productA.pricingType,
        quantity: Math.max(1, Number(quantity) || 1),
        unitLabel: productA.unitLabel,
        width: productA.pricingType === "AREA" ? Number(width) || 0 : undefined,
        height: productA.pricingType === "AREA" ? Number(height) || 0 : undefined,
        dimensionUnit,
        finishingsSummary,
        productA: {
          name: productA.name,
          unitPrice: calcResultA.effectiveUnitPrice,
          baseSubtotal: calcResultA.baseSubtotal,
          finishingTotal: calcResultA.finishingTotal,
          grandTotal: calcResultA.itemSubtotal,
          billedAreaM2: calcResultA.billedAreaM2,
          isMinAreaApplied: calcResultA.isMinAreaApplied,
          minArea: productA.minArea,
        },
        productB: {
          name: productB.name,
          unitPrice: calcResultB.effectiveUnitPrice,
          baseSubtotal: calcResultB.baseSubtotal,
          finishingTotal: calcResultB.finishingTotal,
          grandTotal: calcResultB.itemSubtotal,
          billedAreaM2: calcResultB.billedAreaM2,
          isMinAreaApplied: calcResultB.isMinAreaApplied,
          minArea: productB.minArea,
        },
      });
    } else {
      text = formatSingleEstimateText({
        storeName,
        productName: productA.name,
        pricingType: productA.pricingType,
        quantity: Math.max(1, Number(quantity) || 1),
        unitLabel: productA.unitLabel,
        width: productA.pricingType === "AREA" ? Number(width) || 0 : undefined,
        height: productA.pricingType === "AREA" ? Number(height) || 0 : undefined,
        dimensionUnit,
        billedAreaM2: calcResultA.billedAreaM2,
        isMinAreaApplied: calcResultA.isMinAreaApplied,
        minArea: productA.minArea,
        effectiveUnitPrice: calcResultA.effectiveUnitPrice,
        baseSubtotal: calcResultA.baseSubtotal,
        finishings: calcResultA.finishings,
        finishingTotal: calcResultA.finishingTotal,
        grandTotal: calcResultA.itemSubtotal,
      });
    }

    let success = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        success = true;
      }
    } catch {
      // Fallback for WebView contexts lacking navigator.clipboard
    }

    if (!success) {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        success = document.execCommand("copy");
        document.body.removeChild(textArea);
      } catch {
        success = false;
      }
    }

    if (success) {
      toast.success("Estimasi harga siap ditempel ke WhatsApp", {
        description: "Format teks rapi berhasil disalin ke papan klip.",
      });
    } else {
      toast.error("Gagal menyalin teks ke papan klip.");
    }
  };

  const handleHandoffToPos = (
    targetProduct: QuickCalcProduct,
    calcResult: CalculateItemResult
  ) => {
    const safeQty = Math.max(1, Number(quantity) || 1);

    const cartItem: CartItem = {
      cartItemId: `calc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      product: {
        id: targetProduct.id,
        name: targetProduct.name,
        imageUrl: targetProduct.imageUrl,
        pricingType: targetProduct.pricingType,
        unitLabel: targetProduct.unitLabel || "pcs",
        basePrice: targetProduct.basePrice,
        minArea: targetProduct.minArea,
        areaRounding: targetProduct.areaRounding || "EXACT",
        tiers: targetProduct.tiers,
      },
      quantity: safeQty,
      width: targetProduct.pricingType === "AREA" ? Number(width) || 1 : undefined,
      height: targetProduct.pricingType === "AREA" ? Number(height) || 1 : undefined,
      unit: targetProduct.pricingType === "AREA" ? dimensionUnit : undefined,
      billedAreaM2: calcResult.billedAreaM2,
      unitPrice: calcResult.effectiveUnitPrice,
      isPriceOverridden: false,
      itemNotes: isComparisonMode
        ? `Dipilih dari perbandingan kalkulator cepat`
        : undefined,
      finishings: calcResult.finishings.map((f) => ({
        finishingId: f.finishingId || "",
        name: f.name,
        chargeType: f.chargeType,
        unitPrice: f.unitPrice,
        quantity: f.quantity,
        subtotal: f.subtotal,
      })),
      finishingTotal: calcResult.finishingTotal,
      itemSubtotal: calcResult.itemSubtotal,
    };

    queueCartItemForPos(cartItem);
    onClose();

    if (pathname !== "/pos") {
      router.push("/pos");
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={`${
          isMobile
            ? "max-h-[92dvh] rounded-t-2xl p-4 sm:p-6"
            : "sm:max-w-xl p-6"
        } flex flex-col gap-0 overflow-hidden bg-card text-card-foreground border-border`}
      >
        {/* Header Panel */}
        <SheetHeader className="pb-4 border-b border-border space-y-1 text-left shrink-0 pr-9 sm:pr-10">
          <div className="flex items-center justify-between gap-3 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <Calculator className="size-5" />
              </div>
              <div className="min-w-0">
                <SheetTitle className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                  <span className="truncate">Kalkulator Cepat & Perbandingan</span>
                  <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 shrink-0">
                    Instan
                  </Badge>
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground truncate">
                  Cek harga percetakan, bandingkan 2 bahan, dan salin ke WhatsApp
                </SheetDescription>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
              title="Reset Input"
            >
              <RotateCcw className="size-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
          </div>
        </SheetHeader>

        {/* Isi Scrollable */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 scrollbar-thin">
          {isLoadingProducts ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : isErrorProducts || products.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/40 p-6 text-center space-y-3">
              <p className="text-sm font-semibold text-foreground">
                Data produk belum tersedia
              </p>
              <p className="text-xs text-muted-foreground">
                Pastikan terdapat produk aktif pada Katalog Produk.
              </p>
              <Button size="sm" variant="outline" onClick={() => refetchProducts()}>
                Coba Lagi
              </Button>
            </div>
          ) : (
            <>
              {/* Seksi 1: Pemilihan Bahan Utama (Opsi A) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Bahan Utama (Opsi A) <span className="text-destructive">*</span>
                  </label>
                  {productA && (
                    <Badge variant="secondary" className="font-mono text-[10px] py-0">
                      {productA.pricingType === "AREA" ? "Meteran (m²)" : "Satuan (pcs)"}
                    </Badge>
                  )}
                </div>

                {isPickerAOpen || !productA ? (
                  <QuickCatalogPicker
                    products={products}
                    categories={categories}
                    selectedProductId={productA?.id || ""}
                    onSelectProduct={(p) => {
                      setProductAId(p.id);
                      setIsPickerAOpen(false);
                    }}
                    title="Katalog Bahan Utama (Opsi A)"
                    onClose={productA ? () => setIsPickerAOpen(false) : undefined}
                  />
                ) : (
                  <div className="group relative flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-2xs hover:border-primary/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-border/80 bg-muted/60">
                        {resolveProductImageUrl(productA.imageUrl) ? (
                          <Image
                            src={resolveProductImageUrl(productA.imageUrl)!}
                            alt={productA.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground/60">
                            <Package className="size-6" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-semibold text-foreground truncate" title={productA.name}>
                            {productA.name}
                          </p>
                          {productA.categoryName && (
                            <span className="text-[10px] font-medium text-muted-foreground">
                              • {productA.categoryName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-xs font-bold text-primary tabular-nums">
                            {formatRupiah(productA.basePrice)}
                            <span className="text-[11px] font-normal text-muted-foreground">
                              {productA.pricingType === "AREA" ? "/m²" : `/${productA.unitLabel || "pcs"}`}
                            </span>
                          </span>
                          {(productA.tiers?.length || 0) > 0 && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                              Grosir
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsPickerAOpen(true)}
                      className="h-8 shrink-0 text-xs gap-1 border-primary/30 hover:bg-primary/5 hover:text-primary"
                    >
                      <span>Ganti</span>
                      <ChevronDown className="size-3.5 opacity-70" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Seksi 2: Toggle Bandingkan 2 Bahan */}
              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-3.5">
                <div className="flex items-center gap-2.5">
                  <Layers className="size-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-foreground">Bandingkan 2 Bahan</p>
                    <p className="text-[11px] text-muted-foreground">
                      Bandingkan bahan alternatif dengan ukuran & finishing sama
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isComparisonMode}
                  onCheckedChange={setIsComparisonMode}
                  disabled={availableProductsB.length === 0}
                />
              </div>

              {/* Seksi 3: Pemilihan Bahan Pembanding (Opsi B) jika Toggle Aktif */}
              {isComparisonMode && (
                <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-primary uppercase tracking-wider">
                      Bahan Pembanding (Opsi B)
                    </label>
                    <span className="text-[10px] lowercase font-normal text-muted-foreground">
                      tipe {productA?.pricingType === "AREA" ? "meteran (m²)" : "satuan (pcs)"}
                    </span>
                  </div>

                  {availableProductsB.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      Tidak ada produk lain dengan tipe perhitungan yang sama untuk dibandingkan.
                    </p>
                  ) : isPickerBOpen || !productB ? (
                    <QuickCatalogPicker
                      products={products}
                      categories={categories}
                      selectedProductId={productB?.id || ""}
                      allowedPricingType={productA?.pricingType}
                      excludeProductId={productA?.id}
                      onSelectProduct={(p) => {
                        setProductBId(p.id);
                        setIsPickerBOpen(false);
                      }}
                      title="Katalog Bahan Pembanding (Opsi B)"
                      onClose={productB ? () => setIsPickerBOpen(false) : undefined}
                    />
                  ) : (
                    <div className="group relative flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-background p-3 shadow-2xs hover:border-primary transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-border/80 bg-muted/60">
                          {resolveProductImageUrl(productB.imageUrl) ? (
                            <Image
                              src={resolveProductImageUrl(productB.imageUrl)!}
                              alt={productB.name}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground/60">
                              <Package className="size-6" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-semibold text-foreground truncate" title={productB.name}>
                              {productB.name}
                            </p>
                            {productB.categoryName && (
                              <span className="text-[10px] font-medium text-muted-foreground">
                                • {productB.categoryName}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-xs font-bold text-primary tabular-nums">
                              {formatRupiah(productB.basePrice)}
                              <span className="text-[11px] font-normal text-muted-foreground">
                                {productB.pricingType === "AREA" ? "/m²" : `/${productB.unitLabel || "pcs"}`}
                              </span>
                            </span>
                            {(productB.tiers?.length || 0) > 0 && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                                Grosir
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsPickerBOpen(true)}
                        className="h-8 shrink-0 text-xs gap-1 border-primary/30 hover:bg-primary/5 hover:text-primary"
                      >
                        <span>Ganti</span>
                        <ChevronDown className="size-3.5 opacity-70" />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Seksi 4: Input Dimensi (jika AREA) atau Qty (jika UNIT) */}
              {productA && productA.pricingType === "AREA" ? (
                <div className="space-y-3 rounded-xl border border-border bg-card p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      Dimensi Cetak (Ukuran)
                    </span>
                    <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/60">
                      <button
                        type="button"
                        onClick={() => setDimensionUnit("m")}
                        className={`rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                          dimensionUnit === "m"
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Meter (m)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDimensionUnit("cm")}
                        className={`rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                          dimensionUnit === "cm"
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Centimeter (cm)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">
                        Panjang ({dimensionUnit})
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={width}
                        onChange={(e) => setWidth(e.target.value === "" ? "" : parseFloat(e.target.value))}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-base sm:text-sm font-mono font-medium text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                        placeholder="Contoh: 3"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">
                        Lebar ({dimensionUnit})
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={height}
                        onChange={(e) => setHeight(e.target.value === "" ? "" : parseFloat(e.target.value))}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-base sm:text-sm font-mono font-medium text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                        placeholder="Contoh: 1"
                      />
                    </div>
                  </div>

                  {/* Preset Cepat Ukuran Populer */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Preset Ukuran Populer:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: "1 × 1 m", w: 1, h: 1 },
                        { label: "2 × 1 m", w: 2, h: 1 },
                        { label: "3 × 1 m", w: 3, h: 1 },
                        { label: "4 × 1 m", w: 4, h: 1 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => handleApplyPreset(preset.w, preset.h)}
                          className="rounded-lg border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted hover:border-primary/40 active:scale-95 transition-colors"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Jumlah Pcs */}
                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Jumlah Cetak (Pcs)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted active:scale-95 transition-colors"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="w-10 text-center font-mono text-sm font-bold text-foreground">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => q + 1)}
                        className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted active:scale-95 transition-colors"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Informasi Luas & Minimum */}
                  {calcResultA?.billedAreaM2 !== undefined && (
                    <div className="rounded-lg bg-muted/50 p-2.5 text-xs text-muted-foreground flex items-center justify-between">
                      <span>Total Luas Tertagih:</span>
                      <span className="font-mono font-bold text-foreground tabular-nums">
                        {calcResultA.billedAreaM2} m²
                        {calcResultA.isMinAreaApplied && (
                          <span className="ml-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                            (Min. {productA.minArea} m²)
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                /* Jika UNIT (Kaos, Mug, Stiker per Lembar, dll.) */
                <div className="space-y-3 rounded-xl border border-border bg-card p-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-foreground">
                        Jumlah Pesanan ({productA?.unitLabel || "pcs"})
                      </span>
                      {productA?.tiers && productA.tiers.length > 0 && (
                        <p className="text-[10px] text-muted-foreground">
                          Tersedia harga grosir bertingkat
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted active:scale-95 transition-colors"
                      >
                        <Minus className="size-4" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-14 rounded-lg border border-input bg-background py-1.5 text-center font-mono text-base sm:text-sm font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => q + 1)}
                        className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted active:scale-95 transition-colors"
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Seksi 5: Pilihan Finishing Tambahan */}
              {isLoadingFinishings ? (
                <Skeleton className="h-14 w-full rounded-xl" />
              ) : finishings.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Finishing Tambahan
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {finishings.map((f) => {
                      const isSelected = selectedFinishingIds.includes(f.id);
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => handleToggleFinishing(f.id)}
                          className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-colors min-h-[44px] ${
                            isSelected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-card hover:bg-muted text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`flex size-4 shrink-0 items-center justify-center rounded-sm border ${
                                isSelected
                                  ? "bg-primary border-primary text-primary-foreground"
                                  : "border-muted-foreground/40"
                              }`}
                            >
                              {isSelected && <Check className="size-3" />}
                            </div>
                            <span className="text-xs font-medium truncate">{f.name}</span>
                          </div>
                          <span className="font-mono text-xs font-semibold tabular-nums ml-2 shrink-0">
                            +{formatRupiah(f.defaultPrice)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* Seksi 6: Hasil Perhitungan (Mode 1 Bahan vs Mode Bandingkan 2 Bahan) */}
              {isComparisonMode && productB && calcResultB ? (
                /* TAMPILAN PERBANDINGAN 2 BAHAN */
                <div className="space-y-3 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-primary" />
                      <span>Hasil Perbandingan Bahan</span>
                    </span>

                    {/* Selisih Badge */}
                    {calcResultA && calcResultB && (
                      <Badge
                        variant="secondary"
                        className="font-mono text-xs font-bold py-0.5 px-2 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                      >
                        Selisih: {formatRupiah(Math.abs(calcResultA.itemSubtotal - calcResultB.itemSubtotal))}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Kartu Opsi A */}
                    {calcResultA && (
                      <div
                        className={`rounded-xl border p-4 flex flex-col justify-between space-y-3 bg-card shadow-xs ${
                          calcResultA.itemSubtotal <= calcResultB.itemSubtotal
                            ? "border-emerald-500/50 ring-1 ring-emerald-500/20"
                            : "border-border"
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-xs font-bold text-foreground line-clamp-1">
                              {productA?.name}
                            </span>
                            {calcResultA.itemSubtotal < calcResultB.itemSubtotal && (
                              <Badge className="bg-emerald-600 text-white text-[9px] py-0 px-1 shrink-0">
                                Lebih Hemat
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            Dasar: {formatRupiah(calcResultA.effectiveUnitPrice)}
                            {productA?.pricingType === "AREA" ? "/m²" : ""}
                          </p>
                          <div className="pt-2 border-t border-border/60">
                            <span className="text-[10px] text-muted-foreground">Total Estimasi:</span>
                            <p className="font-mono text-lg font-bold text-foreground tabular-nums">
                              {formatRupiah(calcResultA.itemSubtotal)}
                            </p>
                          </div>
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          onClick={() => productA && handleHandoffToPos(productA, calcResultA)}
                          className="w-full gap-1.5 h-9 text-xs"
                        >
                          <ShoppingCart className="size-3.5" />
                          <span>Pilih Opsi A ke POS</span>
                        </Button>
                      </div>
                    )}

                    {/* Kartu Opsi B */}
                    <div
                      className={`rounded-xl border p-4 flex flex-col justify-between space-y-3 bg-card shadow-xs ${
                        calcResultB.itemSubtotal < (calcResultA?.itemSubtotal || 0)
                          ? "border-emerald-500/50 ring-1 ring-emerald-500/20"
                          : "border-border"
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-xs font-bold text-foreground line-clamp-1">
                            {productB.name}
                          </span>
                          {calcResultB.itemSubtotal < (calcResultA?.itemSubtotal || 0) && (
                            <Badge className="bg-emerald-600 text-white text-[9px] py-0 px-1 shrink-0">
                              Lebih Hemat
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          Dasar: {formatRupiah(calcResultB.effectiveUnitPrice)}
                          {productB.pricingType === "AREA" ? "/m²" : ""}
                        </p>
                        <div className="pt-2 border-t border-border/60">
                          <span className="text-[10px] text-muted-foreground">Total Estimasi:</span>
                          <p className="font-mono text-lg font-bold text-primary tabular-nums">
                            {formatRupiah(calcResultB.itemSubtotal)}
                          </p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant={
                          calcResultB.itemSubtotal < (calcResultA?.itemSubtotal || 0)
                            ? "default"
                            : "outline"
                        }
                        onClick={() => handleHandoffToPos(productB, calcResultB)}
                        className="w-full gap-1.5 h-9 text-xs"
                      >
                        <ShoppingCart className="size-3.5" />
                        <span>Pilih Opsi B ke POS</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                /* TAMPILAN ESTIMASI 1 BAHAN TUNGGAL */
                calcResultA && (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Rincian Perhitungan
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {calcResultA.quantity} pcs
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Subtotal Bahan:</span>
                        <span className="font-mono font-medium text-foreground tabular-nums">
                          {formatRupiah(calcResultA.baseSubtotal)}
                        </span>
                      </div>
                      {calcResultA.finishingTotal > 0 && (
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Finishing Tambahan:</span>
                          <span className="font-mono font-medium text-foreground tabular-nums">
                            +{formatRupiah(calcResultA.finishingTotal)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-primary/20 flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground">Estimasi Total:</span>
                      <span className="font-mono text-xl font-black text-primary tabular-nums">
                        {formatRupiah(calcResultA.itemSubtotal)}
                      </span>
                    </div>
                  </div>
                )
              )}
            </>
          )}
        </div>

        {/* Footer Aksi Sticky */}
        <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0 bg-card">
          <Button
            type="button"
            variant="outline"
            onClick={handleCopyEstimate}
            disabled={!calcResultA}
            className="gap-2 h-10 text-xs font-semibold"
          >
            <Copy className="size-4" />
            <span>Salin Estimasi (WA)</span>
          </Button>

          {!isComparisonMode && (
            <Button
              type="button"
              onClick={() => productA && calcResultA && handleHandoffToPos(productA, calcResultA)}
              disabled={!calcResultA}
              className="gap-2 h-10 text-xs font-semibold shadow-xs"
            >
              <ShoppingCart className="size-4" />
              <span>Lanjut ke POS</span>
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
