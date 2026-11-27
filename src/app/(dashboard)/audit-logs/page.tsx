"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  Filter,
  RotateCw,
  Monitor,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  Code2,
  X,
  Lock,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { PageLoadingBanner } from "@/components/ui/page-loading-banner";
import { EmptyStatePanel, ErrorStatePanel } from "@/components/ui/state-panels";
import { Button } from "@/components/ui/button";

interface AuditLogItem {
  id: string;
  userId: string | null;
  actorName: string | null;
  actorUsername: string | null;
  actorRole: "OWNER" | "KASIR" | null;
  action: string;
  entityType: string;
  entityId: string | null;
  platform: "WEB" | "APK";
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface AuditLogResponse {
  auditLogs: AuditLogItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

function AuditLogsSkeleton() {
  return (
    <div className="space-y-4">
      <PageLoadingBanner message="Memuat log aktivitas..." />
      <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-xs space-y-4">
      <Skeleton className="h-4 w-48 rounded-md" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-border/40"
          >
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-3 w-48 rounded-md" />
            </div>
            <Skeleton className="h-6 w-20 rounded-md" />
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}

export default function AuditLogsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{
    role: "OWNER" | "KASIR";
  } | null>(null);
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [selectedMetadata, setSelectedMetadata] = useState<Record<
    string,
    unknown
  > | null>(null);

  // Check Current User Role & Redirect if Kasir
  useEffect(() => {
    apiClient<{ user: { role: "OWNER" | "KASIR" } }>("/api/auth/me")
      .then((res) => {
        if (res.success && res.data?.user) {
          if (res.data.user.role === "KASIR") {
            toast.error("Akses ditolak: Audit Log hanya dapat diakses oleh Pemilik Usaha (Owner).");
            router.replace("/dashboard");
            return;
          }
          setCurrentUser(res.data.user);
        }
      })
      .catch(() => {});
  }, [router]);

  const isOwner = currentUser?.role === "OWNER";

  // Query audit logs
  const { data, isLoading, isError, refetch, isFetching } =
    useQuery<AuditLogResponse>({
      queryKey: [
        "audit-logs",
        actionFilter,
        entityFilter,
        startDate,
        endDate,
        page,
      ],
      queryFn: async () => {
        const params = new URLSearchParams({
          page: String(page),
          limit: "25",
          ...(actionFilter ? { action: actionFilter } : {}),
          ...(entityFilter ? { entityType: entityFilter } : {}),
          ...(startDate ? { startDate } : {}),
          ...(endDate ? { endDate } : {}),
        });

        const res = await apiClient<AuditLogResponse>(
          `/api/audit-logs?${params.toString()}`
        );
        if (!res.success || !res.data) {
          throw new Error(res.error || "Gagal memuat log audit");
        }
        return res.data;
      },
      enabled: isOwner,
    });

  if (currentUser && !isOwner) {
    return (
      <div className="w-full max-w-xl mx-auto my-12 p-8 rounded-2xl bg-card border border-border text-center space-y-4">
        <div className="size-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <Lock className="size-7" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Akses Dibatasi</h1>
        <p className="text-xs text-muted-foreground">
          Halaman Audit Log Forensik hanya dapat diakses oleh akun dengan peran
          Owner. Silakan kembali ke menu kasir.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageLoadingBanner isRefetching={isFetching && !isLoading} />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-foreground flex items-center gap-2.5">
            <ShieldCheck className="size-6 sm:size-7 text-primary shrink-0" />
            <span>Audit Log Forensik</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Rekam jejak aktivitas sensitif: transaksi, pembatalan nota, login, dan
            perubahan master data
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => refetch()}
          disabled={isFetching}
          className="min-h-[44px] min-w-[44px]"
          aria-label="Segarkan log audit"
        >
          <RotateCw
            className={`size-4 ${isFetching ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      {/* Filter Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <Filter className="size-4" />
          <span>Filter Aktivitas</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Filter Aksi */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
              Jenis Tindakan (Action)
            </label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="h-11 w-full px-3.5 text-base sm:text-sm bg-muted/50 border border-border rounded-xl text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
            >
              <option value="">Semua Aksi</option>
              <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
              <option value="LOGIN_FAILURE">LOGIN_FAILURE</option>
              <option value="CREATE_ORDER">CREATE_ORDER</option>
              <option value="VOID_ORDER">VOID_ORDER</option>
              <option value="UPDATE_ORDER_STATUS">UPDATE_ORDER_STATUS</option>
              <option value="ADD_PAYMENT">ADD_PAYMENT</option>
              <option value="EXPORT_CSV">EXPORT_CSV</option>
              <option value="CREATE_USER">CREATE_USER</option>
              <option value="UPDATE_USER">UPDATE_USER</option>
              <option value="UPDATE_SETTINGS">UPDATE_SETTINGS</option>
            </select>
          </div>

          {/* Filter Entitas */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
              Entitas Sistem
            </label>
            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
              className="h-11 w-full px-3.5 text-base sm:text-sm bg-muted/50 border border-border rounded-xl text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
            >
              <option value="">Semua Entitas</option>
              <option value="AUTH">AUTH</option>
              <option value="USER">USER</option>
              <option value="ORDER">ORDER</option>
              <option value="PAYMENT">PAYMENT</option>
              <option value="REPORT">REPORT</option>
              <option value="SETTINGS">SETTINGS</option>
              <option value="PRODUCT">PRODUCT</option>
            </select>
          </div>

          {/* Dari Tanggal */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="h-11 w-full px-3.5 text-base sm:text-sm bg-muted/50 border border-border rounded-xl text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Sampai Tanggal */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="h-11 w-full px-3.5 text-base sm:text-sm bg-muted/50 border border-border rounded-xl text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && <AuditLogsSkeleton />}

      {isError && (
        <ErrorStatePanel
          title="Gagal memuat log audit"
          description="Periksa koneksi Anda lalu coba segarkan log aktivitas."
          onRetry={() => refetch()}
          retryLabel="Coba Lagi"
        />
      )}

      {!isLoading && !isError && data && (
        <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap text-xs sm:text-sm text-muted-foreground tabular-nums">
            <span>
              Total <strong>{data.pagination.total}</strong> aktivitas tercatat
            </span>
            <span>
              Halaman {data.pagination.page} dari {data.pagination.totalPages}
            </span>
          </div>

          {data.auditLogs.length === 0 ? (
            <EmptyStatePanel
              icon={ShieldCheck}
              title="Belum ada aktivitas tercatat"
              description="Tidak ada log aktivitas yang cocok dengan kriteria pencarian dan tanggal."
            />
          ) : (
            <>
              {/* Mobile Card List (<640px) */}
              <div className="space-y-3 sm:hidden">
                {data.auditLogs.map((log) => {
                  const isDanger =
                    log.action.includes("VOID") || log.action.includes("FAILURE");
                  return (
                    <div
                      key={log.id}
                      className="p-4 rounded-xl bg-muted/40 border border-border space-y-2.5 text-xs sm:text-sm"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span
                          className={`px-2.5 py-0.5 text-xs font-semibold rounded-md ${
                            isDanger
                              ? "bg-destructive/10 text-destructive"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {log.action}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {new Date(log.createdAt).toLocaleDateString("id-ID", {
                            timeZone: "Asia/Jakarta",
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-foreground">
                        <span className="font-semibold text-sm">
                          {log.actorName || "Sistem"}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {log.ipAddress || "-"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground pt-2 border-t border-border/40">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {log.platform === "WEB" ? (
                            <Monitor className="size-4 text-blue-500 shrink-0" />
                          ) : (
                            <Smartphone className="size-4 text-emerald-500 shrink-0" />
                          )}
                          <span className="truncate">
                            {log.entityType}
                            {log.entityId ? ` #${log.entityId.slice(0, 8)}` : ""}
                          </span>
                        </div>

                        {log.metadata && (
                          <button
                            type="button"
                            onClick={() => setSelectedMetadata(log.metadata)}
                            className="inline-flex min-h-11 items-center gap-1.5 px-3 py-1.5 text-xs text-primary bg-primary/10 hover:bg-primary/20 rounded-xl font-mono font-medium shrink-0 cursor-pointer"
                          >
                            <Code2 className="size-3.5" />
                            <span>JSON</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table (>=640px) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground bg-muted/30">
                      <th className="py-3.5 px-4 font-semibold">Waktu (WIB)</th>
                      <th className="py-3.5 px-4 font-semibold">Aktor / Pengguna</th>
                      <th className="py-3.5 px-4 font-semibold">Tindakan</th>
                      <th className="py-3.5 px-4 font-semibold">Entitas</th>
                      <th className="py-3.5 px-4 font-semibold">Platform &amp; IP</th>
                      <th className="py-3.5 px-4 font-semibold text-right">Rincian Metadata</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {data.auditLogs.map((log) => {
                      const isDanger =
                        log.action.includes("VOID") || log.action.includes("FAILURE");
                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-muted/20 transition-colors"
                        >
                          <td className="py-3.5 px-4 font-mono text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleDateString(
                              "id-ID",
                              {
                                timeZone: "Asia/Jakarta",
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              }
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-foreground">
                              {log.actorName || "Sistem"}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {log.actorRole || "SYSTEM"}
                              {log.actorUsername ? ` (@${log.actorUsername})` : ""}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 text-xs font-semibold rounded-md font-mono ${
                                isDanger
                                  ? "bg-destructive/10 text-destructive"
                                  : "bg-primary/10 text-primary"
                              }`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-foreground">
                            {log.entityType}
                            {log.entityId && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                ID: {log.entityId.slice(0, 10)}...
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 font-medium text-foreground">
                              {log.platform === "WEB" ? (
                                <Monitor className="size-4 text-blue-500" />
                              ) : (
                                <Smartphone className="size-4 text-emerald-500" />
                              )}
                              <span>{log.platform}</span>
                            </div>
                            <div className="text-xs font-mono text-muted-foreground mt-0.5">
                              {log.ipAddress || "-"}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {log.metadata ? (
                              <button
                                type="button"
                                onClick={() => setSelectedMetadata(log.metadata)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-lg bg-muted hover:bg-border text-foreground transition-colors min-h-9 cursor-pointer"
                              >
                                <Code2 className="size-3.5 text-primary" />
                                <span>Lihat JSON</span>
                              </button>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {data.pagination.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    Halaman {data.pagination.page} dari{" "}
                    {data.pagination.totalPages}
                  </span>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="gap-1.5 min-h-[44px]"
                    >
                      <ChevronLeft className="size-4" />
                      <span>Sebelumnya</span>
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() =>
                        setPage((p) => Math.min(data.pagination.totalPages, p + 1))
                      }
                      disabled={page >= data.pagination.totalPages}
                      className="gap-1.5 min-h-[44px]"
                    >
                      <span>Berikutnya</span>
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* JSON Metadata Inspection Modal */}
      {selectedMetadata && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-card border border-border p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90dvh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="size-5 text-primary" />
                <h3 className="font-semibold text-base sm:text-lg text-foreground">
                  Inspeksi Payload Metadata
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMetadata(null)}
                className="flex size-10 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                aria-label="Tutup inspeksi JSON"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-muted/60 p-4 rounded-xl font-mono text-xs text-foreground scrollbar-thin border border-border/50">
              <pre className="whitespace-pre-wrap break-all">
                {JSON.stringify(selectedMetadata, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                variant="outline"
                onClick={() => setSelectedMetadata(null)}
                className="min-h-11"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
