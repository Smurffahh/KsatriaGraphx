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

export default function AuditLogsPage() {
  const [currentUser, setCurrentUser] = useState<{ role: "OWNER" | "KASIR" } | null>(null);
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [selectedMetadata, setSelectedMetadata] = useState<Record<string, unknown> | null>(null);

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
  const { data, isLoading, isError, refetch, isFetching } = useQuery<AuditLogResponse>({
    queryKey: ["audit-logs", actionFilter, entityFilter, startDate, endDate, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: "25",
        ...(actionFilter ? { action: actionFilter } : {}),
        ...(entityFilter ? { entityType: entityFilter } : {}),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      });

      const res = await apiClient<AuditLogResponse>(`/api/audit-logs?${params.toString()}`);
      if (!res.success || !res.data) {
        throw new Error(res.error || "Gagal memuat log audit");
      }
      return res.data;
    },
    enabled: isOwner,
  });

  if (currentUser && !isOwner) {
    return (
      <div className="w-full max-w-xl mx-auto my-12 p-8 rounded-2xl bg-surface border border-border text-center space-y-4">
        <div className="size-14 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
          <Lock className="size-7" />
        </div>
        <h1 className="text-xl font-bold text-text">Akses Dibatasi</h1>
        <p className="text-xs text-text-muted">
          Halaman Audit Log Forensik hanya dapat diakses oleh akun dengan peran Owner. Silakan kembali ke menu kasir.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-text">Audit Log Forensik</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
              Owner Only
            </span>
          </div>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            Rekam jejak forensik seluruh aktivitas sistem yang tidak dapat dimanipulasi
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-2 text-text-muted hover:text-text bg-surface border border-border rounded-xl hover:bg-surface-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-50 self-start sm:self-auto"
          aria-label="Segarkan log audit"
        >
          <RotateCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Filter Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase tracking-wider">
          <Filter className="size-3.5" />
          <span>Filter Aktivitas</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Filter Aksi */}
          <div>
            <label className="block text-[11px] font-medium text-text-muted mb-1">Jenis Aksi</label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-surface-muted border border-border rounded-xl text-text focus:outline-hidden focus:ring-2 focus:ring-primary min-h-[44px]"
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
            <label className="block text-[11px] font-medium text-text-muted mb-1">
              Entitas Sistem
            </label>
            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-surface-muted border border-border rounded-xl text-text focus:outline-hidden focus:ring-2 focus:ring-primary min-h-[44px]"
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
            <label className="block text-[11px] font-medium text-text-muted mb-1">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-surface-muted border border-border rounded-xl text-text focus:outline-hidden focus:ring-2 focus:ring-primary min-h-[44px]"
            />
          </div>

          {/* Sampai Tanggal */}
          <div>
            <label className="block text-[11px] font-medium text-text-muted mb-1">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-surface-muted border border-border rounded-xl text-text focus:outline-hidden focus:ring-2 focus:ring-primary min-h-[44px]"
            />
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-surface border border-border" />
          ))}
        </div>
      )}

      {/* Error Banner */}
      {isError && (
        <div className="p-6 rounded-2xl bg-danger/10 border border-danger/20 text-center space-y-2">
          <AlertCircle className="size-6 text-danger mx-auto" />
          <p className="text-xs text-danger font-semibold">Gagal memuat log audit</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-3 py-1.5 bg-danger text-white text-xs font-semibold rounded-lg hover:bg-danger/90 min-h-[38px]"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Data Loaded */}
      {!isLoading && !isError && data && (
        <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>
              Total <strong>{data.pagination.total}</strong> aktivitas tercatat
            </span>
            <span>
              Halaman {data.pagination.page} dari {data.pagination.totalPages}
            </span>
          </div>

          {data.auditLogs.length === 0 ? (
            <div className="p-12 text-center text-xs text-text-muted space-y-2">
              <ShieldCheck className="size-8 mx-auto text-text-muted/60" />
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
                      className="p-3.5 rounded-xl bg-surface-muted/50 border border-border space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                            isDanger
                              ? "bg-danger/10 text-danger"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {log.action}
                        </span>
                        <span className="text-[10px] text-text-muted font-mono">
                          {new Date(log.createdAt).toLocaleDateString("id-ID", {
                            timeZone: "Asia/Jakarta",
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-text">
                        <span className="font-semibold">{log.actorName || "Sistem"}</span>
                        <span className="text-[11px] text-text-muted font-mono">
                          {log.ipAddress || "-"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-text-muted pt-1 border-t border-border/40">
                        <span>
                          {log.entityType}
                          {log.entityId ? `: ${log.entityId.slice(0, 8)}...` : ""}
                        </span>
                        {log.metadata && (
                          <button
                            type="button"
                            onClick={() => setSelectedMetadata(log.metadata)}
                            className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                          >
                            <Code2 className="size-3" />
                            <span>Metadata</span>
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
                    <tr className="border-b border-border text-text-muted">
                      <th className="py-3 px-3 font-semibold">Waktu (WIB)</th>
                      <th className="py-3 px-3 font-semibold">Aksi</th>
                      <th className="py-3 px-3 font-semibold">Aktor</th>
                      <th className="py-3 px-3 font-semibold">Entitas</th>
                      <th className="py-3 px-3 font-semibold">Platform & IP</th>
                      <th className="py-3 px-3 font-semibold text-right">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {data.auditLogs.map((log) => {
                      const isDanger =
                        log.action.includes("VOID") || log.action.includes("FAILURE");
                      return (
                        <tr key={log.id} className="hover:bg-surface-muted/40 transition-colors">
                          <td className="py-3 px-3 font-mono text-[11px] text-text-muted whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString("id-ID", {
                              timeZone: "Asia/Jakarta",
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                isDanger
                                  ? "bg-danger/10 text-danger border border-danger/20"
                                  : "bg-primary/10 text-primary border border-primary/20"
                              }`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-text">
                              {log.actorName || "Sistem"}
                            </div>
                            <div className="text-[10px] text-text-muted">
                              {log.actorUsername ? `@${log.actorUsername}` : "-"}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-medium text-text">{log.entityType}</div>
                            {log.entityId && (
                              <div className="text-[10px] font-mono text-text-muted truncate max-w-[120px]">
                                {log.entityId}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5 text-text">
                              {log.platform === "WEB" ? (
                                <Monitor className="size-3 text-text-muted" />
                              ) : (
                                <Smartphone className="size-3 text-text-muted" />
                              )}
                              <span className="font-mono text-[11px]">{log.ipAddress || "-"}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            {log.metadata ? (
                              <button
                                type="button"
                                onClick={() => setSelectedMetadata(log.metadata)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-muted hover:bg-border text-text rounded-lg text-[11px] font-semibold transition-colors min-h-[32px]"
                              >
                                <Code2 className="size-3" />
                                <span>Lihat</span>
                              </button>
                            ) : (
                              <span className="text-text-muted text-[11px]">-</span>
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
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1 px-3 py-2 bg-surface border border-border hover:bg-surface-muted rounded-xl text-xs font-semibold text-text transition-colors disabled:opacity-40 min-h-[44px]"
                  >
                    <ChevronLeft className="size-4" />
                    <span>Sebelumnya</span>
                  </button>

                  <span className="text-xs text-text-muted font-medium">
                    Halaman {data.pagination.page} dari {data.pagination.totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={page >= data.pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="inline-flex items-center gap-1 px-3 py-2 bg-surface border border-border hover:bg-surface-muted rounded-xl text-xs font-semibold text-text transition-colors disabled:opacity-40 min-h-[44px]"
                  >
                    <span>Berikutnya</span>
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Metadata Viewer Modal */}
      {selectedMetadata && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="size-4 text-primary" />
                <h3 className="font-bold text-sm text-text">Metadata Rincian Aktivitas</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMetadata(null)}
                className="p-1.5 text-text-muted hover:text-text rounded-lg hover:bg-surface-muted transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                aria-label="Tutup rincian metadata"
              >
                <X className="size-4" />
              </button>
            </div>

            <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto max-h-80 border border-slate-800">
              {JSON.stringify(selectedMetadata, null, 2)}
            </pre>

            <button
              type="button"
              onClick={() => setSelectedMetadata(null)}
              className="w-full py-2.5 bg-surface-muted hover:bg-border text-text rounded-xl text-xs font-semibold transition-colors min-h-[44px]"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
