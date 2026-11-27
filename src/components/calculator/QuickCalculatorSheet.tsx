"use client";

import React, { useState, useEffect, useMemo } from "react";
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
import { ErrorStatePanel } from "@/components/ui/state-panels";
import { apiClient } from "@/lib/api/client";
import { m, AnimatePresence } from "motion/react";
import {
  QuickCatalogPicker,
  type CatalogPickerCategory,
} from "@/components/calculator/QuickCatalogPicker";
import {
  calculateOrderItem,
  type AreaDimensionUnit,
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
import {
  QuickProductSlotCard,
  type QuickCalcSlotProduct,
} from "./QuickProductSlotCard";
import {
  QuickDimensionSection,
  type QuickCalcFinishingOption,
} from "./QuickDimensionSection";
import { QuickResultSummary } from "./QuickResultSummary";

export type QuickCalcProduct = QuickCalcSlotProduct;
export type QuickCalcFinishing = QuickCalcFinishingOption;

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
  } = useQuery<QuickCalcSlotProduct[]>({
    queryKey: ["products", "active"],
    queryFn: async () => {
      const res = await apiClient<QuickCalcSlotProduct[]>("/api/products?includeInactive=false");
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
  } = useQuery<QuickCalcFinishingOption[]>({
    queryKey: ["quick-calc-finishings"],
    queryFn: async () => {
      const res = await apiClient<QuickCalcFinishingOption[]>("/api/finishings");
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
  const [isCopied, setIsCopied] = useState(false);

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
    toast.info("Input kalkulator dikembalikan ke bawaan.");
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

    const storeName = storeInfo?.storeName || "Ksatria Graphx";
    const text =
      isComparisonMode && productB && calcResultB
        ? formatComparisonEstimateText({
            storeName,
            pricingType: productA.pricingType,
            quantity: Math.max(1, Number(quantity) || 1),
            unitLabel: productA.unitLabel,
            width: productA.pricingType === "AREA" ? Number(width) || 0 : undefined,
            height: productA.pricingType === "AREA" ? Number(height) || 0 : undefined,
            dimensionUnit,
            finishingsSummary: calcResultA.finishings.map(
              (f) => `${f.name} (${formatRupiah(f.subtotal)})`
            ),
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
          })
        : formatSingleEstimateText({
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

    let success = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        success = true;
      }
    } catch {
      // Fallback textarea untuk WebView tanpa clipboard API
    }

    if (!success) {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
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
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500);
      toast.success("Perkiraan harga siap ditempel ke WhatsApp.");
    } else {
      toast.error("Gagal menyalin teks perkiraan harga.");
    }
  };

  const handleHandoffToPos = (
    targetProduct: QuickCalcSlotProduct,
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
        ? "Dipilih dari perbandingan kalkulator cepat"
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
            ? "max-h-[92dvh] rounded-t-3xl p-4 sm:p-6"
            : "sm:max-w-xl lg:max-w-2xl p-6"
        } flex flex-col gap-0 overflow-hidden bg-card text-card-foreground border-border`}
      >
        <SheetHeader className="pb-4 border-b border-border space-y-1 text-left shrink-0 pr-12">
          <div className="flex items-start sm:items-center justify-between gap-2.5 min-w-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                <Calculator className="size-5" />
              </div>
              <div className="min-w-0">
                <SheetTitle className="text-base sm:text-lg font-semibold tracking-tight text-foreground flex flex-wrap items-center gap-2">
                  <span>Kalkulator Cepat &amp; Perbandingan</span>
                  <Badge variant="outline" className="text-xs font-mono shrink-0">
                    Instan
                  </Badge>
                </SheetTitle>
                <SheetDescription className="text-xs sm:text-sm text-muted-foreground line-clamp-2 sm:line-clamp-1">
                  Hitung perkiraan biaya cetak, bandingkan 2 bahan, lalu kirim ke WA atau POS
                </SheetDescription>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="gap-1.5 text-muted-foreground hover:text-foreground shrink-0"
              title="Reset Input"
            >
              <RotateCcw className="size-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-5 scrollbar-thin">
          {isLoadingProducts ? (
            <div className="space-y-4">
              <Skeleton className="h-11 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : isErrorProducts || products.length === 0 ? (
            <ErrorStatePanel
              title="Data produk belum tersedia"
              description="Pastikan ada produk aktif di Katalog Produk lalu muat ulang."
              onRetry={() => refetchProducts()}
              retryLabel="Coba Lagi"
            />
          ) : (
            <>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary tabular-nums">
                      1
                    </span>
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Pilih Produk / Bahan <span className="text-destructive">*</span>
                    </label>
                  </div>
                  {productA && (
                    <Badge variant="secondary" className="font-mono text-xs">
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
                  <QuickProductSlotCard
                    product={productA}
                    onChangeProduct={() => setIsPickerAOpen(true)}
                  />
                )}
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 p-3.5 sm:p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Layers className="size-4.5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      Bandingkan 2 Bahan
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Lihat selisih harga bahan alternatif untuk ukuran yang sama
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isComparisonMode}
                  onCheckedChange={setIsComparisonMode}
                  disabled={availableProductsB.length === 0}
                />
              </div>

              {isComparisonMode && (
                <div className="space-y-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3.5 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-primary uppercase tracking-wider">
                      Bahan Pembanding (Opsi B)
                    </label>
                    <span className="text-xs font-normal text-muted-foreground">
                      tipe {productA?.pricingType === "AREA" ? "meteran (m²)" : "satuan (pcs)"}
                    </span>
                  </div>

                  {availableProductsB.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      Belum ada produk lain dengan tipe hitung yang sama.
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
                    <QuickProductSlotCard
                      product={productB}
                      highlighted
                      onChangeProduct={() => setIsPickerBOpen(true)}
                    />
                  )}
                </div>
              )}

              <QuickDimensionSection
                product={productA}
                width={width}
                height={height}
                dimensionUnit={dimensionUnit}
                quantity={quantity}
                billedResult={calcResultA}
                finishings={finishings}
                selectedFinishingIds={selectedFinishingIds}
                isLoadingFinishings={isLoadingFinishings}
                onWidthChange={setWidth}
                onHeightChange={setHeight}
                onUnitChange={setDimensionUnit}
                onQuantityChange={setQuantity}
                onApplyPreset={handleApplyPreset}
                onToggleFinishing={handleToggleFinishing}
              />

              <QuickResultSummary
                isComparisonMode={isComparisonMode}
                productA={productA}
                productB={productB}
                calcResultA={calcResultA}
                calcResultB={calcResultB}
                onHandoffToPos={handleHandoffToPos}
              />
            </>
          )}
        </div>

        <div className="pt-3.5 border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0 bg-card">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={handleCopyEstimate}
            disabled={!calcResultA}
            className="gap-2 font-semibold min-w-[160px]"
          >
            <AnimatePresence mode="wait" initial={false}>
              {isCopied ? (
                <m.span
                  key="copied"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold"
                >
                  <Check className="size-4" />
                  <span>Tersalin!</span>
                </m.span>
              ) : (
                <m.span
                  key="copy"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-1.5"
                >
                  <Copy className="size-4" />
                  <span>Salin Estimasi (WA)</span>
                </m.span>
              )}
            </AnimatePresence>
          </Button>

          {!isComparisonMode && (
            <Button
              type="button"
              size="lg"
              onClick={() =>
                productA && calcResultA && handleHandoffToPos(productA, calcResultA)
              }
              disabled={!calcResultA}
              className="gap-2 font-semibold shadow-2xs"
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
