import { normalizeIndonesianPhone } from "@/lib/validators/customer";
import { isNativeApp } from "@/lib/platform";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

export interface ReceiptOrderData {
  invoiceNumber: string;
  createdAt: string;
  customerNameSnapshot: string;
  customerPhoneSnapshot: string | null;
  cashierName?: string;
  subtotal: number;
  designFee?: number;
  discountAmount?: number;
  grandTotal: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: string;
  productionStatus?: string;
  notes?: string | null;
  items: Array<{
    productNameSnapshot: string;
    pricingTypeSnapshot?: string;
    widthM?: string | number | null;
    heightM?: string | number | null;
    quantity: number;
    unitPrice: number;
    finishingTotal?: number;
    itemSubtotal: number;
    finishings?: Array<{
      finishingNameSnapshot: string;
      quantity?: string | number;
      subtotal: number;
    }>;
  }>;
}

export interface ReceiptStoreSettings {
  storeName: string;
  tagline?: string | null;
  address?: string | null;
  phone?: string | null;
  paymentInfo?: string | null;
  receiptFooter?: string | null;
}

/**
 * Membentuk teks ringkasan nota penjualan yang rapi untuk pesan WhatsApp.
 */
export function buildWhatsAppReceiptText(
  order: ReceiptOrderData,
  store: ReceiptStoreSettings = { storeName: "Ksatria Graphx" }
): string {
  const storeName = store?.storeName || "Ksatria Graphx";
  const dateStr = new Date(order.createdAt).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const statusLabel =
    order.paymentStatus === "PAID"
      ? "LUNAS"
      : order.paymentStatus === "PARTIAL"
      ? "PANJAR"
      : "BELUM BAYAR";

  const lines: string[] = [
    `*${storeName.toUpperCase()}*`,
    store.tagline ? `_${store.tagline}_` : "",
    store.address ? store.address : "",
    store.phone ? `Telp/WA: ${store.phone}` : "",
    "================================",
    `*No. Nota:* ${order.invoiceNumber}`,
    `*Tanggal :* ${dateStr}`,
    `*Pelanggan:* ${order.customerNameSnapshot}`,
    order.cashierName ? `*Kasir    :* ${order.cashierName}` : "",
    "================================",
    "*RINCIAN PESANAN:*",
  ].filter(Boolean);

  order.items.forEach((item, idx) => {
    let sizeStr = "";
    if (item.widthM && item.heightM) {
      sizeStr = ` (${item.widthM}m x ${item.heightM}m)`;
    }
    lines.push(
      `${idx + 1}. *${item.productNameSnapshot}*${sizeStr}`,
      `   ${item.quantity} x Rp ${item.unitPrice.toLocaleString("id-ID")} = Rp ${item.itemSubtotal.toLocaleString("id-ID")}`
    );

    if (item.finishings && item.finishings.length > 0) {
      item.finishings.forEach((f) => {
        lines.push(`   + Finishing: ${f.finishingNameSnapshot} (Rp ${f.subtotal.toLocaleString("id-ID")})`);
      });
    }
  });

  lines.push("--------------------------------");
  lines.push(`Subtotal     : Rp ${order.subtotal.toLocaleString("id-ID")}`);

  if (order.designFee && order.designFee > 0) {
    lines.push(`Biaya Desain : Rp ${order.designFee.toLocaleString("id-ID")}`);
  }

  if (order.discountAmount && order.discountAmount > 0) {
    lines.push(`Diskon       : -Rp ${order.discountAmount.toLocaleString("id-ID")}`);
  }

  lines.push(`*GRAND TOTAL  : Rp ${order.grandTotal.toLocaleString("id-ID")}*`);
  lines.push(`Total Dibayar: Rp ${order.paidAmount.toLocaleString("id-ID")}`);

  if (order.remainingAmount > 0) {
    lines.push(`*Sisa Piutang: Rp ${order.remainingAmount.toLocaleString("id-ID")}*`);
  }

  lines.push(`Status Bayar : *${statusLabel}*`);

  if (store?.paymentInfo) {
    lines.push("--------------------------------");
    lines.push(`*Info Pembayaran:*\n${store.paymentInfo}`);
  }

  if (store?.receiptFooter) {
    lines.push("--------------------------------");
    lines.push(store.receiptFooter);
  } else {
    lines.push("--------------------------------");
    lines.push("Terima kasih telah mempercayakan cetakan Anda kepada kami!");
  }

  return lines.join("\n");
}

