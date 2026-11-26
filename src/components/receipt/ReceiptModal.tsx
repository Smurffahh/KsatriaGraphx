"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { ReceiptView } from "./ReceiptView";
import type { ReceiptOrderData, ReceiptStoreSettings } from "@/lib/printer/share";
import { apiClient } from "@/lib/api/client";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ReceiptOrderData | null;
}

export function ReceiptModal({ isOpen, onClose, order }: ReceiptModalProps) {
  const [storeSettings, setStoreSettings] = useState<ReceiptStoreSettings | undefined>();

  useEffect(() => {
    if (!isOpen) return;
    apiClient<{
      storeName: string;
      tagline?: string | null;
      address?: string | null;
      phone?: string | null;
      receiptFooter?: string | null;
    }>("/api/settings")
      .then((res) => {
        if (res.success && res.data) {
          setStoreSettings(res.data);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      <div className="relative w-full max-w-xl bg-surface border border-border rounded-2xl shadow-2xl p-5 sm:p-6 my-8 max-h-[90vh] overflow-y-auto print:border-none print:shadow-none print:p-0 print:max-h-none print:overflow-visible print:w-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 text-text-muted hover:text-text rounded-xl hover:bg-surface-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center print:hidden cursor-pointer"
          aria-label="Tutup pratinjau nota"
        >
          <X className="size-5" />
        </button>

        <ReceiptView order={order} storeSettings={storeSettings} />
      </div>
    </div>
  );
}
