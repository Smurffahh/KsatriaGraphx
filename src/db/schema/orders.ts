import { pgTable, uuid, text, integer, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  platformEnum,
  pricingTypeEnum,
  chargeTypeEnum,
  discountTypeEnum,
  paymentStatusEnum,
  productionStatusEnum,
  paymentMethodEnum,
} from "./enums";
import { users } from "./users";
import { customers } from "./customers";
import { products, finishings } from "./catalog";

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
  customerNameSnapshot: text("customer_name_snapshot").notNull(),
  customerPhoneSnapshot: text("customer_phone_snapshot"),
  cashierId: uuid("cashier_id")
    .references(() => users.id, { onDelete: "restrict" })
    .notNull(),
  sourcePlatform: platformEnum("source_platform").notNull(),
  subtotal: integer("subtotal").notNull(),
  designFee: integer("design_fee").default(0).notNull(),
  discountType: discountTypeEnum("discount_type").default("NONE").notNull(),
  discountValue: integer("discount_value").default(0).notNull(),
  discountAmount: integer("discount_amount").default(0).notNull(),
  grandTotal: integer("grand_total").notNull(),
  paidAmount: integer("paid_amount").default(0).notNull(),
  remainingAmount: integer("remaining_amount").default(0).notNull(),
  paymentStatus: paymentStatusEnum("payment_status").default("UNPAID").notNull(),
  productionStatus: productionStatusEnum("production_status").default("QUEUED").notNull(),
  estimatedReadyAt: timestamp("estimated_ready_at", { withTimezone: true }),
  notes: text("notes"),
  cancelReason: text("cancel_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .references(() => orders.id, { onDelete: "cascade" })
    .notNull(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  productNameSnapshot: text("product_name_snapshot").notNull(),
  pricingTypeSnapshot: pricingTypeEnum("pricing_type_snapshot").notNull(),
  widthM: numeric("width_m", { precision: 8, scale: 3 }),
  heightM: numeric("height_m", { precision: 8, scale: 3 }),
  billedAreaM2: numeric("billed_area_m2", { precision: 8, scale: 3 }),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(),
  isPriceOverridden: boolean("is_price_overridden").default(false).notNull(),
  finishingTotal: integer("finishing_total").default(0).notNull(),
  itemSubtotal: integer("item_subtotal").notNull(),
  itemNotes: text("item_notes"),
});

export const orderItemFinishings = pgTable("order_item_finishings", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderItemId: uuid("order_item_id")
    .references(() => orderItems.id, { onDelete: "cascade" })
    .notNull(),
  finishingId: uuid("finishing_id").references(() => finishings.id, { onDelete: "set null" }),
  finishingNameSnapshot: text("finishing_name_snapshot").notNull(),
  chargeTypeSnapshot: chargeTypeEnum("charge_type_snapshot").notNull(),
  quantity: numeric("quantity", { precision: 8, scale: 2 }).default("1.00").notNull(),
  unitPrice: integer("unit_price").notNull(),
  subtotal: integer("subtotal").notNull(),
});

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .references(() => orders.id, { onDelete: "cascade" })
    .notNull(),
  receivedByUserId: uuid("received_by_user_id")
    .references(() => users.id, { onDelete: "restrict" })
    .notNull(),
  amount: integer("amount").notNull(),
  cashReceived: integer("cash_received"),
  changeAmount: integer("change_amount").default(0).notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  referenceNote: text("reference_note"),
  paidAt: timestamp("paid_at", { withTimezone: true }).defaultNow().notNull(),
});

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  cashier: one(users, {
    fields: [orders.cashierId],
    references: [users.id],
  }),
  items: many(orderItems),
  payments: many(payments),
}));

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  finishings: many(orderItemFinishings),
}));

export const orderItemFinishingsRelations = relations(orderItemFinishings, ({ one }) => ({
  orderItem: one(orderItems, {
    fields: [orderItemFinishings.orderItemId],
    references: [orderItems.id],
  }),
  finishing: one(finishings, {
    fields: [orderItemFinishings.finishingId],
    references: [finishings.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
  receivedByUser: one(users, {
    fields: [payments.receivedByUserId],
    references: [users.id],
  }),
}));
