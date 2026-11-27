type RoleName = "OWNER" | "KASIR" | string;

/**
 * Menghapus informasi modal produksi dan laba dari payload produk apabila
 * pemanggil bukan OWNER agar harga beli vendor tidak bocor ke Kasir atau APK.
 */
export function redactProductForRole<
  T extends {
    productionPrice?: unknown;
    defaultVendorId?: unknown;
    defaultVendor?: unknown;
    priceTiers?: Array<{ productionPrice?: unknown } & Record<string, unknown>>;
  } & Record<string, unknown>,
>(product: T, role: RoleName): T {
  if (role === "OWNER") {
    return product;
  }

  const {
    productionPrice: _productCost,
    defaultVendorId: _defaultVendorId,
    defaultVendor: _defaultVendor,
    priceTiers,
    ...safeProduct
  } = product;
  void _productCost;
  void _defaultVendorId;
  void _defaultVendor;

  if (Array.isArray(priceTiers)) {
    return {
      ...safeProduct,
      priceTiers: priceTiers.map((tier) => {
        const { productionPrice: _tierCost, ...safeTier } = tier;
        void _tierCost;
        return safeTier;
      }),
    } as unknown as T;
  }

  return safeProduct as unknown as T;
}

/**
 * Menghapus harga modal finishing apabila pemanggil bukan OWNER.
 */
export function redactFinishingForRole<
  T extends { productionPrice?: unknown } & Record<string, unknown>,
>(finishing: T, role: RoleName): T {
  if (role === "OWNER") {
    return finishing;
  }

  const { productionPrice: _finCost, ...safeFinishing } = finishing;
  void _finCost;
  return safeFinishing as unknown as T;
}

/**
 * Menghapus total modal vendor dan laba kotor dari payload pesanan serta
 * setiap rincian item apabila pemanggil bukan OWNER.
 */
export function redactOrderForRole<
  T extends {
    totalProductionCost?: unknown;
    grossProfit?: unknown;
    vendorPaidAmount?: unknown;
    vendorPaymentStatus?: unknown;
    vendorPayments?: unknown;
    spkSentAt?: unknown;
    designFileUrl?: unknown;
    items?: Array<
      {
        productionUnitPriceSnapshot?: unknown;
        productionSubtotal?: unknown;
        profitAmount?: unknown;
        vendorId?: unknown;
        vendorNameSnapshot?: unknown;
        vendor?: unknown;
      } & Record<string, unknown>
    >;
  } & Record<string, unknown>,
>(order: T, role: RoleName): T {
  if (role === "OWNER") {
    return order;
  }

  const {
    totalProductionCost: _orderCost,
    grossProfit: _orderProfit,
    vendorPaidAmount: _vendorPaidAmount,
    vendorPaymentStatus: _vendorPaymentStatus,
    vendorPayments: _vendorPayments,
    spkSentAt: _spkSentAt,
    designFileUrl: _designFileUrl,
    items,
    ...safeOrder
  } = order;
  void _orderCost;
  void _orderProfit;
  void _vendorPaidAmount;
  void _vendorPaymentStatus;
  void _vendorPayments;
  void _spkSentAt;
  void _designFileUrl;

  if (Array.isArray(items)) {
    return {
      ...safeOrder,
      items: items.map((item) => {
        const {
          productionUnitPriceSnapshot: _unitCost,
          productionSubtotal: _itemCost,
          profitAmount: _itemProfit,
          vendorId: _vendorId,
          vendorNameSnapshot: _vendorNameSnapshot,
          vendor: _itemVendor,
          ...safeItem
        } = item;
        void _unitCost;
        void _itemCost;
        void _itemProfit;
        void _vendorId;
        void _vendorNameSnapshot;
        void _itemVendor;
        return safeItem;
      }),
    } as unknown as T;
  }

  return safeOrder as unknown as T;
}
