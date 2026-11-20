import type { ReceiptOrderData, ReceiptStoreSettings } from "./share";

export type EscPosPaperWidth = "58mm" | "80mm";

// ESC/POS Command Constants
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

const CMD_INIT = [ESC, 0x40]; // ESC @
const CMD_ALIGN_LEFT = [ESC, 0x61, 0x00]; // ESC a 0
const CMD_ALIGN_CENTER = [ESC, 0x61, 0x01]; // ESC a 1
const CMD_ALIGN_RIGHT = [ESC, 0x61, 0x02]; // ESC a 2
const CMD_BOLD_ON = [ESC, 0x45, 0x01]; // ESC E 1
const CMD_BOLD_OFF = [ESC, 0x45, 0x00]; // ESC E 0
const CMD_DOUBLE_HEIGHT_ON = [GS, 0x21, 0x01]; // GS ! 1
const CMD_DOUBLE_HEIGHT_OFF = [GS, 0x21, 0x00]; // GS ! 0
const CMD_CUT_PARTIAL = [GS, 0x56, 0x42, 0x00]; // GS V B 0

/**
 * Membersihkan string dari karakter non-ASCII, simbol matematika, dan emoji
 * agar tidak merusak encoding printer thermal.
 */
export function sanitizeAscii(text: string | null | undefined): string {
  if (!text) return "";

  return text
    .replace(/[×✕]/g, "x")
    .replace(/m²/g, "m2")
    .replace(/m³/g, "m3")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7E\n]/g, "") // Hanya ASCII printable dan newline
    .trim();
}

/**
 * Membungkus teks panjang menjadi array baris dengan batas lebar karakter tertentu.
 */
export function wrapText(text: string, maxWidth: number): string[] {
  const sanitized = sanitizeAscii(text);
  if (!sanitized) return [];

  const words = sanitized.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + (currentLine ? " " : "") + word).length <= maxWidth) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      if (currentLine) lines.push(currentLine);
      if (word.length > maxWidth) {
        // Potong kata yang lebih panjang dari lebar baris
        let remaining = word;
        while (remaining.length > maxWidth) {
          lines.push(remaining.slice(0, maxWidth));
          remaining = remaining.slice(maxWidth);
        }
        currentLine = remaining;
      } else {
        currentLine = word;
      }
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Membentuk baris 2 kolom rata kiri dan kanan (misal label vs harga) yang pas dengan lebar baris.
 */
export function formatTwoColumns(left: string, right: string, width: number): string {
  const cleanLeft = sanitizeAscii(left);
  const cleanRight = sanitizeAscii(right);

  const availableSpace = width - cleanRight.length;
  if (availableSpace <= 0) {
    return `${cleanLeft.slice(0, Math.max(0, width - cleanRight.length - 1))} ${cleanRight}`;
  }

  if (cleanLeft.length <= availableSpace) {
    const spaces = " ".repeat(width - cleanLeft.length - cleanRight.length);
    return `${cleanLeft}${spaces}${cleanRight}`;
  }

  // Jika teks kiri terlalu panjang, bungkus teks kiri
  const wrappedLeft = wrapText(cleanLeft, availableSpace - 1);
  const lastLineLeft = wrappedLeft[wrappedLeft.length - 1];
  const spaces = " ".repeat(Math.max(1, width - lastLineLeft.length - cleanRight.length));
  
  wrappedLeft[wrappedLeft.length - 1] = `${lastLineLeft}${spaces}${cleanRight}`;
  return wrappedLeft.join("\n");
}

export class EscPosBuilder {
  private buffer: number[] = [];
  private readonly width: number;

  constructor(paperWidth: EscPosPaperWidth = "58mm") {
    this.width = paperWidth === "80mm" ? 48 : 32;
    this.addBytes(CMD_INIT);
  }

  public getColumnWidth(): number {
    return this.width;
  }

  private addBytes(bytes: number[]): this {
    this.buffer.push(...bytes);
    return this;
  }

  private addText(text: string): this {
    const clean = sanitizeAscii(text);
    for (let i = 0; i < clean.length; i++) {
      this.buffer.push(clean.charCodeAt(i));
    }
    return this;
  }

  public alignLeft(): this {
    return this.addBytes(CMD_ALIGN_LEFT);
  }

  public alignCenter(): this {
    return this.addBytes(CMD_ALIGN_CENTER);
  }

  public alignRight(): this {
    return this.addBytes(CMD_ALIGN_RIGHT);
  }

  public bold(enable: boolean = true): this {
    return this.addBytes(enable ? CMD_BOLD_ON : CMD_BOLD_OFF);
  }

  public doubleHeight(enable: boolean = true): this {
    return this.addBytes(enable ? CMD_DOUBLE_HEIGHT_ON : CMD_DOUBLE_HEIGHT_OFF);
  }

  public feed(lines: number = 1): this {
    for (let i = 0; i < lines; i++) {
      this.buffer.push(LF);
    }
    return this;
  }

  public line(text: string = ""): this {
    if (text) {
      this.addText(text);
    }
    return this.feed(1);
  }

