import { isNativeApp } from "@/lib/platform";
import { generateEscPosReceipt, type EscPosPaperWidth } from "./escpos";
import type { ReceiptOrderData, ReceiptStoreSettings } from "./share";

export interface ThermalPrinterDevice {
  name: string;
  address: string; // MAC Address atau UUID perangkat Bluetooth
}

export interface DefaultPrinterConfig {
  name: string;
  address: string;
  paperWidth: EscPosPaperWidth;
}

const PRINTER_CONFIG_KEY = "kgx_default_thermal_printer";

// Interface untuk bridge plugin Bluetooth Serial native
interface NativeBluetoothSerial {
  requestPermissions?: () => Promise<{ granted: boolean }>;
  isEnabled?: () => Promise<{ enabled: boolean }>;
  enable?: () => Promise<void>;
  list?: () => Promise<ThermalPrinterDevice[] | { devices: ThermalPrinterDevice[] }>;
  scan?: () => Promise<ThermalPrinterDevice[] | { devices: ThermalPrinterDevice[] }>;
  connect?: (options: { address: string }) => Promise<void>;
  disconnect?: (options: { address: string }) => Promise<void>;
  isConnected?: (options: { address: string }) => Promise<{ isConnected: boolean }>;
  write?: (options: { address: string; data: string | number[] }) => Promise<void>;
}

function getNativeBluetooth(): NativeBluetoothSerial | null {
  if (typeof window === "undefined" || !isNativeApp()) return null;

  const cap = (window as unknown as { Capacitor?: { Plugins?: Record<string, unknown> } }).Capacitor;
  const plugin = cap?.Plugins?.BluetoothSerial as NativeBluetoothSerial | undefined;
  if (plugin) return plugin;

  const globalBt = (window as unknown as { bluetoothSerial?: NativeBluetoothSerial }).bluetoothSerial;
  return globalBt || null;
}

/**
 * Meminta izin Bluetooth di perangkat Android (Android 12+ BLUETOOTH_SCAN & BLUETOOTH_CONNECT).
 */
export async function requestBluetoothPermissions(): Promise<boolean> {
  if (!isNativeApp()) return false;

  const bt = getNativeBluetooth();
  if (bt?.requestPermissions) {
    try {
      const res = await bt.requestPermissions();
      return Boolean(res.granted);
    } catch (err) {
      console.warn("[Bluetooth] Izin ditolak atau gagal:", err);
      return false;
    }
  }

  return true; // Fallback untuk Android <= 11
}

/**
 * Mendapatkan daftar printer Bluetooth thermal yang telah dipasangkan (paired) di HP Android.
 */
export async function listPairedPrinters(): Promise<ThermalPrinterDevice[]> {
  if (!isNativeApp()) return [];

  const bt = getNativeBluetooth();
  if (!bt || !bt.list) {
    return [];
  }

  try {
    const res = await bt.list();
    if (Array.isArray(res)) return res;
    if (res && "devices" in res && Array.isArray(res.devices)) return res.devices;
    return [];
  } catch (err) {
    console.error("[Bluetooth] Gagal memuat daftar printer paired:", err);
    return [];
  }
}

/**
 * Menyimpan printer default pilihan kasir ke konfigurasi lokal.
 */
export function saveDefaultPrinter(config: DefaultPrinterConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PRINTER_CONFIG_KEY, JSON.stringify(config));
  } catch (err) {
    console.error("[Bluetooth] Gagal menyimpan printer default:", err);
  }
}

/**
 * Mengambil printer default pilihan kasir.
 */
export function getDefaultPrinter(): DefaultPrinterConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PRINTER_CONFIG_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DefaultPrinterConfig;
  } catch {
    return null;
  }
}

/**
 * Menghapus printer default dari konfigurasi lokal.
 */
export function clearDefaultPrinter(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PRINTER_CONFIG_KEY);
  } catch (err) {
    console.error("[Bluetooth] Gagal menghapus printer default:", err);
  }
}

