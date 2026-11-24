import sharp from "sharp";

export const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export type SupportedImageType = "image/jpeg" | "image/png" | "image/webp";

export class ImageValidationError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = "ImageValidationError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Mendeteksi tipe gambar berdasarkan Magic Bytes biner asli di header buffer.
 * Mencegah file teks/script/SVG/HTML yang sengaja diganti ekstensinya.
 */
export function detectMagicBytes(buffer: Buffer): SupportedImageType | null {
  if (!buffer || buffer.length < 12) {
    return null;
  }

  // 1. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // 3. WebP: RIFF (bytes 0-3) + WEBP (bytes 8-11)
  const isRiff =
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46;
  const isWebp =
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50;

  if (isRiff && isWebp) {
    return "image/webp";
  }

  return null;
}

/**
 * Memvalidasi dan memproses gambar mentah:
 * 1. Batas ukuran maksimal 2 MB (HTTP 413)
 * 2. Cek Magic Bytes biner asli (HTTP 400)
 * 3. Sanitasi & kompresi via Sharp (rotate, resize 1024x1024, WebP quality 82, strip EXIF 100%)
 */
export async function validateAndProcessImage(buffer: Buffer): Promise<{
  processedBuffer: Buffer;
  contentType: string;
  originalType: SupportedImageType;
}> {
  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    throw new ImageValidationError(
      `Ukuran file melebihi batas maksimal 2 MB (ukuran saat ini: ${(buffer.length / (1024 * 1024)).toFixed(2)} MB)`,
      413,
      "PAYLOAD_TOO_LARGE"
    );
  }

  const detectedType = detectMagicBytes(buffer);
  if (!detectedType) {
    throw new ImageValidationError(
      "Format file tidak didukung atau header tidak valid. Hanya file JPEG, PNG, dan WebP yang diizinkan.",
      400,
      "INVALID_IMAGE_TYPE"
    );
  }

  try {
    const processedBuffer = await sharp(buffer, {
      limitInputPixels: 16_000_000,
    })
      .rotate() // Menyelaraskan orientasi lalu membuang metadata EXIF orientasi
      .resize(1024, 1024, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 }) // Default Sharp tanpa .keepMetadata() otomatis membuang 100% EXIF/GPS
      .toBuffer();

    return {
      processedBuffer,
      contentType: "image/webp",
      originalType: detectedType,
    };
  } catch {
    throw new ImageValidationError(
      "Gagal memproses gambar. File gambar rusak atau tidak dapat di-decode.",
      400,
      "IMAGE_PROCESSING_FAILED"
    );
  }
}
