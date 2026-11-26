"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  CreditCard,
  Banknote,
  QrCode,
  User,
  Plus,
  Search,
  Calendar,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import {
  calculateOrder,
  isDiscountWithinCashierLimit,
  type DiscountType,
  type PaymentMethod,
} from "@/lib/calculator/pricing";
import type { CartItem } from "./PosItemCalculator";
import { CustomerFormModal, type CustomerData } from "../customers/CustomerFormModal";
import { toast } from "sonner";

interface StoreSettingsData {
  invoicePrefix: string;
  maxCashierDiscountPercent: number;
}

interface PosCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  userRole?: "OWNER" | "KASIR";
  onSuccess: (orderResult: {
    id: string;
    invoiceNumber: string;
    grandTotal: number;
    paidAmount: number;
    remainingAmount: number;
    changeAmount: number;
    paymentStatus: string;
  }) => void;
}

export function PosCheckoutModal({
  isOpen,
  onClose,
  cartItems,
  userRole = "KASIR",
  onSuccess,
}: PosCheckoutModalProps) {
  const [customerMode, setCustomerMode] = useState<"SELECT" | "WALK_IN">("WALK_IN");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("Pelanggan Umum (Walk-in)");
  const [customerPhone, setCustomerPhone] = useState("");

  const [customerSearch, setCustomerSearch] = useState("");
  const [customerList, setCustomerList] = useState<CustomerData[]>([]);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  const [designFee, setDesignFee] = useState<number | "">("");
  const [discountType, setDiscountType] = useState<DiscountType>("NONE");
  const [discountValue, setDiscountValue] = useState<number | "">("");
  const [estimatedReadyAt, setEstimatedReadyAt] = useState("");
  const [orderNotes, setOrderNotes] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [paymentPreset, setPaymentPreset] = useState<"FULL" | "DP_50" | "ZERO" | "CUSTOM">("FULL");
  const [paymentAmount, setPaymentAmount] = useState<number | "">("");
  const [cashReceived, setCashReceived] = useState<number | "">("");

  const [settings, setSettings] = useState<StoreSettingsData>({
    invoicePrefix: "KGX",
    maxCashierDiscountPercent: 10,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      apiClient
        .get<StoreSettingsData>("/api/settings/public")
        .then((res) => {
          if (res.success && res.data) {
            setSettings(res.data);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (customerMode === "SELECT" && customerSearch.trim()) {
      const timer = setTimeout(() => {
        apiClient
          .get<{ data: CustomerData[] }>(`/api/customers?search=${encodeURIComponent(customerSearch)}&limit=5`)
          .then((res) => {
            if (res.success && res.data?.data) {
              setCustomerList(res.data.data);
            }
          })
          .catch(() => {});
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [customerMode, customerSearch]);

  const numDesign = typeof designFee === "number" ? designFee : 0;
  const numDiscVal = typeof discountValue === "number" ? discountValue : 0;

  const orderCalculation = calculateOrder({
    items: cartItems.map((ci) => ({
      pricingType: ci.product.pricingType,
      quantity: ci.quantity,
      basePrice: ci.product.basePrice,
      overrideUnitPrice: ci.isPriceOverridden ? ci.unitPrice : undefined,
      isPriceOverridden: ci.isPriceOverridden,
      width: ci.width,
      height: ci.height,
      unit: ci.unit,
      minArea: ci.product.minArea,
      areaRounding: ci.product.areaRounding,
      finishings: ci.finishings.map((f) => ({
        finishingId: f.finishingId,
        chargeType: f.chargeType,
        unitPrice: f.unitPrice,
        quantity: f.quantity,
      })),
    })),
    designFee: numDesign,
    discountType,
    discountValue: numDiscVal,
  });

  const grandTotal = orderCalculation.grandTotal;

  useEffect(() => {
    if (paymentPreset === "FULL") {
      setPaymentAmount(grandTotal);
      setCashReceived(grandTotal);
    } else if (paymentPreset === "DP_50") {
      const half = Math.round(grandTotal * 0.5);
      setPaymentAmount(half);
      setCashReceived(half);
    } else if (paymentPreset === "ZERO") {
      setPaymentAmount(0);
      setCashReceived(0);
    }
  }, [paymentPreset, grandTotal]);

  if (!isOpen) return null;

  const effectivePayAmount = typeof paymentAmount === "number" ? paymentAmount : 0;
  const effectiveCashReceived = typeof cashReceived === "number" ? cashReceived : effectivePayAmount;
  const cashChange =
    paymentMethod === "CASH" && effectiveCashReceived > effectivePayAmount
      ? effectiveCashReceived - effectivePayAmount
      : 0;

  const maxCashierPercent = settings.maxCashierDiscountPercent;
  const isDiscountOverLimit =
    userRole === "KASIR" &&
    !isDiscountWithinCashierLimit(
      orderCalculation.subtotalPlusDesign,
      orderCalculation.discountAmount,
      maxCashierPercent
    );

  const handleSelectCustomer = (c: CustomerData) => {
    setSelectedCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerPhone(c.phone || "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      const msg = "Nama pelanggan wajib diisi";
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    if (isDiscountOverLimit) {
      const msg = `Diskon melebihi batas plafon kasir (${maxCashierPercent}%)`;
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const payload = {
        customerId: customerMode === "SELECT" ? selectedCustomerId : null,
        customerNameSnapshot: customerName.trim(),
        customerPhoneSnapshot: customerPhone.trim() || null,
        items: cartItems.map((ci) => ({
          productId: ci.product.id,
          quantity: ci.quantity,
          width: ci.width ?? null,
          height: ci.height ?? null,
          unit: ci.unit ?? "m",
          overrideUnitPrice: ci.isPriceOverridden ? ci.unitPrice : null,
          itemNotes: ci.itemNotes || null,
          finishings: ci.finishings.map((f) => ({
            finishingId: f.finishingId,
            quantity: f.quantity,
          })),
        })),
        designFee: numDesign,
        discountType,
        discountValue: numDiscVal,
        estimatedReadyAt: estimatedReadyAt ? new Date(estimatedReadyAt).toISOString() : null,
        notes: orderNotes.trim() || null,
        initialPayment:
          effectivePayAmount > 0
            ? {
                amount: effectivePayAmount,
                paymentMethod,
                cashReceived: paymentMethod === "CASH" ? effectiveCashReceived : null,
                referenceNote: null,
              }
            : null,
      };

      const res = await apiClient.post<{
        id: string;
        invoiceNumber: string;
        grandTotal: number;
        paidAmount: number;
        remainingAmount: number;
        changeAmount: number;
        paymentStatus: string;
      }>("/api/orders", payload);

      if (!res.success || !res.data) {
        throw new Error(res.error || "Gagal menyimpan transaksi pesanan");
      }

      toast.success(`Nota ${res.data.invoiceNumber} berhasil disimpan!`);
      onSuccess(res.data);
      onClose();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      const msg = errorObj.message || "Gagal menyimpan transaksi pesanan";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6 border-b border-border bg-surface-muted/30">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-text">Checkout Nota Pesanan</h2>
            <p className="text-xs sm:text-sm text-text-muted mt-0.5">
              {cartItems.length} jenis item dalam keranjang
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text rounded-xl hover:bg-surface-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 cursor-pointer"
            aria-label="Tutup"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {errorMessage && (
            <div className="p-3.5 text-sm text-danger bg-danger/10 border border-danger/20 rounded-xl flex items-center gap-2.5">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section: Customer Selection */}
          <div className="p-4 rounded-xl bg-surface-muted/30 border border-border space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs sm:text-sm font-semibold text-text flex items-center gap-1.5">
                <User className="size-4 text-primary" />
                <span>Data Pelanggan</span>
              </span>
              <div className="inline-flex p-1 rounded-xl bg-surface border border-border text-xs font-medium">
                <button
                  type="button"
                  onClick={() => {
                    setCustomerMode("WALK_IN");
                    setSelectedCustomerId(null);
                    setCustomerName("Pelanggan Umum (Walk-in)");
                    setCustomerPhone("");
                  }}
                  className={`min-h-8 px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    customerMode === "WALK_IN" ? "bg-primary text-white font-semibold" : "text-text-muted hover:text-text"
                  }`}
                >
                  Walk-in (Umum)
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerMode("SELECT")}
                  className={`min-h-8 px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    customerMode === "SELECT" ? "bg-primary text-white font-semibold" : "text-text-muted hover:text-text"
                  }`}
                >
                  Pilih / Tambah
                </button>
              </div>
            </div>

            {customerMode === "SELECT" ? (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
                    <input
                      type="text"
                      placeholder="Ketik nama atau no. WA untuk mencari..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="h-11 w-full pl-10 pr-3.5 text-base sm:text-sm bg-surface border border-border rounded-xl text-text"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCustomerModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 text-xs sm:text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 rounded-xl min-h-[44px] shrink-0 cursor-pointer"
                  >
                    <Plus className="size-4" />
                    <span>Baru</span>
                  </button>
                </div>

                {customerList.length > 0 && (
                  <div className="divide-y divide-border/60 bg-surface border border-border rounded-xl max-h-40 overflow-y-auto">
                    {customerList.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => handleSelectCustomer(c)}
                        className="p-3 hover:bg-surface-muted/50 cursor-pointer flex items-center justify-between text-xs sm:text-sm"
                      >
                        <span className="font-medium text-text">{c.name}</span>
                        <span className="text-text-muted tabular-nums">{c.phone || "-"}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-3 rounded-xl bg-surface border border-border/80 flex items-center justify-between text-xs sm:text-sm">
                  <div>
                    <span className="text-text-muted block text-xs">Terpilih:</span>
                    <span className="font-semibold text-text">{customerName}</span>
                  </div>
                  {customerPhone && (
                    <span className="text-text-muted tabular-nums">{customerPhone}</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-text-muted mb-1.5">
                    Nama Pelanggan <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="h-11 w-full px-3.5 text-base sm:text-sm bg-surface border border-border rounded-xl text-text"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-text-muted mb-1.5">Nomor WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="08123456789 (Opsional)"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="h-11 w-full px-3.5 text-base sm:text-sm bg-surface border border-border rounded-xl text-text"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section: Design Fee & Discount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-text-muted mb-1.5">
                Biaya Desain (Rp)
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={designFee}
                onChange={(e) =>
                  setDesignFee(e.target.value === "" ? "" : parseInt(e.target.value, 10))
                }
                className="h-11 w-full px-3.5 text-base sm:text-sm bg-surface border border-border rounded-xl text-text"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs sm:text-sm font-medium text-text-muted">Potongan Diskon</label>
                <div className="flex items-center gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType("NONE");
                      setDiscountValue("");
                    }}
                    className={`min-h-8 px-2.5 py-1 rounded-lg font-medium cursor-pointer ${
                      discountType === "NONE" ? "bg-primary text-white" : "text-text-muted hover:text-text"
                    }`}
                  >
                    Tidak
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType("PERCENT")}
                    className={`min-h-8 px-2.5 py-1 rounded-lg font-medium cursor-pointer ${
                      discountType === "PERCENT" ? "bg-primary text-white" : "text-text-muted hover:text-text"
                    }`}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType("FIXED")}
                    className={`min-h-8 px-2.5 py-1 rounded-lg font-medium cursor-pointer ${
                      discountType === "FIXED" ? "bg-primary text-white" : "text-text-muted hover:text-text"
                    }`}
                  >
                    Rp
                  </button>
                </div>
              </div>

              {discountType !== "NONE" && (
                <div>
                  <input
                    type="number"
                    min="0"
                    placeholder={discountType === "PERCENT" ? "Contoh: 10 (%)" : "Contoh: 25000 (Rp)"}
                    value={discountValue}
                    onChange={(e) =>
                      setDiscountValue(
                        e.target.value === "" ? "" : parseInt(e.target.value, 10)
                      )
                    }
                    className={`h-11 w-full px-3.5 text-base sm:text-sm bg-surface border rounded-xl text-text ${
                      isDiscountOverLimit ? "border-danger ring-1 ring-danger" : "border-border"
                    }`}
                  />
                  {isDiscountOverLimit && (
                    <p className="mt-1.5 text-xs text-danger">
                      Diskon kasir maksimal {maxCashierPercent}%. Silakan minta bantuan Owner.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section: Estimated Date & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs sm:text-sm font-medium text-text-muted mb-1.5 flex items-center gap-1.5">
                <Calendar className="size-4 text-primary" />
                <span>Estimasi Selesai (Opsional)</span>
              </label>
              <input
                type="datetime-local"
                value={estimatedReadyAt}
                onChange={(e) => setEstimatedReadyAt(e.target.value)}
                className="h-11 w-full px-3.5 text-base sm:text-sm bg-surface border border-border rounded-xl text-text"
              />
            </div>

            <div>
              <label className="text-xs sm:text-sm font-medium text-text-muted mb-1.5 flex items-center gap-1.5">
                <FileText className="size-4 text-primary" />
                <span>Catatan Nota / Pengerjaan</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: Ditunggu jam 5 sore..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="h-11 w-full px-3.5 text-base sm:text-sm bg-surface border border-border rounded-xl text-text"
              />
            </div>
          </div>

          {/* Section: Payment Method & Presets */}
          <div className="p-4 rounded-xl bg-surface-muted/30 border border-border space-y-3.5">
            <span className="text-xs sm:text-sm font-semibold text-text block">Pembayaran Pertama</span>

            {/* Presets */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPaymentPreset("FULL")}
                className={`min-h-10 py-2 px-3 text-xs sm:text-sm font-medium rounded-xl border transition-colors cursor-pointer ${
                  paymentPreset === "FULL"
                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 font-semibold"
                    : "bg-surface border-border text-text-muted hover:text-text"
                }`}
              >
                Lunas
              </button>
              <button
                type="button"
                onClick={() => setPaymentPreset("DP_50")}
                className={`min-h-10 py-2 px-3 text-xs sm:text-sm font-medium rounded-xl border transition-colors cursor-pointer ${
                  paymentPreset === "DP_50"
                    ? "bg-amber-500/10 border-amber-500 text-amber-600 font-semibold"
                    : "bg-surface border-border text-text-muted hover:text-text"
                }`}
              >
                DP 50%
              </button>
              <button
                type="button"
                onClick={() => setPaymentPreset("ZERO")}
                className={`min-h-10 py-2 px-3 text-xs sm:text-sm font-medium rounded-xl border transition-colors cursor-pointer ${
                  paymentPreset === "ZERO"
                    ? "bg-danger/10 border-danger text-danger font-semibold"
                    : "bg-surface border-border text-text-muted hover:text-text"
                }`}
              >
                Belum Bayar
              </button>
              <button
                type="button"
                onClick={() => setPaymentPreset("CUSTOM")}
                className={`min-h-10 py-2 px-3 text-xs sm:text-sm font-medium rounded-xl border transition-colors cursor-pointer ${
                  paymentPreset === "CUSTOM"
                    ? "bg-primary/10 border-primary text-primary font-semibold"
                    : "bg-surface border-border text-text-muted hover:text-text"
                }`}
              >
                Nominal Lain
              </button>
            </div>

            {/* Payment Method Switcher */}
            {paymentPreset !== "ZERO" && (
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("CASH")}
                  className={`min-h-10 py-2 px-2 text-xs sm:text-sm font-medium rounded-xl border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    paymentMethod === "CASH"
                      ? "bg-primary text-white border-primary"
                      : "bg-surface border-border text-text-muted hover:text-text"
                  }`}
                >
                  <Banknote className="size-4 shrink-0" />
                  <span>Tunai</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("TRANSFER")}
                  className={`min-h-10 py-2 px-2 text-xs sm:text-sm font-medium rounded-xl border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    paymentMethod === "TRANSFER"
                      ? "bg-primary text-white border-primary"
                      : "bg-surface border-border text-text-muted hover:text-text"
                  }`}
                >
                  <CreditCard className="size-4 shrink-0" />
                  <span>Transfer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("QRIS")}
                  className={`min-h-10 py-2 px-2 text-xs sm:text-sm font-medium rounded-xl border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    paymentMethod === "QRIS"
                      ? "bg-primary text-white border-primary"
                      : "bg-surface border-border text-text-muted hover:text-text"
                  }`}
                >
                  <QrCode className="size-4 shrink-0" />
                  <span>QRIS</span>
                </button>
              </div>
            )}

            {/* Payment Inputs */}
            {paymentPreset !== "ZERO" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-text-muted mb-1.5">
                    Nominal Dibayar (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={paymentAmount}
                    onChange={(e) => {
                      setPaymentPreset("CUSTOM");
                      setPaymentAmount(
                        e.target.value === "" ? "" : parseInt(e.target.value, 10)
                      );
                    }}
                    className="h-11 w-full px-3.5 text-base sm:text-sm bg-surface border border-border rounded-xl text-text font-semibold tabular-nums"
                  />
                </div>

                {paymentMethod === "CASH" && (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-text-muted mb-1.5">
                      Uang Diterima dari Pelanggan (Rp)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={cashReceived}
                      onChange={(e) =>
                        setCashReceived(
                          e.target.value === "" ? "" : parseInt(e.target.value, 10)
                        )
                      }
                      className="h-11 w-full px-3.5 text-base sm:text-sm bg-surface border border-border rounded-xl text-text tabular-nums"
                    />
                    {cashChange > 0 && (
                      <div className="mt-1.5 text-xs text-emerald-600 font-semibold tabular-nums">
                        Kembalian Tunai: Rp {cashChange.toLocaleString("id-ID")}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Breakdown Totals */}
          <div className="p-4 rounded-xl bg-surface border border-border space-y-2.5 text-sm">
            <div className="flex items-center justify-between text-text-muted">
              <span>Subtotal Produk:</span>
              <span className="tabular-nums">
                Rp {orderCalculation.subtotal.toLocaleString("id-ID")}
              </span>
            </div>
            {orderCalculation.designFee > 0 && (
              <div className="flex items-center justify-between text-text-muted">
                <span>Biaya Desain:</span>
                <span className="tabular-nums">
                  Rp {orderCalculation.designFee.toLocaleString("id-ID")}
                </span>
              </div>
            )}
            {orderCalculation.discountAmount > 0 && (
              <div className="flex items-center justify-between text-danger">
                <span>Potongan Diskon:</span>
                <span className="tabular-nums">
                  - Rp {orderCalculation.discountAmount.toLocaleString("id-ID")}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-base sm:text-lg font-bold text-text pt-2.5 border-t border-border">
              <span>Grand Total:</span>
              <span className="text-primary text-lg sm:text-xl tabular-nums">
                Rp {grandTotal.toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-sm font-medium text-text-muted hover:text-text rounded-xl hover:bg-surface-muted transition-colors min-h-[44px] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isDiscountOverLimit}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold bg-primary hover:bg-primary-hover text-white rounded-xl shadow-xs transition-colors min-h-[44px] disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Menyimpan Nota...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  <span>Proses Nota Sekarang</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Inline Customer Modal */}
      <CustomerFormModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSuccess={(saved) => {
          if (saved) {
            handleSelectCustomer(saved);
          }
        }}
      />
    </div>
  );
}
