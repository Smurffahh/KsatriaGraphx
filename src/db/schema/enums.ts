import { pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["OWNER", "KASIR"]);
export const platformEnum = pgEnum("platform", ["WEB", "APK"]);
export const pricingTypeEnum = pgEnum("pricing_type", ["AREA", "UNIT", "CUSTOM"]);
export const areaRoundingEnum = pgEnum("area_rounding", ["EXACT", "ROUND_UP_0_5", "ROUND_UP_1"]);
export const chargeTypeEnum = pgEnum("charge_type", ["FLAT", "PER_QTY", "PER_AREA"]);
export const discountTypeEnum = pgEnum("discount_type", ["NONE", "FIXED", "PERCENT"]);
export const paymentStatusEnum = pgEnum("payment_status", ["UNPAID", "PARTIAL", "PAID"]);
export const productionStatusEnum = pgEnum("production_status", [
  "QUEUED",
  "IN_PROGRESS",
  "READY",
  "COMPLETED",
  "CANCELLED",
]);
export const paymentMethodEnum = pgEnum("payment_method", ["CASH", "TRANSFER", "QRIS"]);
export const paperWidthEnum = pgEnum("paper_width", ["MM_58", "MM_80"]);
