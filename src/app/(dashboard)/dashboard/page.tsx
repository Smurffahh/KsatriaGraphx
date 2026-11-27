"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { m } from "motion/react";
import { RotateCw, Plus } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageLoadingBanner } from "@/components/ui/page-loading-banner";
import { ErrorStatePanel } from "@/components/ui/state-panels";
import { DashboardKpiSection } from "@/components/dashboard/DashboardKpiSection";
import { DashboardChartsSection } from "@/components/dashboard/DashboardChartsSection";
import { DashboardRecentOrders } from "@/components/dashboard/DashboardRecentOrders";
import type {
  CashierDashboardData,
  OwnerDashboardData,
  DashboardData,
} from "@/components/dashboard/types";

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <PageLoadingBanner message="Memuat ringkasan performa toko..." />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-44 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-64 sm:h-72 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-64 sm:h-72 rounded-2xl" />
      </div>

      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

export default function DashboardPage() {
  const [range, setRange] = useState<"1d" | "7d" | "30d">("7d");

  const {
    data: response,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["dashboard", range],
    queryFn: () =>
      apiClient.get<DashboardData>(`/api/dashboard?range=${range}`),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const dashboardData = response?.data;
  const isOwner = dashboardData?.role === "OWNER";
  const ownerData = isOwner ? (dashboardData as OwnerDashboardData) : null;
  const cashierData = !isOwner ? (dashboardData as CashierDashboardData) : null;

  const formattedToday = useMemo(() => {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "full",
      timeZone: "Asia/Jakarta",
    }).format(new Date());
  }, []);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError || !dashboardData) {
    return (
      <div className="py-6 sm:py-10">
        <ErrorStatePanel
          title="Gagal Memuat Dashboard"
          description="Terjadi kendala saat mengambil ringkasan data toko dari server."
          onRetry={() => refetch()}
          retryLabel="Muat Ulang Data"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-7">
      <PageLoadingBanner isRefetching={isFetching && !isLoading} />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-foreground">
              {isOwner ? "Dashboard & Ringkasan Toko" : "Dashboard Kasir"}
            </h1>
            {isFetching && (
              <span
                className="size-2 rounded-full bg-primary animate-ping"
                title="Memperbarui data..."
              />
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 capitalize">
            {formattedToday}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {isOwner && (
            <div className="inline-flex rounded-xl bg-muted p-1 border border-border/80 relative">
              {(["1d", "7d", "30d"] as const).map((r) => {
                const isActive = range === r;
                const label = r === "1d" ? "Hari Ini" : r === "7d" ? "7 Hari" : "30 Hari";
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    className={`relative z-10 min-h-11 sm:min-h-9 px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                      isActive
                        ? "text-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {isActive && (
                      <m.span
                        layoutId="dashboard-period-indicator"
                        className="absolute inset-0 z-[-1] rounded-lg bg-card shadow-xs border border-border/40"
                        transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      />
                    )}
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-xl size-11 sm:size-10"
            title="Muat ulang data"
            aria-label="Muat ulang data"
          >
            <RotateCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>

          <Link href="/pos">
            <Button className="gap-2 rounded-xl font-semibold shadow-xs min-h-11 sm:min-h-10">
              <Plus className="size-4" />
              <span>Buat Nota</span>
            </Button>
          </Link>
        </div>
      </div>

      <DashboardKpiSection
        isOwner={isOwner}
        ownerData={ownerData}
        cashierData={cashierData}
        activeQueueCount={dashboardData.kpi.activeQueueCount}
      />

      {isOwner && ownerData && (
        <DashboardChartsSection ownerData={ownerData} range={range} />
      )}

      <DashboardRecentOrders recentOrders={dashboardData.recentOrders ?? []} />
    </div>
  );
}
