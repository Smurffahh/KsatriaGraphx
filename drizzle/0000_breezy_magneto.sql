CREATE TYPE "public"."area_rounding" AS ENUM('EXACT', 'ROUND_UP_0_5', 'ROUND_UP_1');--> statement-breakpoint
CREATE TYPE "public"."charge_type" AS ENUM('FLAT', 'PER_QTY', 'PER_AREA');--> statement-breakpoint
CREATE TYPE "public"."discount_type" AS ENUM('NONE', 'FIXED', 'PERCENT');--> statement-breakpoint
CREATE TYPE "public"."paper_width" AS ENUM('MM_58', 'MM_80');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('CASH', 'TRANSFER', 'QRIS');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('UNPAID', 'PARTIAL', 'PAID');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('WEB', 'APK');--> statement-breakpoint
CREATE TYPE "public"."pricing_type" AS ENUM('AREA', 'UNIT', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."production_status" AS ENUM('QUEUED', 'IN_PROGRESS', 'READY', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('OWNER', 'KASIR');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"platform" "platform" NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"username" text NOT NULL,
	"email" text,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'KASIR' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name"),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "finishings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"charge_type" charge_type NOT NULL,
	"default_price" integer NOT NULL,
	"unit_label" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_price_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"min_qty" integer NOT NULL,
	"max_qty" integer,
	"unit_price" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"sku" text,
	"name" text NOT NULL,
	"description" text,
	"pricing_type" "pricing_type" NOT NULL,
	"unit_label" text NOT NULL,
	"base_price" integer NOT NULL,
	"min_area" numeric(8, 2) DEFAULT '1.00',
	"area_rounding" "area_rounding" DEFAULT 'EXACT' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"address" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_item_finishings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_item_id" uuid NOT NULL,
	"finishing_id" uuid,
	"finishing_name_snapshot" text NOT NULL,
	"charge_type_snapshot" charge_type NOT NULL,
	"quantity" numeric(8, 2) DEFAULT '1.00' NOT NULL,
	"unit_price" integer NOT NULL,
	"subtotal" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid,
	"product_name_snapshot" text NOT NULL,
	"pricing_type_snapshot" "pricing_type" NOT NULL,
	"width_m" numeric(8, 3),
	"height_m" numeric(8, 3),
	"billed_area_m2" numeric(8, 3),
	"quantity" integer NOT NULL,
	"unit_price" integer NOT NULL,
	"finishing_total" integer DEFAULT 0 NOT NULL,
	"item_subtotal" integer NOT NULL,
	"item_notes" text
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_number" text NOT NULL,
	"customer_id" uuid,
	"customer_name_snapshot" text NOT NULL,
	"customer_phone_snapshot" text,
	"cashier_id" uuid NOT NULL,
	"source_platform" "platform" NOT NULL,
	"subtotal" integer NOT NULL,
	"design_fee" integer DEFAULT 0 NOT NULL,
	"discount_type" "discount_type" DEFAULT 'NONE' NOT NULL,
	"discount_value" integer DEFAULT 0 NOT NULL,
	"discount_amount" integer DEFAULT 0 NOT NULL,
	"grand_total" integer NOT NULL,
	"paid_amount" integer DEFAULT 0 NOT NULL,
	"remaining_amount" integer DEFAULT 0 NOT NULL,
	"payment_status" "payment_status" DEFAULT 'UNPAID' NOT NULL,
	"production_status" "production_status" DEFAULT 'QUEUED' NOT NULL,
	"estimated_ready_at" timestamp with time zone,
	"notes" text,
	"cancel_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"received_by_user_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"cash_received" integer,
	"change_amount" integer DEFAULT 0 NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"reference_note" text,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"store_name" text DEFAULT 'Ksatria Graphx' NOT NULL,
	"tagline" text,
	"address" text,
	"phone" text,
	"payment_info" text,
	"receipt_footer" text,
	"invoice_prefix" text DEFAULT 'KGX' NOT NULL,
	"default_paper_width" "paper_width" DEFAULT 'MM_58' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_price_tiers" ADD CONSTRAINT "product_price_tiers_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_finishings" ADD CONSTRAINT "order_item_finishings_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_finishings" ADD CONSTRAINT "order_item_finishings_finishing_id_finishings_id_fk" FOREIGN KEY ("finishing_id") REFERENCES "public"."finishings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_cashier_id_users_id_fk" FOREIGN KEY ("cashier_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_received_by_user_id_users_id_fk" FOREIGN KEY ("received_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customers_phone_idx" ON "customers" USING btree ("phone");