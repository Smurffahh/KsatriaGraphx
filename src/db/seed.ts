import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });
import bcrypt from "bcryptjs";
import { db } from "./index";
import {
  users,
  userSessions,
  storeSettings,
  categories,
  products,
  productPriceTiers,
  finishings,
} from "./schema";
import { eq } from "drizzle-orm";

export async function runSeed() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined in environment variables");
  }

  const ownerUsername = process.env.DEFAULT_OWNER_USERNAME || "owner";
  const ownerPassword = process.env.DEFAULT_OWNER_PASSWORD || "owner123456";
  const ownerName = process.env.DEFAULT_OWNER_NAME || "Owner Ksatria Graphx";
  const ownerEmail = process.env.DEFAULT_OWNER_EMAIL || "owner@ksatriagraphx.com";

  const existingOwner = await db
    .select({
      id: users.id,
      passwordHash: users.passwordHash,
      tokenVersion: users.tokenVersion,
    })
    .from(users)
    .where(eq(users.username, ownerUsername))
    .limit(1);

  if (existingOwner.length === 0) {
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(ownerPassword, salt);

    await db.insert(users).values({
      name: ownerName,
      username: ownerUsername,
      email: ownerEmail,
      passwordHash,
      role: "OWNER",
      isActive: true,
      tokenVersion: 1,
      failedLoginAttempts: 0,
    });
  } else {
    const currentOwner = existingOwner[0];
    const isPasswordMatch = await bcrypt.compare(ownerPassword, currentOwner.passwordHash);
    if (!isPasswordMatch) {
      const salt = await bcrypt.genSalt(12);
      const newHash = await bcrypt.hash(ownerPassword, salt);
      const nextVersion = (currentOwner.tokenVersion || 1) + 1;

      await db
        .update(users)
        .set({
          passwordHash: newHash,
          tokenVersion: nextVersion,
          failedLoginAttempts: 0,
          lockedUntil: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, currentOwner.id));

      await db
        .update(userSessions)
        .set({ revokedAt: new Date() })
        .where(eq(userSessions.userId, currentOwner.id));
    }
  }

  const existingSettings = await db
    .select({ id: storeSettings.id })
    .from(storeSettings)
    .where(eq(storeSettings.id, 1))
    .limit(1);

  if (existingSettings.length === 0) {
    await db.insert(storeSettings).values({
      id: 1,
      storeName: "Ksatria Graphx",
      tagline: "Percetakan, Konveksi & Merchandise Digital",
      address: "Jl. Raya Percetakan No. 45",
      phone: "081234567890",
      paymentInfo: "BCA 1234567890 a.n. Ksatria Graphx / QRIS Toko",
      receiptFooter:
        "Barang yang sudah dipesan tidak dapat dibatalkan. Terima kasih atas kepercayaan Anda!",
      invoicePrefix: "KGX",
      defaultPaperWidth: "MM_58",
      maxCashierDiscountPercent: 10,
    });
  }

  const seedCategories = [
    { name: "Banner & Spanduk", slug: "banner-spanduk", sortOrder: 1 },
    { name: "Apparel", slug: "apparel", sortOrder: 2 },
    { name: "Merchandise", slug: "merchandise", sortOrder: 3 },
    { name: "Stiker & Brosur", slug: "stiker-brosur", sortOrder: 4 },
  ];

  const categoryMap = new Map<string, string>();

  for (const cat of seedCategories) {
    const existing = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, cat.slug))
      .limit(1);

    if (existing.length === 0) {
      const [inserted] = await db.insert(categories).values(cat).returning({ id: categories.id });
      categoryMap.set(cat.slug, inserted.id);
    } else {
      categoryMap.set(cat.slug, existing[0].id);
    }
  }

  const bannerCatId = categoryMap.get("banner-spanduk")!;
  const apparelCatId = categoryMap.get("apparel")!;
  const merchCatId = categoryMap.get("merchandise")!;

  const existingBanner = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.sku, "BNR-FLX-280"))
    .limit(1);

  if (existingBanner.length === 0) {
    await db.insert(products).values([
      {
        categoryId: bannerCatId,
        sku: "BNR-FLX-280",
        name: "Banner Flexi 280gr Standard",
        description: "Bahan flexi standard untuk spanduk outdoor ekonomis",
        pricingType: "AREA",
        unitLabel: "m²",
        basePrice: 20000,
        minArea: "1.00",
        areaRounding: "EXACT",
      },
      {
        categoryId: bannerCatId,
        sku: "BNR-KRC-440",
        name: "Banner Flexi Korea (Korcin) 440gr",
        description: "Bahan tebal premium, tahan cuaca dan warna pekat",
        pricingType: "AREA",
        unitLabel: "m²",
        basePrice: 35000,
        minArea: "1.00",
        areaRounding: "EXACT",
      },
    ]);
  }

  const existingKaos = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.sku, "APP-KOS-30S"))
    .limit(1);

  if (existingKaos.length === 0) {
    const [kaos] = await db
      .insert(products)
      .values({
        categoryId: apparelCatId,
        sku: "APP-KOS-30S",
        name: "Kaos Custom Cotton Combed 30s",
        description: "Bahan katun adem sablon DTF full color",
        pricingType: "UNIT",
        unitLabel: "pcs",
        basePrice: 65000,
      })
      .returning({ id: products.id });

    await db.insert(productPriceTiers).values([
      { productId: kaos.id, minQty: 1, maxQty: 11, unitPrice: 65000 },
      { productId: kaos.id, minQty: 12, maxQty: 49, unitPrice: 55000 },
      { productId: kaos.id, minQty: 50, maxQty: null, unitPrice: 48000 },
    ]);
  }

  const existingJersey = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.sku, "APP-JRS-FLP"))
    .limit(1);

  if (existingJersey.length === 0) {
    const [jersey] = await db
      .insert(products)
      .values({
        categoryId: apparelCatId,
        sku: "APP-JRS-FLP",
        name: "Jersey Printing Sublim Fullprint",
        description: "Bahan drifit milano/brazil cetak sublimasi fullprint",
        pricingType: "UNIT",
        unitLabel: "pcs",
        basePrice: 110000,
      })
      .returning({ id: products.id });

    await db.insert(productPriceTiers).values([
      { productId: jersey.id, minQty: 1, maxQty: 11, unitPrice: 110000 },
      { productId: jersey.id, minQty: 12, maxQty: 49, unitPrice: 95000 },
      { productId: jersey.id, minQty: 50, maxQty: null, unitPrice: 85000 },
    ]);
  }

  const existingLanyard = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.sku, "MCH-LNY-2CM"))
    .limit(1);

  if (existingLanyard.length === 0) {
    const [lanyard] = await db
      .insert(products)
      .values({
        categoryId: merchCatId,
        sku: "MCH-LNY-2CM",
        name: "Tali Lanyard Tissue 2cm Print 2 Sisi",
        description: "Lanyard cetak sublimasi full color kait logam + stopper",
        pricingType: "UNIT",
        unitLabel: "pcs",
        basePrice: 18000,
      })
      .returning({ id: products.id });

    await db.insert(productPriceTiers).values([
      { productId: lanyard.id, minQty: 1, maxQty: 24, unitPrice: 18000 },
      { productId: lanyard.id, minQty: 25, maxQty: 99, unitPrice: 14000 },
      { productId: lanyard.id, minQty: 100, maxQty: null, unitPrice: 10000 },
    ]);
  }

  const defaultFinishings = [
    {
      name: "Mata Ayam (Ring Besi)",
      chargeType: "PER_QTY" as const,
      defaultPrice: 1000,
      unitLabel: "titik",
    },
    {
      name: "Selongsong / Kolong Kayu",
      chargeType: "PER_AREA" as const,
      defaultPrice: 2500,
      unitLabel: "meter",
    },
    {
      name: "Laminasi Doff / Glossy",
      chargeType: "PER_AREA" as const,
      defaultPrice: 5000,
      unitLabel: "m²",
    },
    {
      name: "Jasa Desain Standar",
      chargeType: "FLAT" as const,
      defaultPrice: 15000,
      unitLabel: "file",
    },
  ];

  for (const finishing of defaultFinishings) {
    const existing = await db
      .select({ id: finishings.id })
      .from(finishings)
      .where(eq(finishings.name, finishing.name))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(finishings).values(finishing);
    }
  }
}

if (process.argv[1]?.endsWith("seed.ts")) {
  runSeed()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
