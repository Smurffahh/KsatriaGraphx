import { isSafeHttpsDesignUrl, normalizeVendorWhatsapp } from "@/lib/validators/vendor";

export interface VendorSpkItemInput {
  productName: string;
  sku?: string | null;
  dimensionsLabel?: string | null;
  quantity: number;
  unitLabel: string;
  finishings: string[];
  itemNote?: string | null;
}

export interface VendorSpkInput {
  invoiceNumber: string;
  vendorName: string;
  targetDeadline?: string | null;
  designFileUrl?: string | null;
  additionalNote?: string | null;
  items: VendorSpkItemInput[];
}

function stripUnsafeControlChars(text: string): string {
  return text.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim();
}

/**
 * Membentuk pesan SPK produksi siap kirim ke WhatsApp vendor.
 * Kontrak antarmuka hanya menerima data teknis produksi tanpa nama/kontak pelanggan,
 * harga jual, total nota, ataupun laba/margin.
 */
export function buildVendorSpkText(input: VendorSpkInput): string {
  const invoice = stripUnsafeControlChars(input.invoiceNumber);
  const vendor = stripUnsafeControlChars(input.vendorName);
  const deadline = input.targetDeadline ? stripUnsafeControlChars(input.targetDeadline) : "";
  const extraNote = input.additionalNote ? stripUnsafeControlChars(input.additionalNote) : "";
  const designUrl =
    input.designFileUrl && isSafeHttpsDesignUrl(input.designFileUrl.trim())
      ? input.designFileUrl.trim()
      : null;

  const lines: string[] = [
    `*SPK PRODUKSI — ${invoice}*`,
    `Kepada Yth: ${vendor}`,
    "Mohon proses pekerjaan berikut:",
    "",
  ];

  input.items.forEach((item, index) => {
    const product = stripUnsafeControlChars(item.productName);
    const sku = item.sku ? ` [${stripUnsafeControlChars(item.sku)}]` : "";
    const qtyText = `${Math.max(1, Math.round(item.quantity))} ${stripUnsafeControlChars(item.unitLabel)}`;
    const dimText = item.dimensionsLabel
      ? ` — Ukuran/Dimensi: ${stripUnsafeControlChars(item.dimensionsLabel)}`
      : "";
    lines.push(`${index + 1}. ${product}${sku}`);
    lines.push(`   Jumlah: ${qtyText}${dimText}`);

    if (item.finishings.length > 0) {
      const cleanFinishings = item.finishings
        .map((f) => stripUnsafeControlChars(f))
        .filter(Boolean);
      if (cleanFinishings.length > 0) {
        lines.push(`   Finishing: ${cleanFinishings.join(", ")}`);
      }
    }

    if (item.itemNote) {
      const note = stripUnsafeControlChars(item.itemNote);
      if (note) {
        lines.push(`   Catatan item: ${note}`);
      }
    }
  });

  if (designUrl) {
    lines.push("");
    lines.push(`File Desain: ${designUrl}`);
  }

  if (deadline) {
    lines.push(`Target Selesai: ${deadline}`);
  }

  if (extraNote) {
    lines.push(`Catatan Produksi: ${extraNote}`);
  }

  lines.push("");
  lines.push("Mohon konfirmasi jika file dan spesifikasi sudah jelas. Terima kasih.");

  return lines.join("\n");
}

/**
 * Membangun URL WhatsApp `wa.me/62...` tervalidasi ketat untuk mengirim teks SPK.
 */
export function buildVendorWhatsAppUrl(whatsapp: string, text: string): string {
  const normalized = normalizeVendorWhatsapp(whatsapp);
  if (!normalized) {
    throw new Error("Nomor WhatsApp vendor tidak valid (wajib format 62...)");
  }
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}
