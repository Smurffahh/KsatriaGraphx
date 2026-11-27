type RoleName = "OWNER" | "KASIR" | string;

/**
 * Menghapus informasi modal produksi dan laba dari payload produk apabila
 * pemanggil bukan OWNER agar harga beli vendor tidak bocor ke Kasir atau APK.
 */
export function redactProductForRole<
  T extends {
    productionPrice?: unknown;
    priceTiers?: Array<{ productionPrice?: unknown } & Record<string, unknown>>;
  } & Record<string, unknown>,
>(product: T, role: RoleName): T {
  if (role === "OWNER") {
    return product;
  }

  const { productionPrice: _productCost, priceTiers, ...safeProduct } = product;
  void _productCost;

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
    items?: Array<
      {
        productionUnitPriceSnapshot?: unknown;
        productionSubtotal?: unknown;
        profitAmount?: unknown;
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
    items,
    ...safeOrder
  } = order;
  void _orderCost;
  void _orderProfit;

  if (Array.isArray(items)) {
    return {
      ...safeOrder,
      items: items.map((item) => {
        const {
          productionUnitPriceSnapshot: _unitCost,
          productionSubtotal: _itemCost,
          profitAmount: _itemProfit,
          ...safeItem
        } = item;
        void _unitCost;
        void _itemCost;
        void _itemProfit;
        return safeItem;
      }),
    } as unknown as T;
  }

  return safeOrder as unknown as T;
}
