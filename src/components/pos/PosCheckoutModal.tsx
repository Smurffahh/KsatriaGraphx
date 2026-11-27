"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { formatRupiah } from "@/lib/format";
import {
  calculateOrder,
  isDiscountWithinCashierLimit,
  type DiscountType,
  type PaymentMethod,
} from "@/lib/calculator/pricing";
import type { CartItem } from "./PosItemCalculator";
import { CustomerFormModal, type CustomerData } from "../customers/CustomerFormModal";
import { CheckoutCustomerSection } from "./CheckoutCustomerSection";
import {
  CheckoutPaymentSection,
  type PaymentPreset,
} from "./CheckoutPaymentSection";
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
  const [paymentPreset, setPaymentPreset] = useState<PaymentPreset>("FULL");
  const [paymentAmount, setPaymentAmount] = useState<number | "">("");
  const [cashReceived, setCashReceived] = useState<number | "">("");

  const [settings, setSettings] = useState<StoreSettingsData>({
    invoicePrefix: "KGX",
    maxCashierDiscountPercent: 10,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    apiClient
      .get<StoreSettingsData>("/api/settings/public")
      .then((res) => {
        if (res.success && res.data) {
          setSettings(res.data);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (customerMode !== "SELECT" || !customerSearch.trim()) return;
    const timer = setTimeout(() => {
      apiClient
        .get<{ data: CustomerData[] }>(
          `/api/customers?search=${encodeURIComponent(customerSearch)}&limit=5`
        )
        .then((res) => {
          if (res.success && res.data?.data) {
            setCustomerList(res.data.data);
          }
        })
        .catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
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
  const effectiveCashReceived =
    typeof cashReceived === "number" ? cashReceived : effectivePayAmount;
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
      const msg = `Diskon melebihi batas kasir (${maxCashierPercent}%)`;
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
        estimatedReadyAt: estimatedReadyAt
          ? new Date(estimatedReadyAt).toISOString()
          : null,
        notes: orderNotes.trim() || null,
        initialPayment:
          effectivePayAmount > 0
            ? {
                amount: effectivePayAmount,
                paymentMethod,
                cashReceived:
                  paymentMethod === "CASH" ? effectiveCashReceived : null,
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
      const msg =
        err instanceof Error ? err.message : "Gagal menyimpan transaksi pesanan";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92dvh]">
        <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6 border-b border-border bg-surface-muted/30">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-text">
              Checkout Nota Pesanan
            </h2>
            <p className="text-xs sm:text-sm text-text-muted mt-0.5 tabular-nums">
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

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {errorMessage && (
            <div className="p-3.5 text-sm text-danger bg-danger/10 border border-danger/20 rounded-xl flex items-center gap-2.5">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <CheckoutCustomerSection
            customerMode={customerMode}
            customerName={customerName}
            customerPhone={customerPhone}
            customerSearch={customerSearch}
            customerList={customerList}
            onSwitchWalkIn={() => {
              setCustomerMode("WALK_IN");
              setSelectedCustomerId(null);
              setCustomerName("Pelanggan Umum (Walk-in)");
              setCustomerPhone("");
            }}
            onSwitchSelect={() => setCustomerMode("SELECT")}
            onCustomerNameChange={setCustomerName}
            onCustomerPhoneChange={setCustomerPhone}
            onCustomerSearchChange={setCustomerSearch}
            onSelectCustomer={handleSelectCustomer}
            onOpenNewCustomerModal={() => setIsCustomerModalOpen(true)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-text-muted mb-1.5">
                Biaya Desain Tambahan (Rp)
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={designFee}
                onChange={(e) =>
                  setDesignFee(
                    e.target.value === "" ? "" : parseInt(e.target.value, 10)
                  )
                }
                className="h-11 w-full px-3.5 text-base sm:text-sm bg-surface border border-border rounded-xl text-text tabular-nums"
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="text-xs sm:text-sm font-medium text-text-muted">
                  Potongan Diskon
                </label>
                <div className="flex items-center gap-1 text-xs">
                  {(
                    [
                      { key: "NONE", label: "Tidak" },
                      { key: "PERCENT", label: "%" },
                      { key: "FIXED", label: "Rp" },
                    ] as const
                  ).map((d) => (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => {
                        setDiscountType(d.key);
                        if (d.key === "NONE") setDiscountValue("");
                      }}
                      className={`min-h-10 sm:min-h-8 px-2.5 py-1 rounded-lg font-medium cursor-pointer ${
                        discountType === d.key
                          ? "bg-primary text-primary-foreground"
                          : "text-text-muted hover:text-text"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {discountType !== "NONE" && (
                <div>
                  <input
                    type="number"
                    min="0"
                    placeholder={
                      discountType === "PERCENT"
                        ? "Contoh: 10 (%)"
                        : "Contoh: 25000 (Rp)"
                    }
                    value={discountValue}
                    onChange={(e) =>
                      setDiscountValue(
                        e.target.value === "" ? "" : parseInt(e.target.value, 10)
                      )
                    }
                    className={`h-11 w-full px-3.5 text-base sm:text-sm bg-surface border rounded-xl text-text tabular-nums ${
                      isDiscountOverLimit
                        ? "border-danger ring-1 ring-danger"
                        : "border-border"
                    }`}
                  />
                  {isDiscountOverLimit && (
                    <p className="mt-1.5 text-xs text-danger">
                      Diskon kasir maksimal {maxCashierPercent}%. Minta persetujuan Owner bila perlu lebih.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs sm:text-sm font-medium text-text-muted mb-1.5 flex items-center gap-1.5">
                <Calendar className="size-4 text-primary" />
                <span>Target Selesai (Opsional)</span>
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

          <CheckoutPaymentSection
            paymentPreset={paymentPreset}
            paymentMethod={paymentMethod}
            paymentAmount={paymentAmount}
            cashReceived={cashReceived}
            cashChange={cashChange}
            onSelectPreset={setPaymentPreset}
            onSelectMethod={setPaymentMethod}
            onPaymentAmountChange={setPaymentAmount}
            onCashReceivedChange={setCashReceived}
          />

          <div className="p-4 rounded-xl bg-surface border border-border space-y-2.5 text-sm">
            <div className="flex items-center justify-between text-text-muted">
              <span>Subtotal Produk:</span>
              <span className="tabular-nums">
                {formatRupiah(orderCalculation.subtotal)}
              </span>
            </div>
            {orderCalculation.designFee > 0 && (
              <div className="flex items-center justify-between text-text-muted">
                <span>Biaya Desain:</span>
                <span className="tabular-nums">
                  {formatRupiah(orderCalculation.designFee)}
                </span>
              </div>
            )}
            {orderCalculation.discountAmount > 0 && (
              <div className="flex items-center justify-between text-danger">
                <span>Potongan Diskon:</span>
                <span className="tabular-nums">
                  - {formatRupiah(orderCalculation.discountAmount)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-base sm:text-lg font-bold text-text pt-2.5 border-t border-border">
              <span>Grand Total:</span>
              <span className="text-primary text-lg sm:text-xl tabular-nums">
                {formatRupiah(grandTotal)}
              </span>
            </div>
          </div>

          <div className="pt-2 flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5 sm:gap-3">
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
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl shadow-2xs active:not-disabled:scale-[0.96] transition-[transform,background-color] min-h-[44px] disabled:opacity-50 cursor-pointer"
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
