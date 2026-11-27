import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockRequireOwner = vi.fn();
const mockValidateCsrfOrigin = vi.fn();
const mockRecordAuditLog = vi.fn();

const mockDbSelect = vi.fn();
const mockDbInsert = vi.fn();
const mockDbUpdate = vi.fn();
const mockDbDelete = vi.fn();
const mockDbTransaction = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/guard")>();
  return {
    ...actual,
    requireOwner: (...args: unknown[]) => mockRequireOwner(...args),
  };
});
vi.mock("@/lib/security/csrf", () => ({
  validateCsrfOrigin: (...args: unknown[]) => mockValidateCsrfOrigin(...args),
}));
vi.mock("@/lib/security/audit", () => ({
  recordAuditLog: (...args: unknown[]) => mockRecordAuditLog(...args),
}));
vi.mock("@/db", () => ({
  db: {
    select: (...args: unknown[]) => mockDbSelect(...args),
    insert: (...args: unknown[]) => mockDbInsert(...args),
    update: (...args: unknown[]) => mockDbUpdate(...args),
    delete: (...args: unknown[]) => mockDbDelete(...args),
    transaction: (...args: unknown[]) => mockDbTransaction(...args),
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
    for: () => chain,
    then: (onFulfilled: (val: unknown) => unknown, onRejected?: (err: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
  };
  return chain;
}

function buildInsertChain(returned: unknown[]) {
  const chain = {
    values: () => ({
      returning: () => Promise.resolve(returned),
    }),
  };
  return chain;
}

function buildUpdateChain(returned: unknown[] = []) {
  const whereResult = Object.assign(Promise.resolve(returned), {
    returning: () => Promise.resolve(returned),
  });
  return {
    set: () => ({
      where: () => whereResult,
    }),
  };
}

function buildDeleteChain() {
  return {
    where: () => Promise.resolve([]),
  };
}

const VENDOR_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORDER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ITEM_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const PAYMENT_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

describe("RBAC, Master Vendor CRUD, SPK Assignment & Ledger Setoran Modal (v1.6.0)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateCsrfOrigin.mockReturnValue(true);
    mockRecordAuditLog.mockResolvedValue(undefined);
    mockRequireOwner.mockResolvedValue({
      userId: "owner-1",
      name: "Owner Toko",
      username: "owner",
      role: "OWNER",
      platform: "WEB",
      tokenVersion: 1,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Strict RBAC OWNER-Only across All 5 Vendor & Settlement Routes (WEB & APK)", () => {
    it("mengembalikan 403 Forbidden bagi KASIR maupun CSRF lintas domain pada seluruh endpoint vendor", async () => {
      const vendorsRoute = await import("@/app/api/vendors/route");
      const vendorIdRoute = await import("@/app/api/vendors/[id]/route");
      const assignRoute = await import("@/app/api/orders/[id]/vendor-assignment/route");
      const payRoute = await import("@/app/api/orders/[id]/vendor-payments/route");
      const costRoute = await import("@/app/api/orders/[id]/vendor-cost/route");

      const checks: Array<() => Promise<Response>> = [
        () => vendorsRoute.GET(new NextRequest("http://localhost:3000/api/vendors")),
        () =>
          vendorsRoute.POST(
            new NextRequest("http://localhost:3000/api/vendors", {
              method: "POST",
              body: JSON.stringify({ name: "Test", whatsapp: "08123456789" }),
            })
          ),
        () =>
          vendorIdRoute.GET(new NextRequest(`http://localhost:3000/api/vendors/${VENDOR_ID}`), {
            params: Promise.resolve({ id: VENDOR_ID }),
          }),
        () =>
          vendorIdRoute.PATCH(
            new NextRequest(`http://localhost:3000/api/vendors/${VENDOR_ID}`, {
              method: "PATCH",
              body: JSON.stringify({ isActive: false }),
            }),
            { params: Promise.resolve({ id: VENDOR_ID }) }
          ),
        () =>
          vendorIdRoute.DELETE(
            new NextRequest(`http://localhost:3000/api/vendors/${VENDOR_ID}`, {
              method: "DELETE",
            }),
            { params: Promise.resolve({ id: VENDOR_ID }) }
          ),
        () =>
          assignRoute.PATCH(
            new NextRequest(`http://localhost:3000/api/orders/${ORDER_ID}/vendor-assignment`, {
              method: "PATCH",
              body: JSON.stringify({ markSpkSent: true }),
            }),
            { params: Promise.resolve({ id: ORDER_ID }) }
          ),
        () =>
          payRoute.GET(
            new NextRequest(`http://localhost:3000/api/orders/${ORDER_ID}/vendor-payments`),
            { params: Promise.resolve({ id: ORDER_ID }) }
          ),
        () =>
          payRoute.POST(
            new NextRequest(`http://localhost:3000/api/orders/${ORDER_ID}/vendor-payments`, {
              method: "POST",
              body: JSON.stringify({
                vendorName: "Vendor A",
                amount: 10000,
                paymentMethod: "TRANSFER",
              }),
            }),
            { params: Promise.resolve({ id: ORDER_ID }) }
          ),
        () =>
          costRoute.PATCH(
            new NextRequest(`http://localhost:3000/api/orders/${ORDER_ID}/vendor-cost`, {
              method: "PATCH",
              body: JSON.stringify({ totalProductionCost: 20000, reason: "Penyesuaian" }),
            }),
            { params: Promise.resolve({ id: ORDER_ID }) }
          ),
      ];

      for (const invoke of checks) {
        mockRequireOwner.mockRejectedValueOnce(new Error("FORBIDDEN"));
        const res = await invoke();
        expect(res.status).toBe(403);
      }

      // Cross-origin CSRF blocked on WEB session
      mockValidateCsrfOrigin.mockReturnValueOnce(false);
      const csrfRes = await vendorsRoute.POST(
        new NextRequest("http://localhost:3000/api/vendors", {
          method: "POST",
          body: JSON.stringify({ name: "Test", whatsapp: "08123456789" }),
        })
      );
      expect(csrfRes.status).toBe(403);
    });
  });

  describe("2. Master Vendor CRUD (/api/vendors & /api/vendors/[id])", () => {
    it("GET /api/vendors mengembalikan daftar vendor beserta statistik produk dan kewajiban setor", async () => {
      const { GET } = await import("@/app/api/vendors/route");
      mockDbSelect
        .mockImplementationOnce(() =>
          buildSelectChain([
            {
              id: VENDOR_ID,
              name: "Digital Print Jaya",
              contactName: "Pak Andi",
              whatsapp: "6281234567890",
              address: "Jl. Sudirman 10",
              specialty: "Banner & Stiker",
              leadTimeDays: 2,
              notes: null,
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ])
        )
        .mockImplementationOnce(() => buildSelectChain([{ vendorId: VENDOR_ID, count: 4 }]))
        .mockImplementationOnce(() => buildSelectChain([{ vendorId: VENDOR_ID, totalCost: 85000 }]))
        .mockImplementationOnce(() => buildSelectChain([{ vendorId: VENDOR_ID, totalPaid: 30000 }]));

      const res = await GET(new NextRequest("http://localhost:3000/api/vendors?isActive=true"));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].productCount).toBe(4);
      expect(body.data[0].assignedProductionCost).toBe(85000);
      expect(body.data[0].settledAmount).toBe(30000);
      expect(body.data[0].remainingPayable).toBe(55000);
    });

    it("POST /api/vendors menyimpan vendor baru dan menginisialisasi counter 0", async () => {
      const { POST } = await import("@/app/api/vendors/route");
      const createdVendor = {
        id: VENDOR_ID,
        name: "Konveksi Agung",
        contactName: "Bu Sari",
        whatsapp: "6281299988877",
        address: null,
        specialty: "Kaos & Polo",
        leadTimeDays: 5,
        notes: null,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockDbInsert.mockImplementationOnce(() => buildInsertChain([createdVendor]));

      const res = await POST(
        new NextRequest("http://localhost:3000/api/vendors", {
          method: "POST",
          body: JSON.stringify({
            name: "Konveksi Agung",
            contactName: "Bu Sari",
            whatsapp: "0812-9998-8877",
            specialty: "Kaos & Polo",
            leadTimeDays: 5,
          }),
        })
      );
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.data.whatsapp).toBe("6281299988877");
      expect(body.data.productCount).toBe(0);
      expect(body.data.remainingPayable).toBe(0);
      expect(mockRecordAuditLog).toHaveBeenCalledTimes(1);
    });

    it("DELETE /api/vendors/[id] melakukan soft-delete saat masih terhubung ke produk/order & hard-delete jika bersih", async () => {
      const { DELETE } = await import("@/app/api/vendors/[id]/route");
      const existingVendor = {
        id: VENDOR_ID,
        name: "Vendor Referensi",
        whatsapp: "6281234567890",
        isActive: true,
      };

      // Case 1: Referenced by 2 products -> soft-delete (isActive: false)
      mockDbSelect
        .mockImplementationOnce(() => buildSelectChain([existingVendor]))
        .mockImplementationOnce(() => buildSelectChain([{ n: 2 }]))
        .mockImplementationOnce(() => buildSelectChain([{ n: 0 }]))
        .mockImplementationOnce(() => buildSelectChain([{ n: 0 }]));
      mockDbUpdate.mockImplementationOnce(() =>
        buildUpdateChain([{ ...existingVendor, isActive: false }])
      );

      const softRes = await DELETE(
        new NextRequest(`http://localhost:3000/api/vendors/${VENDOR_ID}`, { method: "DELETE" }),
        { params: Promise.resolve({ id: VENDOR_ID }) }
      );
      const softBody = await softRes.json();
      expect(softRes.status).toBe(200);
      expect(softBody.data.softDeleted).toBe(true);
      expect(softBody.data.deleted).toBe(false);
      expect(softBody.data.vendor.isActive).toBe(false);

      // Case 2: Unreferenced -> permanent delete
      mockDbSelect
        .mockImplementationOnce(() => buildSelectChain([existingVendor]))
        .mockImplementationOnce(() => buildSelectChain([{ n: 0 }]))
        .mockImplementationOnce(() => buildSelectChain([{ n: 0 }]))
        .mockImplementationOnce(() => buildSelectChain([{ n: 0 }]));
      mockDbDelete.mockImplementationOnce(() => buildDeleteChain());

      const hardRes = await DELETE(
        new NextRequest(`http://localhost:3000/api/vendors/${VENDOR_ID}`, { method: "DELETE" }),
        { params: Promise.resolve({ id: VENDOR_ID }) }
      );
      const hardBody = await hardRes.json();
      expect(hardRes.status).toBe(200);
      expect(hardBody.data.deleted).toBe(true);
      expect(hardBody.data.softDeleted).toBe(false);
    });
  });

  describe("3. Penugasan Vendor per Item & Timestamp SPK (PATCH /api/orders/[id]/vendor-assignment)", () => {
    it("menolak pesanan CANCELLED (409) & sukses menyimpan assignment multi-vendor + spkSentAt", async () => {
      const { PATCH } = await import("@/app/api/orders/[id]/vendor-assignment/route");
      const now = new Date();

      // Vendor lookup before transaction + cancelled order inside transaction
      mockDbSelect.mockImplementationOnce(() =>
        buildSelectChain([{ id: VENDOR_ID, name: "Vendor A", isActive: true }])
      );
      mockDbTransaction.mockImplementationOnce(async (cb: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          select: () => buildSelectChain([{ id: ORDER_ID, productionStatus: "CANCELLED" }]),
        };
        return cb(tx);
      });

      const cancelRes = await PATCH(
        new NextRequest(`http://localhost:3000/api/orders/${ORDER_ID}/vendor-assignment`, {
          method: "PATCH",
          body: JSON.stringify({ items: [{ orderItemId: ITEM_ID, vendorId: VENDOR_ID }] }),
        }),
        { params: Promise.resolve({ id: ORDER_ID }) }
      );
      expect(cancelRes.status).toBe(409);

      // Success case
      mockDbSelect.mockImplementationOnce(() =>
        buildSelectChain([{ id: VENDOR_ID, name: "Vendor A", isActive: true }])
      );
      mockDbTransaction.mockImplementationOnce(async (cb: (tx: unknown) => Promise<unknown>) => {
        const txSelect = vi
          .fn()
          .mockImplementationOnce(() =>
            buildSelectChain([{ id: ORDER_ID, invoiceNumber: "KGX-20261127-0010", productionStatus: "QUEUED" }])
          )
          .mockImplementationOnce(() => buildSelectChain([{ id: ITEM_ID }]))
          .mockImplementationOnce(() =>
            buildSelectChain([{ id: ITEM_ID, vendorId: VENDOR_ID, vendorNameSnapshot: "Vendor A" }])
          );

        const tx = {
          select: txSelect,
          update: () =>
            buildUpdateChain([
              {
                id: ORDER_ID,
                invoiceNumber: "KGX-20261127-0010",
                designFileUrl: "https://drive.google.com/file/d/spk",
                spkSentAt: now.toISOString(),
              },
            ]),
        };
        return cb(tx);
      });

      const okRes = await PATCH(
        new NextRequest(`http://localhost:3000/api/orders/${ORDER_ID}/vendor-assignment`, {
          method: "PATCH",
          body: JSON.stringify({
            items: [{ orderItemId: ITEM_ID, vendorId: VENDOR_ID }],
            designFileUrl: "https://drive.google.com/file/d/spk",
            markSpkSent: true,
          }),
        }),
        { params: Promise.resolve({ id: ORDER_ID }) }
      );
      const okBody = await okRes.json();
      expect(okRes.status).toBe(200);
      expect(okBody.data.order.spkSentAt).toBeTruthy();
      expect(okBody.data.items[0].vendorNameSnapshot).toBe("Vendor A");
    });
  });

  describe("4. Ledger Setoran Modal Vendor Atomik (GET/POST /api/orders/[id]/vendor-payments)", () => {
    it("mentransisikan UNPAID -> PARTIAL -> PAID secara atomik & memblokir overpayment (409)", async () => {
      const { GET, POST } = await import("@/app/api/orders/[id]/vendor-payments/route");

      // Partial payment: 20000 / 50000 -> PARTIAL
      mockDbTransaction.mockImplementationOnce(async (cb: (tx: unknown) => Promise<unknown>) => {
        const txSelect = vi
          .fn()
          .mockImplementationOnce(() =>
            buildSelectChain([
              {
                id: ORDER_ID,
                invoiceNumber: "KGX-01",
                productionStatus: "IN_PRODUCTION",
                totalProductionCost: 50000,
                vendorPaidAmount: 0,
                vendorPaymentStatus: "UNPAID",
              },
            ])
          )
          .mockImplementationOnce(() => buildSelectChain([{ id: VENDOR_ID, name: "Vendor A" }]));

        const tx = {
          select: txSelect,
          insert: () =>
            buildInsertChain([
              {
                id: PAYMENT_ID,
                orderId: ORDER_ID,
                vendorId: VENDOR_ID,
                vendorNameSnapshot: "Vendor A",
                amount: 20000,
                paymentMethod: "TRANSFER",
              },
            ]),
          update: () =>
            buildUpdateChain([
              {
                id: ORDER_ID,
                invoiceNumber: "KGX-01",
                totalProductionCost: 50000,
                vendorPaidAmount: 20000,
                vendorPaymentStatus: "PARTIAL",
              },
            ]),
        };
        return cb(tx);
      });

      const partialRes = await POST(
        new NextRequest(`http://localhost:3000/api/orders/${ORDER_ID}/vendor-payments`, {
          method: "POST",
          body: JSON.stringify({
            vendorId: VENDOR_ID,
            amount: 20000,
            paymentMethod: "TRANSFER",
            referenceNote: "DP 1 via BCA",
          }),
        }),
        { params: Promise.resolve({ id: ORDER_ID }) }
      );
      const partialBody = await partialRes.json();
      expect(partialRes.status).toBe(201);
      expect(partialBody.data.order.vendorPaymentStatus).toBe("PARTIAL");
      expect(partialBody.data.order.vendorPaidAmount).toBe(20000);

      // Final payment: 30000 / 50000 -> PAID
      mockDbTransaction.mockImplementationOnce(async (cb: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          select: () =>
            buildSelectChain([
              {
                id: ORDER_ID,
                invoiceNumber: "KGX-01",
                productionStatus: "IN_PRODUCTION",
                totalProductionCost: 50000,
                vendorPaidAmount: 20000,
                vendorPaymentStatus: "PARTIAL",
              },
            ]),
          insert: () =>
            buildInsertChain([
              {
                id: PAYMENT_ID,
                orderId: ORDER_ID,
                vendorId: null,
                vendorNameSnapshot: "Vendor A",
                amount: 30000,
                paymentMethod: "CASH",
              },
            ]),
          update: () =>
            buildUpdateChain([
              {
                id: ORDER_ID,
                invoiceNumber: "KGX-01",
                totalProductionCost: 50000,
                vendorPaidAmount: 50000,
                vendorPaymentStatus: "PAID",
              },
            ]),
        };
        return cb(tx);
      });

      const paidRes = await POST(
        new NextRequest(`http://localhost:3000/api/orders/${ORDER_ID}/vendor-payments`, {
          method: "POST",
          body: JSON.stringify({
            vendorName: "Vendor A",
            amount: 30000,
            paymentMethod: "CASH",
          }),
        }),
        { params: Promise.resolve({ id: ORDER_ID }) }
      );
      const paidBody = await paidRes.json();
      expect(paidRes.status).toBe(201);
      expect(paidBody.data.order.vendorPaymentStatus).toBe("PAID");

      // Overpayment check -> 409 Conflict
      mockDbTransaction.mockImplementationOnce(async (cb: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          select: () =>
            buildSelectChain([
              {
                id: ORDER_ID,
                productionStatus: "READY",
                totalProductionCost: 50000,
                vendorPaidAmount: 20000,
              },
            ]),
        };
        return cb(tx);
      });

      const overRes = await POST(
        new NextRequest(`http://localhost:3000/api/orders/${ORDER_ID}/vendor-payments`, {
          method: "POST",
          body: JSON.stringify({
            vendorName: "Vendor A",
            amount: 35000,
            paymentMethod: "CASH",
          }),
        }),
        { params: Promise.resolve({ id: ORDER_ID }) }
      );
      expect(overRes.status).toBe(409);

      // GET ledger summary
      mockDbSelect
        .mockImplementationOnce(() =>
          buildSelectChain([
            {
              id: ORDER_ID,
              invoiceNumber: "KGX-01",
              totalProductionCost: 50000,
              vendorPaidAmount: 20000,
              vendorPaymentStatus: "PARTIAL",
            },
          ])
        )
        .mockImplementationOnce(() =>
          buildSelectChain([{ id: PAYMENT_ID, amount: 20000, vendorNameSnapshot: "Vendor A" }])
        );

      const getRes = await GET(
        new NextRequest(`http://localhost:3000/api/orders/${ORDER_ID}/vendor-payments`),
        { params: Promise.resolve({ id: ORDER_ID }) }
      );
      const getBody = await getRes.json();
      expect(getRes.status).toBe(200);
      expect(getBody.data.summary.remainingVendorPayable).toBe(30000);
      expect(getBody.data.vendorPayments).toHaveLength(1);
    });
  });

  describe("5. Penyesuaian Modal Vendor Aktual (PATCH /api/orders/[id]/vendor-cost)", () => {
    it("menolak modal < vendorPaidAmount (409) & merekomputasi grossProfit serta vendorPaymentStatus", async () => {
      const { PATCH } = await import("@/app/api/orders/[id]/vendor-cost/route");

      mockDbTransaction.mockImplementationOnce(async (cb: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          select: () =>
            buildSelectChain([
              {
                id: ORDER_ID,
                productionStatus: "IN_PRODUCTION",
                grandTotal: 100000,
                totalProductionCost: 60000,
                grossProfit: 40000,
                vendorPaidAmount: 50000,
                vendorPaymentStatus: "PARTIAL",
              },
            ]),
        };
        return cb(tx);
      });

      const tooLowRes = await PATCH(
        new NextRequest(`http://localhost:3000/api/orders/${ORDER_ID}/vendor-cost`, {
          method: "PATCH",
          body: JSON.stringify({
            totalProductionCost: 40000,
            reason: "Kurang dari yang sudah disetor",
          }),
        }),
        { params: Promise.resolve({ id: ORDER_ID }) }
      );
      expect(tooLowRes.status).toBe(409);

      // Lower totalProductionCost cleanly to equal vendorPaidAmount -> becomes PAID and recalculates grossProfit
      mockDbTransaction.mockImplementationOnce(async (cb: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          select: () =>
            buildSelectChain([
              {
                id: ORDER_ID,
                invoiceNumber: "KGX-01",
                productionStatus: "IN_PRODUCTION",
                grandTotal: 100000,
                totalProductionCost: 60000,
                grossProfit: 40000,
                vendorPaidAmount: 50000,
                vendorPaymentStatus: "PARTIAL",
              },
            ]),
          update: () =>
            buildUpdateChain([
              {
                id: ORDER_ID,
                invoiceNumber: "KGX-01",
                grandTotal: 100000,
                totalProductionCost: 50000,
                grossProfit: 50000,
                vendorPaidAmount: 50000,
                vendorPaymentStatus: "PAID",
              },
            ]),
        };
        return cb(tx);
      });

      const okRes = await PATCH(
        new NextRequest(`http://localhost:3000/api/orders/${ORDER_ID}/vendor-cost`, {
          method: "PATCH",
          body: JSON.stringify({
            totalProductionCost: 50000,
            reason: "Diskon vendor langganan",
          }),
        }),
        { params: Promise.resolve({ id: ORDER_ID }) }
      );
      const okBody = await okRes.json();
      expect(okRes.status).toBe(200);
      expect(okBody.data.grossProfit).toBe(50000);
      expect(okBody.data.vendorPaymentStatus).toBe("PAID");
    });
  });
});
