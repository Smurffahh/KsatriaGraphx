import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { eq, or } from "drizzle-orm";
import { db } from "./index";
import { categories, products, productPriceTiers, finishings } from "./schema";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_PRODUCTS,
  DEFAULT_FINISHINGS,
} from "./catalog-defaults";

export interface SeedCatalogResult {
  categoriesInserted: number;
  categoriesSkipped: number;
  productsInserted: number;
  productsSkipped: number;
  tiersInserted: number;
  finishingsInserted: number;
  finishingsSkipped: number;
}

export async function runCatalogSeed(): Promise<SeedCatalogResult> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined in environment variables");
  }

  const result: SeedCatalogResult = {
    categoriesInserted: 0,
    categoriesSkipped: 0,
    productsInserted: 0,
    productsSkipped: 0,
    tiersInserted: 0,
    finishingsInserted: 0,
    finishingsSkipped: 0,
  };

  const categoryMap = new Map<string, string>();

  // 1. Sinkronisasi Kategori (Idempotent)
  for (const cat of DEFAULT_CATEGORIES) {
    const existing = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, cat.slug))
      .limit(1);

    if (existing.length === 0) {
      const [inserted] = await db
        .insert(categories)
        .values({
          name: cat.name,
          slug: cat.slug,
          sortOrder: cat.sortOrder,
          isActive: true,
        })
        .returning({ id: categories.id });

      categoryMap.set(cat.slug, inserted.id);
      result.categoriesInserted++;
    } else {
      categoryMap.set(cat.slug, existing[0].id);
      result.categoriesSkipped++;
    }
  }

  // Ambil seluruh kategori yang tersimpan jika ada slug yang belum terpetakan
  const allDbCategories = await db.select({ id: categories.id, slug: categories.slug }).from(categories);
  for (const c of allDbCategories) {
    if (!categoryMap.has(c.slug)) {
      categoryMap.set(c.slug, c.id);
    }
  }

  // 2. Sinkronisasi Produk & Tiers (Non-Destructive, Skip jika sudah ada)
  for (const prod of DEFAULT_PRODUCTS) {
    const categoryId = categoryMap.get(prod.categorySlug);
    if (!categoryId) {
      console.warn(`[WARN] Kategori slug '${prod.categorySlug}' tidak ditemukan. Melewati produk ${prod.name}`);
      continue;
    }

    const conditions = [eq(products.name, prod.name)];
    if (prod.sku) {
      conditions.push(eq(products.sku, prod.sku));
    }

    const existing = await db
      .select({ id: products.id })
      .from(products)
      .where(or(...conditions))
      .limit(1);

    if (existing.length > 0) {
      result.productsSkipped++;
      continue;
    }

    // Insert produk dan tiers dalam transaksi atomik
    await db.transaction(async (tx) => {
      const [insertedProd] = await tx
        .insert(products)
        .values({
          categoryId,
          sku: prod.sku,
          name: prod.name,
          description: prod.description,
          pricingType: prod.pricingType,
          unitLabel: prod.unitLabel,
          basePrice: prod.basePrice,
          minArea: prod.minArea ?? "1.00",
          areaRounding: prod.areaRounding ?? "EXACT",
          isActive: true,
        })
        .returning({ id: products.id });

      if (prod.tiers && prod.tiers.length > 0) {
        await tx.insert(productPriceTiers).values(
          prod.tiers.map((tier) => ({
            productId: insertedProd.id,
            minQty: tier.minQty,
            maxQty: tier.maxQty ?? null,
            unitPrice: tier.unitPrice,
          }))
        );
        result.tiersInserted += prod.tiers.length;
      }
    });

    result.productsInserted++;
  }

  // 3. Sinkronisasi Finishing (Non-Destructive, Skip jika sudah ada)
  for (const fin of DEFAULT_FINISHINGS) {
    const existing = await db
      .select({ id: finishings.id })
      .from(finishings)
      .where(eq(finishings.name, fin.name))
      .limit(1);

    if (existing.length > 0) {
      result.finishingsSkipped++;
      continue;
    }

    await db.insert(finishings).values({
      name: fin.name,
      chargeType: fin.chargeType,
      defaultPrice: fin.defaultPrice,
      unitLabel: fin.unitLabel,
      isActive: true,
    });

    result.finishingsInserted++;
  }

  return result;
}

if (process.argv[1]?.endsWith("seed-catalog.ts")) {
  console.log("=== MEMULAI SEED KATALOG AMAN (NON-DESTRUCTIVE) ===");
  runCatalogSeed()
    .then((res) => {
      console.log("\n=== HASIL EKSEKUSI SEED KATALOG ===");
      console.log(`• Kategori   : ${res.categoriesInserted} ditambahkan, ${res.categoriesSkipped} dilewati (sudah ada)`);
      console.log(`• Produk     : ${res.productsInserted} ditambahkan, ${res.productsSkipped} dilewati (sudah ada)`);
      console.log(`• Price Tiers: ${res.tiersInserted} baris tier ditambahkan`);
      console.log(`• Finishing  : ${res.finishingsInserted} ditambahkan, ${res.finishingsSkipped} dilewati (sudah ada)`);
      console.log("\nStatus: SELESAI DENGAN AMAN 100%");
      process.exit(0);
    })
    .catch((err) => {
      console.error("[ERROR] Gagal menjalankan seed katalog:", err?.message || err);
      process.exit(1);
    });
}
