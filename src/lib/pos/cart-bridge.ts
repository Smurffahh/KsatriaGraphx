import type { CartItem } from "@/components/pos/PosItemCalculator";

const STORAGE_KEY_PENDING_CART = "kgx_pending_cart_items";
const EVENT_APPEND_CART_ITEM = "kgx:pos-append-item";

/**
 * Menambahkan item ke antrean keranjang POS.
 * Jika kasir sedang di halaman /pos, event disiarkan langsung.
 * Jika kasir berada di halaman lain, item disimpan di sessionStorage agar dimuat saat navigasi ke /pos.
 */
export function queueCartItemForPos(item: CartItem): void {
  try {
    if (typeof window !== "undefined") {
      const raw = sessionStorage.getItem(STORAGE_KEY_PENDING_CART);
      const list: CartItem[] = raw ? JSON.parse(raw) : [];
      list.push(item);
      sessionStorage.setItem(STORAGE_KEY_PENDING_CART, JSON.stringify(list));

      // Siarkan event langsung bagi pendengar yang aktif di halaman /pos saat ini
      window.dispatchEvent(
        new CustomEvent(EVENT_APPEND_CART_ITEM, { detail: item })
      );
    }
  } catch (err) {
    console.error("[CartBridge] Gagal menyimpan item antrean:", err);
  }
}

/**
 * Mengambil dan membersihkan antrean item yang tertunda untuk keranjang POS.
 */
export function consumePendingCartItems(): CartItem[] {
  try {
    if (typeof window !== "undefined") {
      const raw = sessionStorage.getItem(STORAGE_KEY_PENDING_CART);
      if (raw) {
        sessionStorage.removeItem(STORAGE_KEY_PENDING_CART);
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.error("[CartBridge] Gagal membaca item antrean:", err);
  }
  return [];
}

/**
 * Menghapus antrean item tanpa mengembalikannya (misalnya untuk reset/testing).
 */
export function clearPendingCartItems(): void {
  try {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(STORAGE_KEY_PENDING_CART);
    }
  } catch (err) {
    console.error("[CartBridge] Gagal membersihkan item antrean:", err);
  }
}

/**
 * Berlangganan event penambahan item langsung ke keranjang POS.
 */
export function subscribePosAppendItem(
  callback: (item: CartItem) => void
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = (event: Event) => {
    const customEvt = event as CustomEvent<CartItem>;
    if (customEvt.detail) {
      // Hapus item yang baru disiarkan dari storage jika ada
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY_PENDING_CART);
        if (raw) {
          const list: CartItem[] = JSON.parse(raw);
          const filtered = list.filter(
            (i) => i.cartItemId !== customEvt.detail.cartItemId
          );
          if (filtered.length > 0) {
            sessionStorage.setItem(STORAGE_KEY_PENDING_CART, JSON.stringify(filtered));
          } else {
            sessionStorage.removeItem(STORAGE_KEY_PENDING_CART);
          }
        }
      } catch {
        // Abaikan error storage cleanup
      }
      callback(customEvt.detail);
    }
  };

  window.addEventListener(EVENT_APPEND_CART_ITEM, handler);
  return () => {
    window.removeEventListener(EVENT_APPEND_CART_ITEM, handler);
  };
}
