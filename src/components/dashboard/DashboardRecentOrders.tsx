"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Plus, Receipt } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyStatePanel } from "@/components/ui/state-panels";
import { formatRupiah } from "@/lib/format";
import {
  getPaymentStatusMeta,
  getProductionStatusMeta,
} from "@/lib/orders/status-labels";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import type { DashboardData } from "./types";

interface DashboardRecentOrdersProps {
  recentOrders: DashboardData["recentOrders"];
}

export function DashboardRecentOrders({ recentOrders }: DashboardRecentOrdersProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <div>
          <CardTitle>Transaksi Terbaru</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            5 transaksi terakhir yang tercatat di sistem
          </p>
        </div>
        <Link href="/orders">
          <Button variant="ghost" className="gap-1.5 text-sm font-semibold group shrink-0 min-h-11 sm:min-h-9">
            <span>Semua Pesanan</span>
            <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform duration-150" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="pt-0">
        {recentOrders.length > 0 ? (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Nota</TableHead>
                    <TableHead>Pelanggan</TableHead>
                    <TableHead>Status Bayar</TableHead>
                    <TableHead>Status Produksi</TableHead>
                    <TableHead className="text-right">Grand Total</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((order) => {
                    const paymentMeta = getPaymentStatusMeta(order.paymentStatus);
                    const prodMeta = getProductionStatusMeta(order.productionStatus);
                    return (
                      <TableRow key={order.id} className="hover:bg-muted/50 group">
                        <TableCell className="font-mono font-semibold text-foreground">
                          {order.invoiceNumber}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {order.customerNameSnapshot}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${paymentMeta.badgeClass}`}
                          >
                            {paymentMeta.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${prodMeta.badgeClass}`}
                          >
                            {prodMeta.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums text-foreground">
                          {formatRupiah(order.grandTotal)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/orders/detail?id=${order.id}`}>
                            <Button variant="outline" size="sm" className="gap-1.5">
                              <span>Detail</span>
                              <ArrowUpRight className="size-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-150" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden divide-y divide-border/60">
              {recentOrders.map((order) => {
                const paymentMeta = getPaymentStatusMeta(order.paymentStatus);
                const prodMeta = getProductionStatusMeta(order.productionStatus);
                return (
                  <Link
                    key={order.id}
                    href={`/orders/detail?id=${order.id}`}
                    className="block py-3.5 min-h-14 hover:bg-muted/40 transition-colors rounded-xl px-2.5 -mx-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-semibold text-sm text-foreground">
                        {order.invoiceNumber}
                      </span>
                      <span className="font-semibold text-sm text-foreground tabular-nums">
                        {formatRupiah(order.grandTotal)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mt-1.5">
                      <span className="truncate min-w-0 font-medium text-foreground/80">
                        {order.customerNameSnapshot}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${prodMeta.badgeClass}`}
                        >
                          {prodMeta.label}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${paymentMeta.badgeClass}`}
                        >
                          {paymentMeta.label}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        ) : (
          <EmptyStatePanel
            icon={Receipt}
            title="Belum ada transaksi"
            description="Mulai catat transaksi penjualan baru dengan membuka kasir."
            action={
              <Link href="/pos">
                <Button className="gap-2 min-h-11">
                  <Plus className="size-4" />
                  <span>Buat Nota Pertama</span>
                </Button>
              </Link>
            }
          />
        )}
      </CardContent>
    </Card>
  );
}
