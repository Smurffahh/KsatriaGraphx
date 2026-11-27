import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import { NextRequest } from "next/server";

const mockRequireAuth = vi.fn();
const mockRequireOwner = vi.fn();
const mockDbSelect = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/guard")>();
  return {
    ...actual,
    requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
    requireOwner: (...args: unknown[]) => mockRequireOwner(...args),
  };
});
vi.mock("@/db", () => ({
  db: {
    select: (...args: unknown[]) => mockDbSelect(...args),
  },
}));

function buildSelectChain(result: unknown[]) {
  const chain: Record<string, unknown> = {
    from: () => chain,
    leftJoin: () => chain,
    innerJoin: () => chain,
    where: () => chain,
    groupBy: () => chain,
    orderBy: () => chain,
    limit: () => chain,
    offset: () => chain,
    then: (onFulfilled: (val: unknown) => unknown, onRejected?: (err: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
  };
  return chain;
}

describe("HTTP Route RBAC Zero-Leak Audit: Harga Modal Vendor & Laba (Cookie Web & Bearer APK)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("GET /api/products menghapus productionPrice produk & tier untuk KASIR (WEB & APK) namun menampilkannya ke OWNER", async () => {
    const productRows = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        categoryId: "22222222-2222-4222-8222-222222222222",
        categoryName: "Banner & Spanduk",
        categorySlug: "banner-spanduk",
        sku: "BNR-FLX-280",
        name: "Banner Flexi 280gr Standard",
        description: "Promo",
        imageUrl: null,
        imageKey: null,
        pricingType: "AREA",
        unitLabel: "m²",
        productionPrice: 20000,
        basePrice: 25000,
        minArea: "1.00",
        areaRounding: "EXACT",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    const tierRows = [
      {
        id: "33333333-3333-4333-8333-333333333333",
        productId: "11111111-1111-4111-8111-111111111111",
        minQty: 10,
        maxQty: null,
        productionPrice: 18000,
        unitPrice: 23000,
      },
    ];

    const { GET } = await import("@/app/api/products/route");

    for (const platform of ["WEB", "APK"] as const) {
      mockRequireAuth.mockResolvedValueOnce({
        userId: "kasir-1",
        role: "KASIR",
        platform,
        tokenVersion: 1,
      });
      mockDbSelect
        .mockImplementationOnce(() => buildSelectChain(productRows))
        .mockImplementationOnce(() => buildSelectChain(tierRows));

      const req = new NextRequest("http://localhost:3000/api/products");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data[0].basePrice).toBe(25000);
      expect("productionPrice" in body.data[0]).toBe(false);
      expect("productionPrice" in body.data[0].priceTiers[0]).toBe(false);
    }

    mockRequireAuth.mockResolvedValueOnce({
      userId: "owner-1",
      role: "OWNER",
      platform: "WEB",
      tokenVersion: 1,
    });
    mockDbSelect
      .mockImplementationOnce(() => buildSelectChain(productRows))
      .mockImplementationOnce(() => buildSelectChain(tierRows));

    const ownerRes = await GET(new NextRequest("http://localhost:3000/api/products"));
    const ownerBody = await ownerRes.json();
    expect(ownerBody.data[0].productionPrice).toBe(20000);
    expect(ownerBody.data[0].priceTiers[0].productionPrice).toBe(18000);
  });

  it("GET /api/finishings menghapus productionPrice untuk KASIR (WEB & APK)", async () => {
    const finRows = [
      {
        id: "44444444-4444-4444-8444-444444444444",
        name: "Mata Ayam",
        chargeType: "PER_QTY",
        productionPrice: 500,
        defaultPrice: 1000,
        unitLabel: "titik",
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    ];

    const { GET } = await import("@/app/api/finishings/route");
    mockRequireAuth.mockResolvedValueOnce({
      userId: "kasir-1",
      role: "KASIR",
      platform: "APK",
      tokenVersion: 1,
    });
    mockDbSelect.mockImplementationOnce(() => buildSelectChain(finRows));

    const res = await GET(new NextRequest("http://localhost:3000/api/finishings"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data[0].defaultPrice).toBe(1000);
    expect("productionPrice" in body.data[0]).toBe(false);
  });

  it("GET /api/orders dan GET /api/orders/[id] menghapus seluruh field modal & laba untuk KASIR", async () => {
    const orderId = "55555555-5555-4555-8555-555555555555";
    const listRow = {
      id: orderId,
      invoiceNumber: "KGX-20261127-0001",
      grandTotal: 25000,
      totalProductionCost: 20000,
      grossProfit: 5000,
    };
    const itemRow = {
      id: "66666666-6666-4666-8666-666666666666",
      orderId,
      productNameSnapshot: "Banner Flexi 280gr Standard",
      unitPrice: 25000,
      itemSubtotal: 25000,
      productionUnitPriceSnapshot: 20000,
      productionSubtotal: 20000,
      profitAmount: 5000,
    };

    const { GET: getOrdersList } = await import("@/app/api/orders/route");
    mockRequireAuth.mockResolvedValueOnce({
      userId: "kasir-1",
      role: "KASIR",
      platform: "WEB",
      tokenVersion: 1,
    });
    mockDbSelect
      .mockImplementationOnce(() => buildSelectChain([{ count: 1 }]))
      .mockImplementationOnce(() => buildSelectChain([listRow]));

    const listRes = await getOrdersList(new NextRequest("http://localhost:3000/api/orders"));
    const listBody = await listRes.json();
    expect(listRes.status).toBe(200);
    expect(listBody.success).toBe(true);
    expect("totalProductionCost" in listBody.data.data[0]).toBe(false);
    expect("grossProfit" in listBody.data.data[0]).toBe(false);

    const { GET: getOrderDetail } = await import("@/app/api/orders/[id]/route");
    mockRequireAuth.mockResolvedValueOnce({
      userId: "kasir-1",
      role: "KASIR",
      platform: "APK",
      tokenVersion: 1,
    });
    mockDbSelect
      .mockImplementationOnce(() => buildSelectChain([{ ...listRow, customerId: null }]))
      .mockImplementationOnce(() => buildSelectChain([itemRow]))
      .mockImplementationOnce(() => buildSelectChain([]))
      .mockImplementationOnce(() => buildSelectChain([]));

    const detailRes = await getOrderDetail(new NextRequest(`http://localhost:3000/api/orders/${orderId}`), {
      params: Promise.resolve({ id: orderId }),
    });
    const detailBody = await detailRes.json();
    expect(detailRes.status).toBe(200);
    expect(detailBody.success).toBe(true);
    expect("totalProductionCost" in detailBody.data).toBe(false);
    expect("grossProfit" in detailBody.data).toBe(false);
    expect("productionUnitPriceSnapshot" in detailBody.data.items[0]).toBe(false);
    expect("productionSubtotal" in detailBody.data.items[0]).toBe(false);
    expect("profitAmount" in detailBody.data.items[0]).toBe(false);

    // Owner harus menerima totalProductionCost & grossProfit pada detail nota
    mockRequireAuth.mockResolvedValueOnce({
      userId: "owner-1",
      role: "OWNER",
      platform: "WEB",
      tokenVersion: 1,
    });
    mockDbSelect
      .mockImplementationOnce(() => buildSelectChain([{ ...listRow, customerId: null }]))
      .mockImplementationOnce(() => buildSelectChain([itemRow]))
      .mockImplementationOnce(() => buildSelectChain([]))
      .mockImplementationOnce(() => buildSelectChain([]));

    const ownerDetailRes = await getOrderDetail(new NextRequest(`http://localhost:3000/api/orders/${orderId}`), {
      params: Promise.resolve({ id: orderId }),
    });
    const ownerDetailBody = await ownerDetailRes.json();
    expect(ownerDetailRes.status).toBe(200);
    expect(ownerDetailBody.data.totalProductionCost).toBe(20000);
    expect(ownerDetailBody.data.grossProfit).toBe(5000);
    expect(ownerDetailBody.data.items[0].profitAmount).toBe(5000);
  });

  it("GET /api/dashboard tidak mengembalikan totalProductionCost/totalGrossProfit ke KASIR & GET /api/reports memblokir KASIR", async () => {
    const { GET: getDashboard } = await import("@/app/api/dashboard/route");
    mockRequireAuth.mockResolvedValueOnce({
      userId: "kasir-1",
      role: "KASIR",
      platform: "APK",
      tokenVersion: 1,
    });
    mockDbSelect
      .mockImplementationOnce(() => buildSelectChain([{ count: 1 }]))
      .mockImplementationOnce(() => buildSelectChain([{ totalOmzet: 50000, ordersCount: 1 }]))
      .mockImplementationOnce(() => buildSelectChain([{ totalMoney: 50000 }]))
      .mockImplementationOnce(() => buildSelectChain([]));

    const dashRes = await getDashboard(new NextRequest("http://localhost:3000/api/dashboard"));
    const dashBody = await dashRes.json();
    expect(dashRes.status).toBe(200);
    expect(dashBody.success).toBe(true);
    expect(dashBody.data.role).toBe("KASIR");
    expect("totalProductionCost" in dashBody.data.kpi).toBe(false);
    expect("totalGrossProfit" in dashBody.data.kpi).toBe(false);
    expect("profitMarginPercent" in dashBody.data.kpi).toBe(false);

    // Owner dashboard mengembalikan metrik modal & laba bersih
    mockRequireAuth.mockResolvedValueOnce({
      userId: "owner-1",
      role: "OWNER",
      platform: "WEB",
      tokenVersion: 1,
    });
    mockDbSelect
      .mockImplementationOnce(() => buildSelectChain([{ count: 1 }]))
      .mockImplementationOnce(() =>
        buildSelectChain([{ totalOmzet: 25000, totalProductionCost: 20000, totalGrossProfit: 5000, totalOrders: 1 }])
      )
      .mockImplementationOnce(() => buildSelectChain([{ totalCashIn: 25000 }]))
      .mockImplementationOnce(() => buildSelectChain([{ totalPiutang: 0 }]))
      .mockImplementationOnce(() => buildSelectChain([]))
      .mockImplementationOnce(() => buildSelectChain([]))
      .mockImplementationOnce(() => buildSelectChain([]));

    const ownerDashRes = await getDashboard(new NextRequest("http://localhost:3000/api/dashboard"));
    const ownerDashBody = await ownerDashRes.json();
    expect(ownerDashRes.status).toBe(200);
    expect(ownerDashBody.data.role).toBe("OWNER");
    expect(ownerDashBody.data.kpi.totalProductionCost).toBe(20000);
    expect(ownerDashBody.data.kpi.totalGrossProfit).toBe(5000);
    expect(ownerDashBody.data.kpi.profitMarginPercent).toBe(20);

    const { GET: getReports } = await import("@/app/api/reports/route");
    mockRequireOwner.mockRejectedValueOnce(new Error("FORBIDDEN_NOT_OWNER"));
    const reportsRes = await getReports(new NextRequest("http://localhost:3000/api/reports"));
    expect(reportsRes.status).toBe(403);
  });

  it("ReceiptView.tsx & src/lib/printer/ tidak pernah mereferensikan field modal vendor atau laba", () => {
    const filesToCheck = [
      "src/components/receipt/ReceiptView.tsx",
      "src/lib/printer/escpos.ts",
      "src/lib/printer/share.ts",
    ];
    const forbiddenFields = [
      "productionPrice",
      "productionSubtotal",
      "productionUnitPriceSnapshot",
      "totalProductionCost",
      "grossProfit",
      "profitAmount",
    ];

    for (const file of filesToCheck) {
      const content = fs.readFileSync(file, "utf-8");
      for (const field of forbiddenFields) {
        expect(content).not.toContain(field);
      }
    }
  });
});
