export interface CashierDashboardData {
  role: "KASIR";
  kpi: {
    todayOmzet: number;
    todayOrdersCount: number;
    todayMoneyReceived: number;
    activeQueueCount: number;
  };
  recentOrders: Array<{
    id: string;
    invoiceNumber: string;
    customerNameSnapshot: string;
    grandTotal: number;
    paidAmount: number;
    remainingAmount: number;
    paymentStatus: string;
    productionStatus: string;
    createdAt: string;
  }>;
}

export interface OwnerDashboardData {
  role: "OWNER";
  range: "1d" | "7d" | "30d";
  kpi: {
    totalOmzet: number;
    totalProductionCost: number;
    totalGrossProfit: number;
    profitMarginPercent: number;
    totalOrders: number;
    totalCashIn: number;
    totalPiutang: number;
    unpaidVendorTotal?: number;
    unpaidVendorOrderCount?: number;
    vendorPaidInPeriod?: number;
    netAvailableCashEstimate?: number;
    activeQueueCount: number;
  };
  chartTrend: Array<{
    dateKey: string;
    omzet: number;
    modal?: number;
    laba?: number;
    transaksi: number;
  }>;
  topProducts: Array<{
    productId: string | null;
    productName: string;
    totalQuantity: number;
    totalRevenue: number;
  }>;
  recentOrders: Array<{
    id: string;
    invoiceNumber: string;
    customerNameSnapshot: string;
    cashierName: string | null;
    grandTotal: number;
    paidAmount: number;
    remainingAmount: number;
    paymentStatus: string;
    productionStatus: string;
    createdAt: string;
  }>;
}

export type DashboardData = CashierDashboardData | OwnerDashboardData;
