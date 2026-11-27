export type VendorPaymentStatus = "NOT_APPLICABLE" | "UNPAID" | "PARTIAL" | "PAID";

/**
 * Menurunkan status setoran modal ke vendor berdasarkan total modal produksi dan nominal yang sudah disetor.
 */
export function deriveVendorPaymentStatus(
  totalProductionCost: number,
  vendorPaidAmount: number
): VendorPaymentStatus {
  const safeCost = Math.max(0, Math.round(totalProductionCost));
  const safePaid = Math.max(0, Math.round(vendorPaidAmount));

  if (safeCost === 0) {
    return safePaid > 0 ? "PAID" : "NOT_APPLICABLE";
  }
  if (safePaid === 0) {
    return "UNPAID";
  }
  if (safePaid >= safeCost) {
    return "PAID";
  }
  return "PARTIAL";
}
