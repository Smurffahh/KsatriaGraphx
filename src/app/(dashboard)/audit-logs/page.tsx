"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  Filter,
  RotateCw,
  AlertCircle,
  Monitor,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  Code2,
  X,
  Lock,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { PageLoadingBanner } from "@/components/ui/page-loading-banner";
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

  // Check Current User Role
  useEffect(() => {
    apiClient<{ user: { role: "OWNER" | "KASIR" } }>("/api/auth/me")
      .then((res) => {
        if (res.success && res.data?.user) {
          setCurrentUser(res.data.user);
        }
      })
      .catch(() => {});
  }, []);

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
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="size-6 text-primary" />
            <span>Audit Log Forensik</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
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
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
          <Filter className="size-3.5" />
          <span>Filter Aktivitas</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Filter Aksi */}
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">
              Jenis Tindakan (Action)
            </label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-muted/50 border border-border rounded-xl text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary min-h-[44px]"
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
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">
              Entitas Sistem
            </label>
            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-muted/50 border border-border rounded-xl text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary min-h-[44px]"
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
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-muted/50 border border-border rounded-xl text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary min-h-[44px]"
            />
          </div>

          {/* Sampai Tanggal */}
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-muted/50 border border-border rounded-xl text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary min-h-[44px]"
            />
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && <AuditLogsSkeleton />}

      {/* Error Banner */}
      {isError && (
        <div className="p-6 rounded-2xl bg-destructive/10 border border-destructive/20 text-center space-y-2">
          <AlertCircle className="size-6 text-destructive mx-auto" />
          <p className="text-xs text-destructive font-semibold">
            Gagal memuat log audit
          </p>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => refetch()}
            className="min-h-[38px]"
          >
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Data Loaded */}
      {!isLoading && !isError && data && (
        <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Total <strong>{data.pagination.total}</strong> aktivitas tercatat
            </span>
            <span>
              Halaman {data.pagination.page} dari {data.pagination.totalPages}
            </span>
          </div>

          {data.auditLogs.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
              <ShieldCheck className="size-8 mx-auto text-muted-foreground/60" />
              <p>Tidak ada log aktivitas sesuai kriteria pencarian.</p>
            </div>
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
                      className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                            isDanger
                              ? "bg-destructive/10 text-destructive"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {log.action}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(log.createdAt).toLocaleDateString("id-ID", {
                            timeZone: "Asia/Jakarta",
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-foreground">
                        <span className="font-semibold">
                          {log.actorName || "Sistem"}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {log.ipAddress || "-"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                        <div className="flex items-center gap-1.5">
                          {log.platform === "WEB" ? (
                            <Monitor className="size-3.5 text-blue-500" />
                          ) : (
                            <Smartphone className="size-3.5 text-emerald-500" />
                          )}
                          <span>
                            {log.entityType}
                            {log.entityId ? ` #${log.entityId.slice(0, 8)}` : ""}
                          </span>
                        </div>

                        {log.metadata && (
                          <button
                            type="button"
                            onClick={() => setSelectedMetadata(log.metadata)}
                            className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-mono"
                          >
                            <Code2 className="size-3" />
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
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground bg-muted/30">
                      <th className="py-3 px-3 font-semibold">Waktu (WIB)</th>
                      <th className="py-3 px-3 font-semibold">Aktor / Pengguna</th>
                      <th className="py-3 px-3 font-semibold">Tindakan</th>
                      <th className="py-3 px-3 font-semibold">Entitas</th>
                      <th className="py-3 px-3 font-semibold">Platform & IP</th>
                      <th className="py-3 px-3 font-semibold text-right">Rincian Metadata</th>
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
                          <td className="py-3 px-3 font-mono text-muted-foreground whitespace-nowrap">
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
                          <td className="py-3 px-3">
                            <div className="font-semibold text-foreground">
                              {log.actorName || "Sistem"}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {log.actorRole || "SYSTEM"}
                              {log.actorUsername ? ` (@${log.actorUsername})` : ""}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold rounded font-mono ${
                                isDanger
                                  ? "bg-destructive/10 text-destructive"
                                  : "bg-primary/10 text-primary"
                              }`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-foreground">
                            {log.entityType}
                            {log.entityId && (
                              <div className="text-[10px] text-muted-foreground">
                                ID: {log.entityId.slice(0, 10)}...
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5 font-medium text-foreground">
                              {log.platform === "WEB" ? (
                                <Monitor className="size-3.5 text-blue-500" />
                              ) : (
                                <Smartphone className="size-3.5 text-emerald-500" />
                              )}
                              <span>{log.platform}</span>
                            </div>
                            <div className="text-[10px] font-mono text-muted-foreground">
                              {log.ipAddress || "-"}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            {log.metadata ? (
                              <button
                                type="button"
                                onClick={() => setSelectedMetadata(log.metadata)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono rounded-lg bg-muted hover:bg-border text-foreground transition-colors min-h-[36px]"
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
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground">
                    Halaman {data.pagination.page} dari{" "}
                    {data.pagination.totalPages}
                  </span>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="gap-1 min-h-[44px]"
                    >
                      <ChevronLeft className="size-4" />
                      <span>Sebelumnya</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((p) => Math.min(data.pagination.totalPages, p + 1))
                      }
                      disabled={page >= data.pagination.totalPages}
                      className="gap-1 min-h-[44px]"
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
                <h3 className="font-bold text-sm sm:text-base text-foreground">
                  Inspeksi Payload Metadata
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMetadata(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
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
                size="sm"
                onClick={() => setSelectedMetadata(null)}
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
