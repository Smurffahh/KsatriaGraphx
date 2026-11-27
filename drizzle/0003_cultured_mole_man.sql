ALTER TABLE "finishings" ADD COLUMN "production_price" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "product_price_tiers" ADD COLUMN "production_price" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "production_price" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "production_unit_price_snapshot" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "production_subtotal" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "profit_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "total_production_cost" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "gross_profit" integer DEFAULT 0 NOT NULL;