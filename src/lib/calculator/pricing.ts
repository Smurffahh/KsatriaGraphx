export type AreaDimensionUnit = "m" | "cm";
export type AreaRounding = "EXACT" | "ROUND_UP_0_5" | "ROUND_UP_1";
export type PricingType = "AREA" | "UNIT" | "CUSTOM";
export type ChargeType = "FLAT" | "PER_QTY" | "PER_AREA";
export type DiscountType = "NONE" | "FIXED" | "PERCENT";
export type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID";
export type PaymentMethod = "CASH" | "TRANSFER" | "QRIS";

export interface PriceTier {
  minQty: number;
  maxQty?: number | null;
  productionPrice?: number | null;
  unitPrice: number;
}

export interface ProfitMetrics {
  productionPrice: number;
  sellingPrice: number;
  profitPerUnit: number;
  markupPercent: number | null;
  marginPercent: number;
}

export interface FinishingItemCalculation {
  finishingId?: string;
  name?: string;
  chargeType: ChargeType;
  unitPrice: number;
  productionUnitPrice?: number;
  quantity?: number;
}

export interface CalculatedFinishingItem {
  finishingId?: string;
  name: string;
  chargeType: ChargeType;
  unitPrice: number;
  productionUnitPrice?: number;
  quantity: number;
  subtotal: number;
  productionSubtotal?: number;
}

export interface CalculateAreaInput {
  width: number;
  height: number;
  unit?: AreaDimensionUnit;
  minArea?: number | string | null;
  areaRounding?: AreaRounding;
}

export interface CalculateAreaResult {
  widthM: number;
  heightM: number;
  rawAreaM2: number;
  billedAreaM2: number;
  isMinAreaApplied: boolean;
}

export interface CalculateItemInput {
  pricingType: PricingType;
  quantity: number;
  unitPrice?: number;
  basePrice?: number;
  productionPrice?: number;
  priceTiers?: PriceTier[];
  overrideUnitPrice?: number;
  isPriceOverridden?: boolean;
  width?: number;
  height?: number;
  unit?: AreaDimensionUnit;
  minArea?: number | string | null;
  areaRounding?: AreaRounding;
  finishings?: FinishingItemCalculation[];
}

export interface CalculateItemResult {
  pricingType: PricingType;
  quantity: number;
  effectiveUnitPrice: number;
  productionUnitPrice: number;
  isPriceOverridden: boolean;
  widthM?: number;
  heightM?: number;
  billedAreaM2?: number;
  isMinAreaApplied?: boolean;
  baseSubtotal: number;
  productionBaseSubtotal: number;
  finishings: CalculatedFinishingItem[];
  finishingTotal: number;
  productionFinishingTotal: number;
  itemSubtotal: number;
  productionSubtotal: number;
  profitAmount: number;
}

export interface CalculateOrderInput {
  items: CalculateItemInput[];
  designFee?: number;
  discountType?: DiscountType;
  discountValue?: number;
  initialPaymentAmount?: number;
  cashReceived?: number;
  paymentMethod?: PaymentMethod;
}

/**
 * Rumus laba kotor pesanan (tanpa PPN / pajak):
 * grossProfit = grandTotal - totalProductionCost
 * di mana grandTotal = max(0, subtotal + designFee - discountAmount) dan
 * totalProductionCost = sum(item.productionSubtotal).
 * Diskon atau override harga jual memotong laba tanpa mengurangi modal vendor.
 */
export interface CalculateOrderResult {
  subtotal: number;
  designFee: number;
  subtotalPlusDesign: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  equivalentDiscountPercent: number;
  grandTotal: number;
  totalProductionCost: number;
  grossProfit: number;
  paidAmount: number;
  remainingAmount: number;
  changeAmount: number;
  paymentStatus: PaymentStatus;
  items: CalculateItemResult[];
}

function sanitizeNumber(value: unknown, defaultValue = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value) || Number.isNaN(value)) {
    return defaultValue;
  }
  return value;
}

function sanitizePositiveInt(value: unknown, defaultValue = 0): number {
  const num = sanitizeNumber(value, defaultValue);
  if (num <= 0) return 0;
  return Math.min(Math.round(num), Number.MAX_SAFE_INTEGER);
}

/**
 * Menghitung laba per satuan, persentase markup (laba / modal), dan margin (laba / harga jual).
 */
