export type UserRole = "OWNER" | "KASIR";

export type ClientPlatform = "WEB" | "APK";

export type PricingType = "AREA" | "UNIT" | "CUSTOM";

export type AreaRounding = "EXACT" | "ROUND_UP_0_5" | "ROUND_UP_1";

export type ChargeType = "FLAT" | "PER_QTY" | "PER_AREA";

export type DiscountType = "NONE" | "FIXED" | "PERCENT";

export type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID";

export type ProductionStatus =
  | "QUEUED"
  | "IN_PROGRESS"
  | "READY"
  | "COMPLETED"
  | "CANCELLED";

export type PaymentMethod = "CASH" | "TRANSFER" | "QRIS";

export type PaperWidth = "MM_58" | "MM_80";

export interface AuthSession {
  userId: string;
  name: string;
  username: string;
  role: UserRole;
  platform: ClientPlatform;
}