  public divider(char: "-" | "=" = "-"): this {
    return this.line(char.repeat(this.width));
  }

  public twoColumns(left: string, right: string): this {
    const formatted = formatTwoColumns(left, right, this.width);
    const lines = formatted.split("\n");
    for (const l of lines) {
      this.line(l);
    }
    return this;
  }

  public cut(): this {
    this.feed(3);
    this.addBytes(CMD_CUT_PARTIAL);
    return this;
  }

  public build(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

/**
 * Mengonversi data pesanan dan profil toko menjadi byte stream standar ESC/POS.
 */
export function generateEscPosReceipt(
  order: ReceiptOrderData,
  store: ReceiptStoreSettings,
  paperWidth: EscPosPaperWidth = "58mm"
): Uint8Array {
  const builder = new EscPosBuilder(paperWidth);
  const width = builder.getColumnWidth();

  // 1. Header Toko
  builder.alignCenter();
  builder.bold(true).doubleHeight(true).line(store.storeName || "Ksatria Graphx");
  builder.doubleHeight(false).bold(false);

  if (store.tagline) {
    builder.line(store.tagline);
  }
  if (store.address) {
    const addressLines = wrapText(store.address, width);
    addressLines.forEach((l) => builder.line(l));
  }
  if (store.phone) {
    builder.line(`Telp/WA: ${store.phone}`);
  }

  builder.divider("=");

  // 2. Info Nota
  builder.alignLeft();
  builder.twoColumns("No. Nota:", order.invoiceNumber);

  const dateStr = new Date(order.createdAt).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  builder.twoColumns("Tanggal :", dateStr);
  builder.twoColumns("Pelanggan:", order.customerNameSnapshot);
  if (order.cashierName) {
    builder.twoColumns("Kasir   :", order.cashierName);
  }

  builder.divider("-");

  // 3. Rincian Item Pesanan
  builder.bold(true).line("RINCIAN PESANAN").bold(false);

  order.items.forEach((item, index) => {
    // Judul Item
    let itemTitle = `${index + 1}. ${item.productNameSnapshot}`;
    if (item.pricingTypeSnapshot === "AREA" && item.widthM && item.heightM) {
      itemTitle += ` (${item.widthM}m x ${item.heightM}m)`;
    }

    const titleLines = wrapText(itemTitle, width);
    titleLines.forEach((l) => builder.line(l));

    // Perhitungan: Qty x UnitPrice = Subtotal
    const qtyPriceStr = `   ${item.quantity} x Rp ${item.unitPrice.toLocaleString("id-ID")}`;
    const subtotalStr = `Rp ${item.itemSubtotal.toLocaleString("id-ID")}`;
    builder.twoColumns(qtyPriceStr, subtotalStr);

    // Finishing jika ada
    if (item.finishings && item.finishings.length > 0) {
      item.finishings.forEach((f) => {
        const fLeft = `   + ${f.finishingNameSnapshot}`;
        const fRight = `Rp ${f.subtotal.toLocaleString("id-ID")}`;
        builder.twoColumns(fLeft, fRight);
      });
    }
  });

  builder.divider("-");

  // 4. Ringkasan Finansial
  builder.twoColumns("Subtotal", `Rp ${order.subtotal.toLocaleString("id-ID")}`);

  if (order.designFee && order.designFee > 0) {
    builder.twoColumns("Biaya Desain", `Rp ${order.designFee.toLocaleString("id-ID")}`);
  }

  if (order.discountAmount && order.discountAmount > 0) {
    builder.twoColumns("Diskon", `-Rp ${order.discountAmount.toLocaleString("id-ID")}`);
  }

  builder.bold(true);
  builder.twoColumns("GRAND TOTAL", `Rp ${order.grandTotal.toLocaleString("id-ID")}`);
  builder.bold(false);

  builder.twoColumns("Total Dibayar", `Rp ${order.paidAmount.toLocaleString("id-ID")}`);

  if (order.remainingAmount > 0) {
    builder.bold(true);
    builder.twoColumns("Sisa Piutang", `Rp ${order.remainingAmount.toLocaleString("id-ID")}`);
    builder.bold(false);
  }

  const statusLabel =
    order.paymentStatus === "PAID"
      ? "LUNAS"
      : order.paymentStatus === "PARTIAL"
      ? "PANJAR (DP)"
      : "BELUM BAYAR";
  builder.twoColumns("Status Bayar", statusLabel);

  // 5. Info Pembayaran & Footer
  if (store.paymentInfo) {
    builder.divider("-");
    builder.alignCenter();
    builder.bold(true).line("Info Rekening / Pembayaran").bold(false);
    const payLines = wrapText(store.paymentInfo, width);
    payLines.forEach((l) => builder.line(l));
  }

  builder.divider("-");
  builder.alignCenter();

  if (store.receiptFooter) {
    const footerLines = wrapText(store.receiptFooter, width);
    footerLines.forEach((l) => builder.line(l));
  } else {
    builder.line("Terima kasih telah mempercayakan");
    builder.line("cetakan Anda kepada kami!");
  }

  builder.cut();
  return builder.build();
}
