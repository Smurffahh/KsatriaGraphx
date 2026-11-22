import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });
import bcrypt from "bcryptjs";
import { db } from "./index";
import {
  users,
  userSessions,
  storeSettings,
} from "./schema";
import { eq } from "drizzle-orm";
import { runCatalogSeed } from "./seed-catalog";

export async function runSeed() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined in environment variables");
  }

  const ownerUsername = process.env.DEFAULT_OWNER_USERNAME || "owner";
  const ownerPassword = process.env.DEFAULT_OWNER_PASSWORD || "owner123456";
  const ownerName = process.env.DEFAULT_OWNER_NAME || "Owner Ksatria Graphx";
  const ownerEmail = process.env.DEFAULT_OWNER_EMAIL || "owner@ksatriagraphx.com";

  // Strict Single-Owner: Cek keberadaan akun role OWNER terlebih dahulu
  const [existingOwner] = await db
    .select({
      id: users.id,
      username: users.username,
      passwordHash: users.passwordHash,
      tokenVersion: users.tokenVersion,
    })
    .from(users)
    .where(eq(users.role, "OWNER"))
    .limit(1);

  if (!existingOwner) {
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
    // Jika akun OWNER sudah ada, perbarui kredensial akun OWNER tersebut tanpa membuat akun kedua
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(ownerPassword, salt);
    const nextVersion = (existingOwner.tokenVersion || 1) + 1;

    await db
      .update(users)
      .set({
        name: ownerName,
        email: ownerEmail,
        passwordHash,
        role: "OWNER",
        isActive: true,
        tokenVersion: nextVersion,
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existingOwner.id));

    await db
      .update(userSessions)
      .set({ revokedAt: new Date() })
      .where(eq(userSessions.userId, existingOwner.id));
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

  await runCatalogSeed();
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
