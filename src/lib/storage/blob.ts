import { put, del } from "@vercel/blob";
import crypto from "crypto";
import { isValidVercelBlobUrl } from "@/lib/validators/product";

export { isValidVercelBlobUrl };

export interface UploadResult {
  imageUrl: string;
  imageKey: string;
}

function getBlobToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN belum dikonfigurasi di environment variables"
    );
  }
  return token;
}

/**
 * Mengunggah buffer WebP produk ke Vercel Blob store dengan nama UUID acak murni.
 * Anti path traversal (nama file asli dari pengguna tidak pernah dipakai).
 */
export async function uploadProductImage(webpBuffer: Buffer): Promise<UploadResult> {
  const token = getBlobToken();
  const fileKey = `products/${crypto.randomUUID()}.webp`;

  const blob = await put(fileKey, webpBuffer, {
    access: "public",
    contentType: "image/webp",
    addRandomSuffix: false,
    token,
  });

  return {
    imageUrl: blob.url,
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
    await del(imageUrl, { token });
    return true;
  } catch (error) {
    console.error("[Vercel Blob] Gagal menghapus file gambar:", error);
    return false;
  }
}
