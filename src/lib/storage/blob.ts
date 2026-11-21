import { put, del } from "@vercel/blob";
import crypto from "crypto";
import { isValidVercelBlobUrl } from "@/lib/validators/product";

export { isValidVercelBlobUrl };

export interface UploadResult {
  imageUrl: string;
  imageKey: string;
}

export class MissingBlobTokenError extends Error {
  readonly code = "BLOB_TOKEN_MISSING";
  constructor() {
    super("BLOB_READ_WRITE_TOKEN belum terpasang di environment server");
    this.name = "MissingBlobTokenError";
  }
}

export class PrivateBlobStoreError extends Error {
  readonly code = "BLOB_STORE_PRIVATE";
  constructor(message?: string) {
    super(
      message ||
        "Vercel Blob Store masih bertipe Private. Ubah atau hubungkan Blob Store bertipe Public di Dashboard Vercel"
    );
    this.name = "PrivateBlobStoreError";
  }
}

function getBlobToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new MissingBlobTokenError();
  }
  return token;
}

/**
 * Mengunggah buffer WebP produk ke Vercel Blob store dengan nama UUID acak murni.
 * Anti path traversal (nama file asli dari pengguna tidak pernah dipakai).
 * Mendukung toko publik maupun toko privat (fallback otomatis).
 */
export async function uploadProductImage(webpBuffer: Buffer): Promise<UploadResult> {
  const token = getBlobToken();
  const fileKey = `products/${crypto.randomUUID()}.webp`;

  let blob;
  let isPrivate = false;

  try {
    blob = await put(fileKey, webpBuffer, {
      access: "public",
      contentType: "image/webp",
      addRandomSuffix: false,
      token,
    });
  } catch (error: any) {
    const errorMsg = String(error?.message || "");
    if (
      errorMsg.includes("Cannot use public access on a private store") ||
      errorMsg.includes("private store") ||
      errorMsg.includes("private access")
    ) {
      isPrivate = true;
      try {
        blob = await put(fileKey, webpBuffer, {
          access: "private",
          contentType: "image/webp",
          addRandomSuffix: false,
          token,
        });
      } catch (privErr: any) {
        throw new PrivateBlobStoreError(privErr?.message);
      }
    } else {
      throw error;
    }
  }

  const imageUrl = isPrivate
    ? `/api/uploads/product-image?key=${encodeURIComponent(blob.pathname)}`
    : blob.url;

  return {
    imageUrl,
    imageKey: blob.pathname,
  };
}

/**
 * Menghapus objek gambar lama dari Vercel Blob store secara aman.
 * Melindungi dari SSRF dengan memvalidasi domain URL sebelum memanggil API del().
 */
export async function deleteProductImage(imageUrl: string | null | undefined): Promise<boolean> {
  if (!imageUrl) {
    return false;
  }

  if (!isValidVercelBlobUrl(imageUrl)) {
    console.warn(`[Vercel Blob] URL gambar tidak valid atau di luar domain yang diizinkan: ${imageUrl}`);
    return false;
  }

  try {
    const token = getBlobToken();

    if (imageUrl.startsWith("/api/uploads/product-image")) {
      const url = new URL(imageUrl, "http://localhost");
      const key = url.searchParams.get("key") || url.searchParams.get("pathname");
      if (key) {
        await del(key, { token });
        return true;
      }
      return false;
    }

    await del(imageUrl, { token });
    return true;
  } catch (error) {
    console.error("[Vercel Blob] Gagal menghapus file gambar:", error);
    return false;
  }
}
