"use client";

import React from "react";
import Link from "next/link";
import { m } from "motion/react";
import { Layers, ShoppingBag } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRupiah } from "@/lib/format";
import { EASE_SMOOTH } from "@/lib/motion";
import type { OwnerDashboardData } from "./types";

function formatCompactRupiah(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(".", ",")} jt`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)} rb`;
  }
  return value.toString();
}

function formatDateLabel(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
}

interface DashboardChartsSectionProps {
  ownerData: OwnerDashboardData;
  range: "1d" | "7d" | "30d";
}

export function DashboardChartsSection({
  ownerData,
  range,
}: DashboardChartsSectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <Card className="lg:col-span-8 min-w-0">
        <CardHeader className="flex flex-row items-start sm:items-center justify-between gap-3 pb-3">
          <div className="min-w-0">
            <CardTitle>Tren Penjualan</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {`Pergerakan omzet harian (${range === "1d" ? "Hari Ini" : range === "7d" ? "7 Hari Terakhir" : "30 Hari Terakhir"})`}
            </p>
          </div>
          {ownerData.chartTrend.length > 0 && (
            <Badge variant="outline" className="shrink-0 whitespace-nowrap">
              {ownerData.chartTrend.length} hari data
            </Badge>
          )}
        </CardHeader>
        <CardContent className="pt-2">
          {ownerData.chartTrend.length > 0 ? (
            <div className="h-[240px] sm:h-[320px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={ownerData.chartTrend}
                  margin={{ top: 10, right: 12, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="omzetGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--border)"
                    opacity={0.6}
                  />
                  <XAxis
                    dataKey="dateKey"
                    tickFormatter={formatDateLabel}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={formatCompactRupiah}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload as {
                          dateKey: string;
                          omzet: number;
                          modal?: number;
                          laba?: number;
                          transaksi: number;
                        };
                        return (
                          <div className="rounded-xl border border-border bg-popover text-popover-foreground p-3.5 shadow-md text-xs space-y-1">
                            <p className="font-semibold text-foreground">
                              {formatDateLabel(item.dateKey)}
                            </p>
                            <p className="font-bold text-primary tabular-nums text-base">
                              {formatRupiah(item.omzet)}
                            </p>
                            {typeof item.modal === "number" && typeof item.laba === "number" && (
                              <div className="space-y-0.5 pt-0.5 border-t border-border/60 tabular-nums">
                                <p className="text-muted-foreground">
                                  Modal: {formatRupiah(item.modal)}
                                </p>
                                <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                  Laba: {formatRupiah(item.laba)}
                                </p>
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {item.transaksi} transaksi tercatat
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="omzet"
                    stroke="var(--chart-1)"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#omzetGradient)"
                    isAnimationActive={true}
                    animationDuration={450}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[240px] sm:h-[320px] flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
              <Layers className="size-9 text-muted-foreground/40 mb-2.5" />
              <p className="text-sm font-semibold text-foreground">Belum ada grafik penjualan</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
                Transaksi yang disimpan melalui kasir akan otomatis terekam ke dalam grafik tren.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-4 min-w-0">
        <CardHeader className="flex flex-row items-start sm:items-center justify-between gap-2 pb-3">
          <div>
            <CardTitle>Produk Terlaris</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Berdasarkan omzet periode
            </p>
          </div>
          <Link
            href="/products"
            className="inline-flex min-h-11 sm:min-h-9 items-center text-sm text-primary hover:underline font-medium shrink-0 px-1"
          >
            Katalog
          </Link>
        </CardHeader>
        <CardContent className="pt-2">
          {ownerData.topProducts.length > 0 ? (
            <div className="space-y-4">
              {ownerData.topProducts.map((p, idx) => {
                const maxRevenue = ownerData.topProducts[0]?.totalRevenue || 1;
                const percent = Math.min(100, Math.round((p.totalRevenue / maxRevenue) * 100));

                return (
                  <div key={p.productId ?? p.productName} className="space-y-1.5 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-foreground truncate min-w-0">
                        {p.productName}
                      </span>
                      <span className="font-semibold text-foreground tabular-nums shrink-0">
                        {formatRupiah(p.totalRevenue)}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <m.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: percent / 100 }}
                        transition={{ delay: 0.08 + idx * 0.04, duration: 0.45, ease: EASE_SMOOTH }}
                        className="h-full bg-primary rounded-full origin-left"
                        style={{ width: "100%" }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {p.totalQuantity} pcs terjual
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-60 flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
              <ShoppingBag className="size-9 text-muted-foreground/40 mb-2.5" />
              <p className="text-sm font-semibold text-foreground">Belum ada data produk</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Produk terlaris akan dihitung otomatis dari transaksi nota kasir.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
