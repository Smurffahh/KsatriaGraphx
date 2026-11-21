import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";
import {
  queueCartItemForPos,
  consumePendingCartItems,
  subscribePosAppendItem,
  clearPendingCartItems,
} from "./cart-bridge";
import { CartItem } from "@/components/pos/PosItemCalculator";

describe("cart-bridge", () => {
  const storageMap = new Map<string, string>();
  const eventListeners = new Map<string, Array<(e: unknown) => void>>();

  beforeAll(() => {
    (globalThis as unknown as { sessionStorage: unknown }).sessionStorage = {
      getItem: (key: string) => storageMap.get(key) ?? null,
      setItem: (key: string, val: string) => storageMap.set(key, val),
      removeItem: (key: string) => {
        storageMap.delete(key);
      },
      clear: () => {
        storageMap.clear();
      },
    };

    (globalThis as unknown as { window: unknown }).window = {
      sessionStorage: (globalThis as unknown as { sessionStorage: unknown }).sessionStorage,
      addEventListener: (type: string, fn: (e: unknown) => void) => {
        if (!eventListeners.has(type)) eventListeners.set(type, []);
        eventListeners.get(type)!.push(fn);
      },
      removeEventListener: (type: string, fn: (e: unknown) => void) => {
        const arr = eventListeners.get(type) || [];
        eventListeners.set(
          type,
          arr.filter((f) => f !== fn)
        );
      },
      dispatchEvent: (event: { type: string; detail?: unknown }) => {
        const arr = eventListeners.get(event.type) || [];
        for (const fn of arr) {
          fn(event);
        }
        return true;
      },
    };

    (globalThis as unknown as { CustomEvent: unknown }).CustomEvent = class CustomEvent {
      type: string;
      detail: unknown;
      constructor(type: string, init?: { detail: unknown }) {
        this.type = type;
        this.detail = init?.detail;
      }
    };
  });

  beforeEach(() => {
    clearPendingCartItems();
    storageMap.clear();
  });

  const mockItem: CartItem = {
    cartItemId: "item-123",
    product: {
      id: "prod-1",
      name: "Stiker Vinyl Matte",
      pricingType: "AREA",
      unitLabel: "m²",
      basePrice: 50000,
      areaRounding: "ROUND_UP_0_5",
      minArea: 1,
    },
    quantity: 1,
    width: 1,
    height: 1,
    billedAreaM2: 1,
    unitPrice: 50000,
    isPriceOverridden: false,
    finishings: [],
    finishingTotal: 0,
    itemSubtotal: 50000,
  };

  it("queues and consumes cart items when no active subscriber is registered", () => {
    queueCartItemForPos(mockItem);

    // Consume for first time
    const consumed = consumePendingCartItems();
    expect(consumed).toHaveLength(1);
    expect(consumed[0].cartItemId).toBe("item-123");

    // Second consume returns empty (already drained)
    const emptyConsumed = consumePendingCartItems();
    expect(emptyConsumed).toHaveLength(0);
  });

  it("notifies active subscriber immediately when queued", () => {
    const subscriber = vi.fn();
    const unsubscribe = subscribePosAppendItem(subscriber);

    queueCartItemForPos(mockItem);

    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(subscriber).toHaveBeenCalledWith(mockItem);

    // Because subscriber handled it, pending list in storage should not retain duplicate
    const consumed = consumePendingCartItems();
    expect(consumed).toHaveLength(0);

    unsubscribe();
  });
});