/**
 * Menghasilkan URL pesan WhatsApp langsung ke nomor pelanggan (protokol https://wa.me).
 */
export function buildWhatsAppReceiptUrl(
  phone: string | null | undefined,
  order: ReceiptOrderData,
  store: ReceiptStoreSettings = { storeName: "Ksatria Graphx" }
): string {
  const normalizedPhone = phone ? normalizeIndonesianPhone(phone) : null;
  const targetPhone = normalizedPhone || "";
  const text = buildWhatsAppReceiptText(order, store);
  const encodedText = encodeURIComponent(text);

  if (targetPhone) {
    return `https://wa.me/${targetPhone}?text=${encodedText}`;
  }
  return `https://wa.me/?text=${encodedText}`;
}

/**
 * Mengekspor elemen struk nota menjadi file gambar PNG menggunakan Canvas 2D deterministik.
 * Bebas dari library eksternal yang rentan CORS / CSP / font-loading bug.
 */
export function exportReceiptAsPng(
  order: ReceiptOrderData,
  store: ReceiptStoreSettings,
  paperWidth: "58mm" | "80mm" = "58mm"
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const is58 = paperWidth === "58mm";
      const canvasWidth = is58 ? 384 : 576; // Resolusi thermal printer 203 DPI
      const padding = 16;
      const contentWidth = canvasWidth - padding * 2;

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Canvas 2D context tidak tersedia");
      }

      // Hitung baris teks terlebih dahulu untuk menentukan tinggi canvas dinamis
      const lines: { text: string; align?: "left" | "center" | "right"; bold?: boolean; fontScale?: number }[] = [];

      lines.push({ text: (store.storeName || "KSATRIA GRAPHX").toUpperCase(), align: "center", bold: true, fontScale: 1.25 });
      if (store.tagline) lines.push({ text: store.tagline, align: "center" });
      if (store.address) lines.push({ text: store.address, align: "center" });
      if (store.phone) lines.push({ text: `WA: ${store.phone}`, align: "center" });
      lines.push({ text: "=".repeat(is58 ? 32 : 48), align: "center" });

      const dateStr = new Date(order.createdAt).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      lines.push({ text: `No. Nota : ${order.invoiceNumber}`, align: "left" });
      lines.push({ text: `Tanggal  : ${dateStr}`, align: "left" });
      lines.push({ text: `Pelanggan: ${order.customerNameSnapshot}`, align: "left" });
      if (order.cashierName) lines.push({ text: `Kasir    : ${order.cashierName}`, align: "left" });
      lines.push({ text: "-".repeat(is58 ? 32 : 48), align: "center" });

      order.items.forEach((item, idx) => {
        lines.push({ text: `${idx + 1}. ${item.productNameSnapshot}`, align: "left", bold: true });
        if (item.widthM && item.heightM) {
          lines.push({ text: `   Ukuran: ${item.widthM}m x ${item.heightM}m`, align: "left" });
        }
        lines.push({
          text: `   ${item.quantity} x Rp ${item.unitPrice.toLocaleString("id-ID")}`,
          align: "left",
        });
        lines.push({
          text: `Rp ${item.itemSubtotal.toLocaleString("id-ID")}`,
          align: "right",
          bold: true,
        });

        if (item.finishings) {
          item.finishings.forEach((f) => {
            lines.push({ text: `   + ${f.finishingNameSnapshot} (Rp ${f.subtotal.toLocaleString("id-ID")})`, align: "left" });
          });
        }
      });

      lines.push({ text: "-".repeat(is58 ? 32 : 48), align: "center" });
      lines.push({ text: `Subtotal: Rp ${order.subtotal.toLocaleString("id-ID")}`, align: "right" });
      if (order.designFee && order.designFee > 0) {
        lines.push({ text: `Biaya Desain: Rp ${order.designFee.toLocaleString("id-ID")}`, align: "right" });
      }
      if (order.discountAmount && order.discountAmount > 0) {
        lines.push({ text: `Diskon: -Rp ${order.discountAmount.toLocaleString("id-ID")}`, align: "right" });
      }
      lines.push({ text: `GRAND TOTAL: Rp ${order.grandTotal.toLocaleString("id-ID")}`, align: "right", bold: true, fontScale: 1.15 });
      lines.push({ text: `Dibayar    : Rp ${order.paidAmount.toLocaleString("id-ID")}`, align: "right" });
      if (order.remainingAmount > 0) {
        lines.push({ text: `Sisa Bayar : Rp ${order.remainingAmount.toLocaleString("id-ID")}`, align: "right", bold: true });
      }
      lines.push({ text: `Status: [${order.paymentStatus}]`, align: "center", bold: true });

      if (store.receiptFooter) {
        lines.push({ text: "=".repeat(is58 ? 32 : 48), align: "center" });
        lines.push({ text: store.receiptFooter, align: "center" });
      }

      const lineHeight = 18;
      const totalHeight = padding * 2 + lines.length * lineHeight + 40;

      canvas.width = canvasWidth;
      canvas.height = totalHeight;

      // Background putih
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#000000";
      let currentY = padding + 14;

      lines.forEach((line) => {
        const fontSize = Math.round(12 * (line.fontScale || 1));
        ctx.font = `${line.bold ? "bold " : ""}${fontSize}px monospace, Courier, monospace`;
        ctx.textAlign = line.align || "left";

        let posX = padding;
        if (line.align === "center") {
          posX = canvasWidth / 2;
        } else if (line.align === "right") {
          posX = canvasWidth - padding;
        }

        ctx.fillText(line.text, posX, currentY, contentWidth);
        currentY += lineHeight;
      });

      // Buat file unduhan
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Gagal membuat gambar PNG"));
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `nota-${order.invoiceNumber}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        resolve();
      }, "image/png");
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Membagikan struk nota di Android secara native (mengirim gambar PNG langsung ke WhatsApp / aplikasi lain).
 * Pada browser Web, otomatis fallback ke pengunduhan file gambar PNG.
 */
export async function shareReceiptNative(
  order: ReceiptOrderData,
  store: ReceiptStoreSettings,
  paperWidth: "58mm" | "80mm" = "58mm"
): Promise<void> {
  if (!isNativeApp()) {
    return exportReceiptAsPng(order, store, paperWidth);
  }

  try {
    const is58 = paperWidth === "58mm";
    const canvasWidth = is58 ? 384 : 576;
    const padding = 16;
    const contentWidth = canvasWidth - padding * 2;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas context tidak tersedia");
    }

    const lines: { text: string; align?: "left" | "center" | "right"; bold?: boolean; fontScale?: number }[] = [];
    lines.push({ text: (store.storeName || "KSATRIA GRAPHX").toUpperCase(), align: "center", bold: true, fontScale: 1.25 });
    if (store.tagline) lines.push({ text: store.tagline, align: "center" });
    if (store.address) lines.push({ text: store.address, align: "center" });
    if (store.phone) lines.push({ text: `WA: ${store.phone}`, align: "center" });
    lines.push({ text: "=".repeat(is58 ? 32 : 48), align: "center" });

    const dateStr = new Date(order.createdAt).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    lines.push({ text: `No. Nota : ${order.invoiceNumber}`, align: "left" });
    lines.push({ text: `Tanggal  : ${dateStr}`, align: "left" });
    lines.push({ text: `Pelanggan: ${order.customerNameSnapshot}`, align: "left" });
    if (order.cashierName) lines.push({ text: `Kasir    : ${order.cashierName}`, align: "left" });
    lines.push({ text: "-".repeat(is58 ? 32 : 48), align: "center" });

    order.items.forEach((item, idx) => {
      lines.push({ text: `${idx + 1}. ${item.productNameSnapshot}`, align: "left", bold: true });
      if (item.widthM && item.heightM) {
        lines.push({ text: `   Ukuran: ${item.widthM}m x ${item.heightM}m`, align: "left" });
      }
      lines.push({
        text: `   ${item.quantity} x Rp ${item.unitPrice.toLocaleString("id-ID")}`,
        align: "left",
      });
      lines.push({
        text: `Rp ${item.itemSubtotal.toLocaleString("id-ID")}`,
        align: "right",
        bold: true,
      });

      if (item.finishings) {
        item.finishings.forEach((f) => {
          lines.push({ text: `   + ${f.finishingNameSnapshot} (Rp ${f.subtotal.toLocaleString("id-ID")})`, align: "left" });
        });
      }
    });

    lines.push({ text: "-".repeat(is58 ? 32 : 48), align: "center" });
    lines.push({ text: `Subtotal: Rp ${order.subtotal.toLocaleString("id-ID")}`, align: "right" });
    if (order.designFee && order.designFee > 0) {
      lines.push({ text: `Biaya Desain: Rp ${order.designFee.toLocaleString("id-ID")}`, align: "right" });
    }
    if (order.discountAmount && order.discountAmount > 0) {
      lines.push({ text: `Diskon: -Rp ${order.discountAmount.toLocaleString("id-ID")}`, align: "right" });
    }
    lines.push({ text: `GRAND TOTAL: Rp ${order.grandTotal.toLocaleString("id-ID")}`, align: "right", bold: true, fontScale: 1.15 });
    lines.push({ text: `Dibayar    : Rp ${order.paidAmount.toLocaleString("id-ID")}`, align: "right" });
    if (order.remainingAmount > 0) {
      lines.push({ text: `Sisa Bayar : Rp ${order.remainingAmount.toLocaleString("id-ID")}`, align: "right", bold: true });
    }
    lines.push({ text: `Status: [${order.paymentStatus}]`, align: "center", bold: true });

    if (store.receiptFooter) {
      lines.push({ text: "=".repeat(is58 ? 32 : 48), align: "center" });
      lines.push({ text: store.receiptFooter, align: "center" });
    }

    const lineHeight = 18;
    const totalHeight = padding * 2 + lines.length * lineHeight + 40;

    canvas.width = canvasWidth;
    canvas.height = totalHeight;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#000000";
    let currentY = padding + 14;

    lines.forEach((line) => {
      const fontSize = Math.round(12 * (line.fontScale || 1));
      ctx.font = `${line.bold ? "bold " : ""}${fontSize}px monospace, Courier, monospace`;
      ctx.textAlign = line.align || "left";

      let posX = padding;
      if (line.align === "center") {
        posX = canvasWidth / 2;
      } else if (line.align === "right") {
        posX = canvasWidth - padding;
      }

      ctx.fillText(line.text, posX, currentY, contentWidth);
      currentY += lineHeight;
    });

    const dataUrl = canvas.toDataURL("image/png");
    const base64Data = dataUrl.split(",")[1];
    const fileName = `nota-${order.invoiceNumber}.png`;

    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Cache,
    });

    await Share.share({
      title: `Nota ${order.invoiceNumber}`,
      text: buildWhatsAppReceiptText(order, store),
      url: savedFile.uri,
      dialogTitle: "Bagikan Nota Pesanan",
    });
  } catch (err) {
    console.warn("[Share] Native share gagal, fallback ke download PNG:", err);
    await exportReceiptAsPng(order, store, paperWidth);
  }
}