export function calculateProfitMetrics(
  productionPriceInput: number,
  sellingPriceInput: number
): ProfitMetrics {
  const productionPrice = sanitizePositiveInt(productionPriceInput, 0);
  const sellingPrice = sanitizePositiveInt(sellingPriceInput, 0);
  const profitPerUnit = sellingPrice - productionPrice;
  const markupPercent =
    productionPrice > 0
      ? Math.round((profitPerUnit / productionPrice) * 1000) / 10
      : null;
  const marginPercent =
    sellingPrice > 0
      ? Math.round((profitPerUnit / sellingPrice) * 1000) / 10
      : 0;

  return {
    productionPrice,
    sellingPrice,
    profitPerUnit,
    markupPercent,
    marginPercent,
  };
}

export function applyAreaRounding(rawAreaM2: number, mode: AreaRounding = "EXACT"): number {
  const sanitized = Math.max(0, sanitizeNumber(rawAreaM2, 0));
  const rounded3Dec = Math.round(sanitized * 1000) / 1000;

  switch (mode) {
    case "ROUND_UP_0_5":
      return Math.round(Math.ceil(rounded3Dec * 2) / 2 * 1000) / 1000;
    case "ROUND_UP_1":
      return Math.ceil(rounded3Dec);
    case "EXACT":
    default:
      return rounded3Dec;
  }
}

export function calculateAreaDimension(input: CalculateAreaInput): CalculateAreaResult {
  const widthRaw = sanitizeNumber(input.width, 0);
  const heightRaw = sanitizeNumber(input.height, 0);
  const unit = input.unit ?? "m";

  const widthM = unit === "cm" ? Math.max(0, widthRaw / 100) : Math.max(0, widthRaw);
  const heightM = unit === "cm" ? Math.max(0, heightRaw / 100) : Math.max(0, heightRaw);

  const rawAreaM2 = Math.round(widthM * heightM * 1000) / 1000;
  const roundedArea = applyAreaRounding(rawAreaM2, input.areaRounding ?? "EXACT");

  let minAreaVal = 0;
  if (input.minArea !== null && input.minArea !== undefined) {
    minAreaVal = typeof input.minArea === "string" ? parseFloat(input.minArea) : input.minArea;
    if (!Number.isFinite(minAreaVal) || minAreaVal < 0) {
      minAreaVal = 0;
    }
  }

  const billedAreaM2 = Math.max(minAreaVal, roundedArea);
  const isMinAreaApplied = minAreaVal > 0 && roundedArea < minAreaVal;

  return {
    widthM: Math.round(widthM * 1000) / 1000,
    heightM: Math.round(heightM * 1000) / 1000,
    rawAreaM2,
    billedAreaM2: Math.round(billedAreaM2 * 1000) / 1000,
    isMinAreaApplied,
  };
}

export function findActivePriceTier(
  tiers: PriceTier[] | undefined,
  quantity: number,
  basePrice: number
): { unitPrice: number; matchedTier: PriceTier | null } {
  const safeQty = sanitizePositiveInt(quantity, 1);
  const safeBasePrice = sanitizePositiveInt(basePrice, 0);

  if (!tiers || tiers.length === 0) {
    return { unitPrice: safeBasePrice, matchedTier: null };
  }

  const sortedTiers = [...tiers].sort((a, b) => a.minQty - b.minQty);
  for (const tier of sortedTiers) {
    const min = sanitizePositiveInt(tier.minQty, 1);
    const max = tier.maxQty !== null && tier.maxQty !== undefined ? sanitizePositiveInt(tier.maxQty, min) : null;

    if (safeQty >= min && (max === null || safeQty <= max)) {
      return {
        unitPrice: sanitizePositiveInt(tier.unitPrice, 0),
        matchedTier: tier,
      };
    }
  }

  return { unitPrice: safeBasePrice, matchedTier: null };
}

export function calculateFinishingSubtotal(
  finishing: FinishingItemCalculation,
  itemQuantity: number,
  billedAreaM2: number
): { subtotal: number; quantity: number } {
  const safeItemQty = sanitizePositiveInt(itemQuantity, 1);
  const finishingQty = sanitizeNumber(finishing.quantity, 1);
  const safeFinishingQty = finishingQty > 0 ? finishingQty : 1;
  const safeUnitPrice = sanitizePositiveInt(finishing.unitPrice, 0);
  const safeBilledArea = Math.max(0, sanitizeNumber(billedAreaM2, 0));

  let subtotal = 0;

  switch (finishing.chargeType) {
    case "FLAT":
      subtotal = Math.round(safeUnitPrice * safeFinishingQty);
      break;
    case "PER_QTY":
      subtotal = Math.round(safeUnitPrice * safeItemQty * safeFinishingQty);
      break;
    case "PER_AREA":
      subtotal = Math.round(safeBilledArea * safeUnitPrice * safeItemQty * safeFinishingQty);
      break;
    default:
      subtotal = Math.round(safeUnitPrice * safeFinishingQty);
      break;
  }

  return {
    subtotal: Math.max(0, subtotal),
    quantity: Math.round(safeFinishingQty * 100) / 100,
  };
}