/**
 * Mengirim data byte ESC/POS secara chunking (bertahap 128 byte)
 * untuk mencegah buffer overflow pada printer thermal Bluetooth murah.
 */
async function sendEscPosChunks(
  bt: NativeBluetoothSerial,
  address: string,
  bytes: Uint8Array,
  chunkSize: number = 128
): Promise<void> {
  const total = bytes.length;
  for (let offset = 0; offset < total; offset += chunkSize) {
    const slice = bytes.slice(offset, offset + chunkSize);
    // Konversi Uint8Array ke array number atau base64
    const dataArray = Array.from(slice);

    if (bt.write) {
      await bt.write({ address, data: dataArray });
    }

    // Delay 20ms antar-chunk untuk kelancaran hardware buffer
    await new Promise((r) => setTimeout(r, 20));
  }
}

/**
 * Mencetak nota pesanan langsung ke printer thermal Bluetooth Android.
 */
export async function printReceiptThermal(
  order: ReceiptOrderData,
  store: ReceiptStoreSettings,
  targetPaperWidth?: EscPosPaperWidth
): Promise<{ success: boolean; message: string }> {
  if (!isNativeApp()) {
    return {
      success: false,
      message: "Fitur cetak Bluetooth thermal hanya tersedia di aplikasi Android POS.",
    };
  }

  const defaultPrinter = getDefaultPrinter();
  if (!defaultPrinter || !defaultPrinter.address) {
    return {
      success: false,
      message: "Printer thermal belum dihubungkan. Silakan atur printer di menu Pengaturan terlebih dahulu.",
    };
  }

  const bt = getNativeBluetooth();
  if (!bt) {
    return {
      success: false,
      message: "Modul Bluetooth native tidak tersedia di perangkat ini.",
    };
  }

  const paperWidth = targetPaperWidth || defaultPrinter.paperWidth || "58mm";

  try {
    // 1. Hubungkan ke printer
    if (bt.connect) {
      await bt.connect({ address: defaultPrinter.address });
    }

    // 2. Generate byte ESC/POS
    const bytes = generateEscPosReceipt(order, store, paperWidth);

    // 3. Kirim data bertahap
    await sendEscPosChunks(bt, defaultPrinter.address, bytes);

    // 4. Putus koneksi bersih
    if (bt.disconnect) {
      await bt.disconnect({ address: defaultPrinter.address });
    }

    return {
      success: true,
      message: "Nota pesanan berhasil dicetak ke printer thermal.",
    };
  } catch (err: unknown) {
    console.error("[Bluetooth] Gagal mencetak struk thermal:", err);
    return {
      success: false,
      message:
        "Gagal mencetak. Pastikan printer thermal menyala, Bluetooth aktif, dan jarak tidak terlalu jauh.",
    };
  }
}

/**
 * Mencetak struk uji coba koneksi printer thermal Bluetooth.
 */
export async function printTestReceipt(
  storeName: string = "Ksatria Graphx",
  paperWidth: EscPosPaperWidth = "58mm"
): Promise<{ success: boolean; message: string }> {
  const dummyOrder: ReceiptOrderData = {
    invoiceNumber: "TEST-00000000",
    createdAt: new Date().toISOString(),
    customerNameSnapshot: "Pelanggan Tes",
    customerPhoneSnapshot: "081234567890",
    cashierName: "Kasir POS",
    subtotal: 50000,
    grandTotal: 50000,
    paidAmount: 50000,
    remainingAmount: 0,
    paymentStatus: "PAID",
    productionStatus: "COMPLETED",
    items: [
      {
        productNameSnapshot: "Tes Cetak Struk Thermal",
        quantity: 1,
        unitPrice: 50000,
        itemSubtotal: 50000,
      },
    ],
  };

  const dummyStore: ReceiptStoreSettings = {
    storeName,
    tagline: "Sistem Kasir & Percetakan Digital",
    phone: "0812-3456-7890",
    address: "Koneksi Printer Bluetooth Berhasil!",
    receiptFooter: "Printer siap digunakan untuk transaksi",
  };

  return printReceiptThermal(dummyOrder, dummyStore, paperWidth);
}
