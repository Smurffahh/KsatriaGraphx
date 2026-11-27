"use client";

import React from "react";
import {
  Search,
  KeyRound,
  Edit2,
  Lock,
  UserCheck,
  UserX,
  LogOut,
} from "lucide-react";
import { PageLoadingBanner } from "@/components/ui/page-loading-banner";
import { EmptyStatePanel } from "@/components/ui/state-panels";
import type { CurrentUser, UserItem } from "./types";

interface UserListSectionProps {
  users: UserItem[];
  currentUser: CurrentUser | null;
  isLoading: boolean;
  onEdit: (user: UserItem) => void;
  onResetPassword: (user: UserItem) => void;
  onRevokeSessions: (user: UserItem) => void;
}

export function UserListSection({
  users,
  currentUser,
  isLoading,
  onEdit,
  onResetPassword,
  onRevokeSessions,
}: UserListSectionProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xs">
      {isLoading ? (
        <div className="p-6 space-y-4">
          <PageLoadingBanner message="Memuat daftar pengguna..." />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-muted/60 animate-pulse" />
            ))}
          </div>
        </div>
      ) : users.length === 0 ? (
        <div className="p-4 sm:p-6">
          <EmptyStatePanel
            icon={Search}
            title="Tidak ada pengguna yang cocok"
            description="Coba sesuaikan kata kunci pencarian atau filter role dan status yang dipilih."
          />
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Pengguna</th>
                  <th className="px-4 py-3.5">Email</th>
                  <th className="px-4 py-3.5">Role</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Keamanan</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((item) => {
                  const isSelf = currentUser?.id === item.id;
                  const isLocked =
                    Boolean(item.lockedUntil) && new Date(item.lockedUntil as string) > new Date();

                  return (
                    <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted font-bold text-sm text-foreground">
                            {item.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 font-semibold text-foreground">
                              <span>{item.name}</span>
                              {isSelf && (
                                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                  Anda
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">@{item.username}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-muted-foreground">
                        {item.email || (
                          <span className="italic text-muted-foreground/60">Tanpa email</span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${
                            item.role === "OWNER"
                              ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                              : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-500/30"
                          }`}
                        >
                          {item.role}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        {item.isActive ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <UserCheck className="size-4" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                            <UserX className="size-4" />
                            Nonaktif
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {isLocked ? (
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                            <Lock className="size-3.5" />
                            Terkunci (5x Gagal)
                          </span>
                        ) : item.failedLoginAttempts > 0 ? (
                          <span className="text-xs text-amber-600 dark:text-amber-400 tabular-nums">
                            {item.failedLoginAttempts}x percobaan gagal
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Normal</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onEdit(item)}
                            className="flex size-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                            title="Edit Pengguna"
                            aria-label={`Edit ${item.name}`}
                          >
                            <Edit2 className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onResetPassword(item)}
                            className="flex size-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                            title="Reset Password"
                            aria-label={`Reset password ${item.name}`}
                          >
                            <KeyRound className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRevokeSessions(item)}
                            className="flex size-10 items-center justify-center rounded-xl text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                            title="Putus Semua Sesi"
                            aria-label={`Putus semua sesi ${item.name}`}
                          >
                            <LogOut className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-border md:hidden">
            {users.map((item) => {
              const isSelf = currentUser?.id === item.id;
              const isLocked =
                Boolean(item.lockedUntil) && new Date(item.lockedUntil as string) > new Date();

              return (
                <div key={item.id} className="p-4 sm:p-5 space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted font-bold text-sm text-foreground">
                        {item.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                          <span className="truncate">{item.name}</span>
                          {isSelf && (
                            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground shrink-0">
                              Anda
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          @{item.username}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold shrink-0 ${
                        item.role === "OWNER"
                          ? "bg-primary/10 text-primary"
                          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      }`}
                    >
                      {item.role}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <div className="truncate">{item.email || "Tanpa email"}</div>
                    <div className="shrink-0">
                      {item.isActive ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          Aktif
                        </span>
                      ) : (
                        <span className="text-muted-foreground font-medium">Nonaktif</span>
                      )}
                    </div>
                  </div>

                  {isLocked && (
                    <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
                      <Lock className="size-3.5 shrink-0" />
                      <span>Akun terkunci sementara karena 5 kali percobaan login gagal.</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <button
                      type="button"
                      onClick={() => onEdit(item)}
                      className="flex-1 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-xs sm:text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
                    >
                      <Edit2 className="size-4" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onResetPassword(item)}
                      className="flex-1 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-xs sm:text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
                    >
                      <KeyRound className="size-4" />
                      <span>Password</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRevokeSessions(item)}
                      className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
                      title="Putus Sesi"
                      aria-label={`Putus sesi ${item.name}`}
                    >
                      <LogOut className="size-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
