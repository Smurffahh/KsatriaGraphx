"use client";

import React from "react";
import { Plus, Search, User } from "lucide-react";
import type { CustomerData } from "../customers/CustomerFormModal";

interface CheckoutCustomerSectionProps {
  customerMode: "SELECT" | "WALK_IN";
  customerName: string;
  customerPhone: string;
  customerSearch: string;
  customerList: CustomerData[];
  onSwitchWalkIn: () => void;
  onSwitchSelect: () => void;
  onCustomerNameChange: (val: string) => void;
  onCustomerPhoneChange: (val: string) => void;
  onCustomerSearchChange: (val: string) => void;
  onSelectCustomer: (customer: CustomerData) => void;
  onOpenNewCustomerModal: () => void;
}

/** Bagian pemilihan pelanggan Walk-in atau pelanggan terdaftar pada checkout POS. */
export function CheckoutCustomerSection({
  customerMode,
  customerName,
  customerPhone,
  customerSearch,
  customerList,
  onSwitchWalkIn,
  onSwitchSelect,
  onCustomerNameChange,
  onCustomerPhoneChange,
  onCustomerSearchChange,
  onSelectCustomer,
  onOpenNewCustomerModal,
}: CheckoutCustomerSectionProps) {
  return (
    <div className="p-4 rounded-xl bg-surface-muted/30 border border-border space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs sm:text-sm font-semibold text-text flex items-center gap-1.5">
          <User className="size-4 text-primary" />
          <span>Data Pelanggan</span>
        </span>
        <div className="inline-flex p-1 rounded-xl bg-surface border border-border text-xs font-medium">
          <button
            type="button"
            onClick={onSwitchWalkIn}
            className={`min-h-10 sm:min-h-8 px-3 py-1 rounded-lg transition-colors cursor-pointer ${
              customerMode === "WALK_IN"
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-text-muted hover:text-text"
            }`}
          >
            Walk-in (Umum)
          </button>
          <button
            type="button"
            onClick={onSwitchSelect}
            className={`min-h-10 sm:min-h-8 px-3 py-1 rounded-lg transition-colors cursor-pointer ${
              customerMode === "SELECT"
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-text-muted hover:text-text"
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
                onChange={(e) => onCustomerSearchChange(e.target.value)}
                className="h-11 w-full pl-10 pr-3.5 text-base sm:text-sm bg-surface border border-border rounded-xl text-text focus:outline-hidden focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <button
              type="button"
              onClick={onOpenNewCustomerModal}
              className="inline-flex items-center gap-1.5 px-3.5 text-xs sm:text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 rounded-xl min-h-[44px] shrink-0 cursor-pointer"
            >
              <Plus className="size-4" />
              <span>Baru</span>
            </button>
          </div>

          {customerList.length > 0 && (
            <div className="divide-y divide-border/60 bg-surface border border-border rounded-xl max-h-40 overflow-y-auto">
              {customerList.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectCustomer(c)}
                  className="w-full p-3 hover:bg-surface-muted/50 cursor-pointer flex items-center justify-between text-left text-xs sm:text-sm min-h-[44px]"
                >
                  <span className="font-medium text-text truncate">{c.name}</span>
                  <span className="text-text-muted tabular-nums shrink-0 ml-2">
                    {c.phone || "-"}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="p-3 rounded-xl bg-surface border border-border/80 flex items-center justify-between gap-2 text-xs sm:text-sm">
            <div className="min-w-0">
              <span className="text-text-muted block text-xs">Terpilih:</span>
              <span className="font-semibold text-text truncate block">
                {customerName}
              </span>
            </div>
            {customerPhone && (
              <span className="text-text-muted tabular-nums shrink-0">
                {customerPhone}
              </span>
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
              onChange={(e) => onCustomerNameChange(e.target.value)}
              className="h-11 w-full px-3.5 text-base sm:text-sm bg-surface border border-border rounded-xl text-text focus:outline-hidden focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-text-muted mb-1.5">
              Nomor WhatsApp
            </label>
            <input
              type="tel"
              placeholder="08123456789 (Opsional)"
              value={customerPhone}
              onChange={(e) => onCustomerPhoneChange(e.target.value)}
              className="h-11 w-full px-3.5 text-base sm:text-sm bg-surface border border-border rounded-xl text-text focus:outline-hidden focus:ring-2 focus:ring-ring/30 tabular-nums"
            />
          </div>
        </div>
      )}
    </div>
  );
}
