import { pgTable, uuid, text, integer, boolean, timestamp, numeric, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { pricingTypeEnum, areaRoundingEnum, chargeTypeEnum } from "./enums";
import { vendors } from "./vendors";

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    categoryId: uuid("category_id")
      .references(() => categories.id, { onDelete: "restrict" })
      .notNull(),
    defaultVendorId: uuid("default_vendor_id").references(() => vendors.id, {
      onDelete: "set null",
    }),
    sku: text("sku").unique(),
    name: text("name").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    imageKey: text("image_key"),
    pricingType: pricingTypeEnum("pricing_type").notNull(),
    unitLabel: text("unit_label").notNull(),
    productionPrice: integer("production_price").default(0).notNull(),
    basePrice: integer("base_price").notNull(),
    minArea: numeric("min_area", { precision: 8, scale: 2 }).default("1.00"),
    areaRounding: areaRoundingEnum("area_rounding").default("EXACT").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("products_default_vendor_idx").on(table.defaultVendorId)]
);

export const productPriceTiers = pgTable("product_price_tiers", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id")
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
  minQty: integer("min_qty").notNull(),
  maxQty: integer("max_qty"),
  productionPrice: integer("production_price"),
  unitPrice: integer("unit_price").notNull(),
});

export const finishings = pgTable("finishings", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  chargeType: chargeTypeEnum("charge_type").notNull(),
  productionPrice: integer("production_price").default(0).notNull(),
  defaultPrice: integer("default_price").notNull(),
  unitLabel: text("unit_label").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  defaultVendor: one(vendors, {
    fields: [products.defaultVendorId],
    references: [vendors.id],
  }),
  priceTiers: many(productPriceTiers),
}));

export const productPriceTiersRelations = relations(productPriceTiers, ({ one }) => ({
  product: one(products, {
    fields: [productPriceTiers.productId],
    references: [products.id],
  }),
}));