export function calculateOrderItem(input: CalculateItemInput): CalculateItemResult {
  const safeQty = sanitizePositiveInt(input.quantity, 0);
  let effectiveUnitPrice = 0;
  let productionUnitPrice = sanitizePositiveInt(input.productionPrice, 0);
  let isPriceOverridden = Boolean(input.isPriceOverridden);

  let widthM: number | undefined;
  let heightM: number | undefined;
  let billedAreaM2: number | undefined;
  let isMinAreaApplied: boolean | undefined;

  if (input.pricingType === "AREA") {
    const areaResult = calculateAreaDimension({
      width: input.width ?? 0,
      height: input.height ?? 0,
      unit: input.unit ?? "m",
      minArea: input.minArea,
      areaRounding: input.areaRounding,
    });

    widthM = areaResult.widthM;
    heightM = areaResult.heightM;
    billedAreaM2 = areaResult.billedAreaM2;
    isMinAreaApplied = areaResult.isMinAreaApplied;

    if (input.overrideUnitPrice !== undefined && input.overrideUnitPrice !== null && input.isPriceOverridden) {
      effectiveUnitPrice = sanitizePositiveInt(input.overrideUnitPrice, 0);
      isPriceOverridden = true;
    } else {
      effectiveUnitPrice = sanitizePositiveInt(input.unitPrice ?? input.basePrice, 0);
      isPriceOverridden = false;
    }
  } else if (input.pricingType === "UNIT") {
    const tierLookup = findActivePriceTier(input.priceTiers, safeQty, input.basePrice ?? input.unitPrice ?? 0);
    const tierProdPrice = tierLookup.matchedTier?.productionPrice;
    if (tierProdPrice !== null && tierProdPrice !== undefined) {
      productionUnitPrice = sanitizePositiveInt(tierProdPrice, 0);
    }

    if (input.overrideUnitPrice !== undefined && input.overrideUnitPrice !== null && input.isPriceOverridden) {
      effectiveUnitPrice = sanitizePositiveInt(input.overrideUnitPrice, 0);
      isPriceOverridden = true;
    } else {
      effectiveUnitPrice = tierLookup.unitPrice;
      isPriceOverridden = false;
    }
  } else {
    effectiveUnitPrice = sanitizePositiveInt(input.overrideUnitPrice ?? input.unitPrice ?? input.basePrice, 0);
    isPriceOverridden = false;
  }

  let baseSubtotal = 0;
  let productionBaseSubtotal = 0;
  if (safeQty > 0) {
    if (input.pricingType === "AREA") {
      baseSubtotal = Math.round((billedAreaM2 ?? 0) * effectiveUnitPrice * safeQty);
      productionBaseSubtotal = Math.round((billedAreaM2 ?? 0) * productionUnitPrice * safeQty);
    } else {
      baseSubtotal = Math.round(effectiveUnitPrice * safeQty);
      productionBaseSubtotal = Math.round(productionUnitPrice * safeQty);
    }
  }

  const calculatedFinishings: CalculatedFinishingItem[] = [];
  let finishingTotal = 0;
  let productionFinishingTotal = 0;

  if (input.finishings && input.finishings.length > 0 && safeQty > 0) {
    for (const f of input.finishings) {
      const res = calculateFinishingSubtotal(f, safeQty, billedAreaM2 ?? 0);
      const prodFinUnit = sanitizePositiveInt(f.productionUnitPrice, 0);
      const prodRes = calculateFinishingSubtotal(
        { ...f, unitPrice: prodFinUnit },
        safeQty,
        billedAreaM2 ?? 0
      );

      calculatedFinishings.push({
        finishingId: f.finishingId,
        name: f.name || "Finishing",
        chargeType: f.chargeType,
        unitPrice: sanitizePositiveInt(f.unitPrice, 0),
        productionUnitPrice: prodFinUnit,
        quantity: res.quantity,
        subtotal: res.subtotal,
        productionSubtotal: prodRes.subtotal,
      });
      finishingTotal += res.subtotal;
      productionFinishingTotal += prodRes.subtotal;
    }
  }

  const itemSubtotal = baseSubtotal + finishingTotal;
  const productionSubtotal = productionBaseSubtotal + productionFinishingTotal;
  const profitAmount = itemSubtotal - productionSubtotal;

  return {
    pricingType: input.pricingType,
    quantity: safeQty,
    effectiveUnitPrice,
    productionUnitPrice,
    isPriceOverridden,
    widthM,
    heightM,
    billedAreaM2,
    isMinAreaApplied,
    baseSubtotal,
    productionBaseSubtotal,
    finishings: calculatedFinishings,
    finishingTotal,
    productionFinishingTotal,
    itemSubtotal,
    productionSubtotal,
    profitAmount,
  };
}

