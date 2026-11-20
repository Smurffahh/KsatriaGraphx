import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";
import { paperWidthEnum } from "./enums";

export const storeSettings = pgTable("store_settings", {
  id: integer("id").primaryKey().default(1),
  storeName: text("store_name").default("Ksatria Graphx").notNull(),
  tagline: text("tagline"),
  address: text("address"),
  phone: text("phone"),
  paymentInfo: text("payment_info"),
  receiptFooter: text("receipt_footer"),
  invoicePrefix: text("invoice_prefix").default("KGX").notNull(),
  defaultPaperWidth: paperWidthEnum("default_paper_width").default("MM_58").notNull(),
  maxCashierDiscountPercent: integer("max_cashier_discount_percent").default(10).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
