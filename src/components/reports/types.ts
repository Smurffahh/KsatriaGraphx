import type { VendorPaymentStatus } from "@/lib/vendors/settlement";

export type PaymentFilterStatus = "ALL" | "PAID" | "PARTIAL" | "UNPAID";
export type ReportPreset = "today" | "7d" | "month" | "custom";

export interface ReportSummary {
  totalOmzet: number;
  totalProductionCost: number;
  totalGrossProfit: number;
  profitMarginPercent: number;
  totalVendorPaid?: number;
  totalVendorPayable?: number;
  totalPaid: number;
  totalRemaining: number;
  ordersCount: number;
  cashFlow: {
    totalCashReceived: number;
    byMethod: {
      CASH: number;
      TRANSFER: number;
      QRIS: number;
    };
  };
}

export interface ReportOrder {
  id: string;
  invoiceNumber: string;
  customerNameSnapshot: string;
  customerPhoneSnapshot: string | null;
  cashierId: string;
  cashierName: string | null;
  sourcePlatform: "WEB" | "APK";
  subtotal: number;
  designFee: number;
  discountAmount: number;
  grandTotal: number;
  totalProductionCost: number;
  grossProfit: number;
  vendorPaidAmount?: number;
  vendorPaymentStatus?: VendorPaymentStatus;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: "UNPAID" | "PARTIAL" | "PAID";
  productionStatus: string;
  createdAt: string;
}

export interface ReportResponse {
  summary: ReportSummary;
  orders: ReportOrder[];
}

export interface UserListItem {
  id: string;
  name: string;
  role: "OWNER" | "KASIR";
}
