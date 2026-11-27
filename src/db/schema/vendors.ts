import { pgTable, uuid, text, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";

export const vendors = pgTable(
  "vendors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    contactName: text("contact_name"),
    whatsapp: text("whatsapp").notNull(),
    address: text("address"),
    specialty: text("specialty"),
    leadTimeDays: integer("lead_time_days").default(1).notNull(),
    notes: text("notes"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("vendors_is_active_idx").on(table.isActive),
    index("vendors_name_idx").on(table.name),
  ]
);
