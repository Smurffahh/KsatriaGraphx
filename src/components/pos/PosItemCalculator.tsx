"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Minus,
  Check,
  Maximize2,
  Tag,
  Sparkles,
  Info,
  ShieldAlert,
} from "lucide-react";
import {
  calculateOrderItem,
  type PricingType,
  type AreaDimensionUnit,
  type AreaRounding,
  type PriceTier,
} from "@/lib/calculator/pricing";

export interface PosProductItem {
  id: string;
  name: string;
  imageUrl?: string | null;
  pricingType: PricingType;
  unitLabel: string;
  basePrice: number;
  minArea?: string | number | null;
  areaRounding: AreaRounding;
  tiers?: PriceTier[];
}

export interface PosFinishingOption {
  id: string;
  name: string;
  chargeType: "FLAT" | "PER_QTY" | "PER_AREA";
  defaultPrice: number;
  unitLabel: string;
  isActive: boolean;
}

export interface CartItemFinishing {
  finishingId: string;
  name: string;
  chargeType: "FLAT" | "PER_QTY" | "PER_AREA";
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface CartItem {
  cartItemId: string;
  product: PosProductItem;
  quantity: number;
  width?: number;
  height?: number;
  unit?: AreaDimensionUnit;
  billedAreaM2?: number;
  unitPrice: number;
  isPriceOverridden: boolean;
  itemNotes?: string;
  finishings: CartItemFinishing[];
  finishingTotal: number;
  itemSubtotal: number;
}

interface PosItemCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  product: PosProductItem | null;
  availableFinishings: PosFinishingOption[];
  onAddToCart: (item: CartItem) => void;
  userRole?: "OWNER" | "KASIR";
  initialCartItem?: CartItem | null;
}