export function isDiscountWithinCashierLimit(
  subtotalPlusDesign: number,
  discountAmount: number,
  maxCashierDiscountPercent: number
): boolean {
  if (discountAmount <= 0) return true;
  if (subtotalPlusDesign <= 0) return false;

  const safeLimit = Math.max(0, Math.min(100, sanitizeNumber(maxCashierDiscountPercent, 0)));
  const equivalentPercent = (discountAmount / subtotalPlusDesign) * 100;

  return equivalentPercent <= safeLimit + 0.001;
}

export function calculateOrder(input: CalculateOrderInput): CalculateOrderResult {
  const calculatedItems = (input.items || []).map((item) => calculateOrderItem(item));
  const subtotal = calculatedItems.reduce((acc, curr) => acc + curr.itemSubtotal, 0);
  const totalProductionCost = calculatedItems.reduce(
    (acc, curr) => acc + curr.productionSubtotal,
    0
  );
  const designFee = sanitizePositiveInt(input.designFee, 0);
  const subtotalPlusDesign = subtotal + designFee;

  const discountType: DiscountType = input.discountType ?? "NONE";
  const rawDiscountValue = sanitizePositiveInt(input.discountValue, 0);

  let discountAmount = 0;
  let discountValue = 0;

  if (discountType === "FIXED") {
    discountValue = rawDiscountValue;
    discountAmount = Math.min(subtotalPlusDesign, discountValue);
  } else if (discountType === "PERCENT") {
    discountValue = Math.min(100, rawDiscountValue);
    discountAmount = Math.min(subtotalPlusDesign, Math.round((subtotalPlusDesign * discountValue) / 100));
  }

  const grandTotal = Math.max(0, subtotalPlusDesign - discountAmount);
  const grossProfit = grandTotal - totalProductionCost;

  const equivalentDiscountPercent =
    subtotalPlusDesign > 0 ? Math.round((discountAmount / subtotalPlusDesign) * 10000) / 100 : 0;

  const rawInitialPayment = sanitizePositiveInt(input.initialPaymentAmount, 0);
  const paymentMethod: PaymentMethod = input.paymentMethod ?? "CASH";

  let paidAmount = 0;
  let changeAmount = 0;

  if (paymentMethod === "CASH") {
    const rawCashReceived = input.cashReceived !== undefined ? sanitizePositiveInt(input.cashReceived, 0) : rawInitialPayment;
    if (rawCashReceived >= grandTotal && grandTotal > 0) {
      paidAmount = grandTotal;
      changeAmount = rawCashReceived - grandTotal;
    } else {
      paidAmount = Math.min(grandTotal, rawCashReceived);
      changeAmount = 0;
    }
  } else {
    paidAmount = Math.min(grandTotal, rawInitialPayment);
    changeAmount = 0;
  }

  const remainingAmount = Math.max(0, grandTotal - paidAmount);

  let paymentStatus: PaymentStatus = "UNPAID";
  if (grandTotal === 0) {
    paymentStatus = "PAID";
  } else if (paidAmount >= grandTotal) {
    paymentStatus = "PAID";
  } else if (paidAmount > 0) {
    paymentStatus = "PARTIAL";
  } else {
    paymentStatus = "UNPAID";
  }

  return {
    subtotal,
    designFee,
    subtotalPlusDesign,
    discountType,
    discountValue,
    discountAmount,
    equivalentDiscountPercent,
    grandTotal,
    totalProductionCost,
    grossProfit,
    paidAmount,
    remainingAmount,
    changeAmount,
    paymentStatus,
    items: calculatedItems,
  };
}