export function PosItemCalculator({
  isOpen,
  onClose,
  product,
  availableFinishings,
  onAddToCart,
  userRole = "KASIR",
  initialCartItem,
}: PosItemCalculatorProps) {
  const [quantity, setQuantity] = useState(1);
  const [width, setWidth] = useState<number | "">(1);
  const [height, setHeight] = useState<number | "">(1);
  const [unit, setUnit] = useState<AreaDimensionUnit>("m");
  const [selectedFinishings, setSelectedFinishings] = useState<
    Record<string, { selected: boolean; quantity: number }>
  >({});
  const [isOverrideActive, setIsOverrideActive] = useState(false);
  const [overridePrice, setOverridePrice] = useState<number | "">("");
  const [itemNotes, setItemNotes] = useState("");
  const [isEstimationOnly, setIsEstimationOnly] = useState(false);

  useEffect(() => {
    if (initialCartItem) {
      setQuantity(initialCartItem.quantity);
      setWidth(initialCartItem.width ?? 1);
      setHeight(initialCartItem.height ?? 1);
      setUnit(initialCartItem.unit ?? "m");
      setIsOverrideActive(initialCartItem.isPriceOverridden);
      setOverridePrice(initialCartItem.isPriceOverridden ? initialCartItem.unitPrice : "");
      setItemNotes(initialCartItem.itemNotes || "");

      const fMap: Record<string, { selected: boolean; quantity: number }> = {};
      initialCartItem.finishings.forEach((f) => {
        fMap[f.finishingId] = { selected: true, quantity: f.quantity };
      });
      setSelectedFinishings(fMap);
    } else if (product) {
      setQuantity(1);
      setWidth(1);
      setHeight(1);
      setUnit("m");
      setIsOverrideActive(false);
      setOverridePrice("");
      setItemNotes("");
      setSelectedFinishings({});
      setIsEstimationOnly(false);
    }
  }, [product, initialCartItem, isOpen]);

  if (!isOpen || !product) return null;

  const currentFinishingsList = availableFinishings
    .filter((f) => f.isActive)
    .map((f) => {
      const state = selectedFinishings[f.id];
      return {
        finishingId: f.id,
        name: f.name,
        chargeType: f.chargeType,
        unitPrice: f.defaultPrice,
        quantity: state?.quantity ?? 1,
        selected: Boolean(state?.selected),
      };
    });

  const activeFinishingsToCalc = currentFinishingsList.filter((f) => f.selected);

  const numWidth = typeof width === "number" ? width : 0;
  const numHeight = typeof height === "number" ? height : 0;
  const numOverride = typeof overridePrice === "number" ? overridePrice : undefined;

  const calculation = calculateOrderItem({
    pricingType: product.pricingType,
    quantity,
    basePrice: product.basePrice,
    priceTiers: product.tiers,
    overrideUnitPrice: isOverrideActive ? numOverride : undefined,
    isPriceOverridden: isOverrideActive && numOverride !== undefined,
    width: numWidth,
    height: numHeight,
    unit,
    minArea: product.minArea,
    areaRounding: product.areaRounding,
    finishings: activeFinishingsToCalc,
  });

  const handleToggleFinishing = (finishingId: string) => {
    setSelectedFinishings((prev) => {
      const current = prev[finishingId];
      return {
        ...prev,
        [finishingId]: {
          selected: !current?.selected,
          quantity: current?.quantity ?? 1,
        },
      };
    });
  };

  const handleFinishingQtyChange = (finishingId: string, delta: number) => {
    setSelectedFinishings((prev) => {
      const current = prev[finishingId] || { selected: true, quantity: 1 };
      const newQty = Math.max(1, current.quantity + delta);
      return {
        ...prev,
        [finishingId]: {
          selected: true,
          quantity: newQty,
        },
      };
    });
  };

  const handleConfirm = () => {
    if (isEstimationOnly) {
      onClose();
      return;
    }

    const cartItem: CartItem = {
      cartItemId: initialCartItem?.cartItemId || crypto.randomUUID(),
      product,
      quantity,
      width: product.pricingType === "AREA" ? numWidth : undefined,
      height: product.pricingType === "AREA" ? numHeight : undefined,
      unit: product.pricingType === "AREA" ? unit : undefined,
      billedAreaM2: calculation.billedAreaM2,
      unitPrice: calculation.effectiveUnitPrice,
      isPriceOverridden: calculation.isPriceOverridden,
      itemNotes: itemNotes.trim() || undefined,
      finishings: calculation.finishings.map((f) => ({
        finishingId: f.finishingId || "",
        name: f.name,
        chargeType: f.chargeType,
        unitPrice: f.unitPrice,
        quantity: f.quantity,
        subtotal: f.subtotal,
      })),
      finishingTotal: calculation.finishingTotal,
      itemSubtotal: calculation.itemSubtotal,
    };

    onAddToCart(cartItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-muted/30">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 rounded-md">
                {product.pricingType}
              </span>
              <h2 className="text-base font-bold text-text truncate max-w-xs sm:max-w-md">
                {product.name}
              </h2>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Harga dasar: Rp {product.basePrice.toLocaleString("id-ID")} / {product.unitLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text rounded-xl hover:bg-surface-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Tutup"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Section: Dimension (If AREA) */}
          {product.pricingType === "AREA" && (
            <div className="p-4 rounded-xl bg-surface-muted/30 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text flex items-center gap-1.5">
                  <Maximize2 className="size-3.5 text-primary" />
                  <span>Ukuran Dimensi Meteran</span>
                </span>
                <div className="inline-flex p-0.5 rounded-lg bg-surface border border-border text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setUnit("m")}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      unit === "m" ? "bg-primary text-white" : "text-text-muted hover:text-text"
                    }`}
                  >
                    Meter (m)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnit("cm")}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      unit === "cm" ? "bg-primary text-white" : "text-text-muted hover:text-text"
                    }`}
                  >
                    Centimeter (cm)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-text-muted mb-1">
                    Panjang ({unit})
                  </label>
                  <input
                    type="number"
                    step={unit === "m" ? "0.01" : "1"}
                    min="0"
                    value={width}
                    onChange={(e) =>
                      setWidth(e.target.value === "" ? "" : parseFloat(e.target.value))
                    }
                    className="w-full px-3 py-2 text-base sm:text-sm bg-surface border border-border rounded-xl text-text focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-text-muted mb-1">
                    Lebar ({unit})
                  </label>
                  <input
                    type="number"
                    step={unit === "m" ? "0.01" : "1"}
                    min="0"
                    value={height}
                    onChange={(e) =>
                      setHeight(e.target.value === "" ? "" : parseFloat(e.target.value))
                    }
                    className="w-full px-3 py-2 text-base sm:text-sm bg-surface border border-border rounded-xl text-text focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  />
                </div>
              </div>

              {/* Area Realtime Badge */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                <span className="text-text-muted">Luas Tertagih:</span>
                <div className="flex items-center gap-2">
                  {calculation.isMinAreaApplied && (
                    <span className="px-2 py-0.5 text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-md font-medium">
                      Min Area {product.minArea} m² aktif
                    </span>
                  )}
                  <span className="font-bold text-text tabular-nums">
                    {calculation.billedAreaM2} m²
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Section: Quantity & Tier (If UNIT) */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-muted/30 border border-border">
            <div>
              <span className="text-xs font-medium text-text block">Jumlah Pesanan (Qty)</span>
              {product.pricingType === "UNIT" && product.tiers && product.tiers.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-primary font-medium mt-0.5">
                  <Tag className="size-3.5" />
                  <span>
                    Harga Tier: Rp {calculation.effectiveUnitPrice.toLocaleString("id-ID")} /{" "}
                    {product.unitLabel}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="size-9 rounded-xl bg-surface border border-border hover:bg-surface-muted text-text flex items-center justify-center transition-colors min-h-[44px] min-w-[44px]"
              >
                <Minus className="size-4" />
              </button>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value || "1", 10)))}
                className="w-16 py-2 text-center text-base sm:text-sm font-semibold bg-surface border border-border rounded-xl text-text"
              />
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="size-9 rounded-xl bg-surface border border-border hover:bg-surface-muted text-text flex items-center justify-center transition-colors min-h-[44px] min-w-[44px]"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>

          {/* Section: Owner Price Override */}
          {userRole === "OWNER" && (
            <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-500 flex items-center gap-1.5">
                  <ShieldAlert className="size-4" />
                  <span>Override Harga Satuan (Khusus Owner)</span>
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isOverrideActive}
                    onChange={(e) => setIsOverrideActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-border peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-transform peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {isOverrideActive && (
                <div>
                  <input
                    type="number"
                    min="0"
                    placeholder="Masukkan harga satuan baru..."
                    value={overridePrice}
                    onChange={(e) =>
                      setOverridePrice(e.target.value === "" ? "" : parseInt(e.target.value, 10))
                    }
                    className="w-full px-3 py-2 text-base sm:text-sm bg-surface border border-amber-500/40 rounded-xl text-text focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
                  />
                  <p className="mt-1 text-[11px] text-amber-600">
                    Akan ditandai khusus pada nota dan dicatat di audit log.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Section: Multi-Finishing Checklist */}
          {availableFinishings.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-text block">
                Pilihan Finishing / Pemrosesan Tambahan
              </span>
              <div className="space-y-2">
                {availableFinishings
                  .filter((f) => f.isActive)
                  .map((f) => {
                    const isSelected = selectedFinishings[f.id]?.selected;
                    const fQty = selectedFinishings[f.id]?.quantity ?? 1;

                    return (
                      <div
                        key={f.id}
                        className={`p-3 rounded-xl border transition-[color,background-color,border-color,box-shadow] flex items-center justify-between ${
                          isSelected
                            ? "bg-primary/5 border-primary/40 shadow-xs"
                            : "bg-surface border-border/70 hover:border-border"
                        }`}
                      >
                        <div
                          className="flex items-center gap-3 cursor-pointer flex-1"
                          onClick={() => handleToggleFinishing(f.id)}
                        >
                          <div
                            className={`size-5 rounded-md border flex items-center justify-center transition-colors ${
                              isSelected
                                ? "bg-primary border-primary text-white"
                                : "border-border bg-surface"
                            }`}
                          >
                            {isSelected && <Check className="size-3.5 stroke-[3]" />}
                          </div>
                          <div>
                            <div className="text-xs font-medium text-text">{f.name}</div>
                            <div className="text-[11px] text-text-muted">
                              Rp {f.defaultPrice.toLocaleString("id-ID")} ({f.chargeType})
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="flex items-center gap-1.5 pl-3 border-l border-border/60">
                            <button
                              type="button"
                              onClick={() => handleFinishingQtyChange(f.id, -1)}
                              className="size-7 rounded-lg bg-surface border border-border hover:bg-surface-muted text-text flex items-center justify-center min-h-[32px] min-w-[32px]"
                            >
                              <Minus className="size-3" />
                            </button>
                            <span className="w-8 text-center text-xs font-semibold tabular-nums text-text">
                              {fQty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleFinishingQtyChange(f.id, 1)}
                              className="size-7 rounded-lg bg-surface border border-border hover:bg-surface-muted text-text flex items-center justify-center min-h-[32px] min-w-[32px]"
                            >
                              <Plus className="size-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Section: Item Notes */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Catatan Spesifikasi Item
            </label>
            <input
              type="text"
              value={itemNotes}
              onChange={(e) => setItemNotes(e.target.value)}
              placeholder="Contoh: Mata ayam 4 sudut, lebihan 2cm keliling, file di WA..."
              className="w-full px-3 py-2 text-base sm:text-sm bg-surface border border-border rounded-xl text-text placeholder:text-text-muted/60 focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
          </div>

          {/* Estimation Mode Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-surface-muted/20 border border-border/50 text-xs">
            <span className="text-text-muted flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-primary" />
              <span>Hanya Hitung Cepat (Estimasi)?</span>
            </span>
            <input
              type="checkbox"
              checked={isEstimationOnly}
              onChange={(e) => setIsEstimationOnly(e.target.checked)}
              className="size-4 accent-primary rounded"
            />
          </div>
        </div>

        {/* Footer: Subtotal & Actions */}
        <div className="p-5 border-t border-border bg-surface-muted/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-text-muted">Total Harga Item:</div>
            <div className="text-xl font-bold text-primary tabular-nums">
              Rp {calculation.itemSubtotal.toLocaleString("id-ID")}
            </div>
            {calculation.finishingTotal > 0 && (
              <div className="text-[11px] text-text-muted">
                Termasuk finishing: Rp {calculation.finishingTotal.toLocaleString("id-ID")}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-text-muted hover:text-text rounded-xl hover:bg-surface-muted transition-colors min-h-[44px]"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold bg-primary hover:bg-primary-hover text-white rounded-xl shadow-xs transition-colors min-h-[44px]"
            >
              {isEstimationOnly ? (
                <>
                  <Info className="size-4" />
                  <span>Selesai Estimasi</span>
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  <span>{initialCartItem ? "Simpan Perubahan" : "Masukkan ke Keranjang"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
