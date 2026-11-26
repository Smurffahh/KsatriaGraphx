"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Search,
  KeyRound,
  ShieldAlert,
  Edit2,
  Lock,
  UserCheck,
  UserX,
  X,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { PlatformGate } from "@/components/layout/PlatformGate";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import { PageLoadingBanner } from "@/components/ui/page-loading-banner";

interface UserItem {
  id: string;
  name: string;
  username: string;
  email: string | null;
  role: "OWNER" | "KASIR";
  isActive: boolean;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CurrentUser {
  id: string;
  name: string;
  role: "OWNER" | "KASIR";
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Feedback states
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<UserItem | null>(null);
  const [revokeSessionsTarget, setRevokeSessionsTarget] = useState<UserItem | null>(null);

  // Form states - Add
  const [addForm, setAddForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    role: "KASIR" as "OWNER" | "KASIR",
  });
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Form states - Edit
  const [editForm, setEditForm] = useState({
    name: "",
    username: "",
    email: "",
    role: "KASIR" as "OWNER" | "KASIR",
    isActive: true,
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Form states - Reset Password
  const [newPassword, setNewPassword] = useState("");
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);

  // Action loading - Revoke Sessions
  const [isRevokingSessions, setIsRevokingSessions] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const meRes = await apiClient<{ user: CurrentUser }>("/api/auth/me");
      if (meRes.success && meRes.data?.user) {
        if (meRes.data.user.role === "KASIR") {
          toast.error("Akses ditolak: Halaman Kelola Pengguna hanya untuk Pemilik Usaha (Owner).");
          router.replace("/dashboard");
          return;
        }
        setCurrentUser(meRes.data.user);
      }

      const usersRes = await apiClient<{ users: UserItem[] }>("/api/users");
      if (usersRes.success && usersRes.data?.users) {
        setUsers(usersRes.data.users);
      } else if (usersRes.error) {
        setFeedback({ type: "error", message: usersRes.error });
      }
    } catch {
      setFeedback({ type: "error", message: "Gagal memuat data pengguna dari server." });
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function showSuccess(msg: string) {
    toast.success(msg);
    setFeedback({ type: "success", message: msg });
    setTimeout(() => {
      setFeedback((prev) => (prev?.message === msg ? null : prev));
    }, 4000);
  }

  function showError(msg: string) {
    toast.error(msg);
    setFeedback({ type: "error", message: msg });
  }

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const query = searchQuery.toLowerCase().trim();
      const matchQuery =
        !query ||
        u.name.toLowerCase().includes(query) ||
        u.username.toLowerCase().includes(query) ||
        (u.email && u.email.toLowerCase().includes(query));

      const matchRole = roleFilter === "ALL" || u.role === roleFilter;
      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && u.isActive) ||
        (statusFilter === "INACTIVE" && !u.isActive);

      return matchQuery && matchRole && matchStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Handlers
  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmittingAdd(true);
    setFeedback(null);

    const payload = {
      name: addForm.name.trim(),
      username: addForm.username.trim().toLowerCase(),
      email: addForm.email.trim() || undefined,
      password: addForm.password,
      role: addForm.role,
    };

    const res = await apiClient("/api/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    setIsSubmittingAdd(false);

    if (res.success) {
      setIsAddModalOpen(false);
      setAddForm({ name: "", username: "", email: "", password: "", role: "KASIR" });
      showSuccess("Pengguna baru berhasil ditambahkan.");
      loadData();
    } else {
      showError(res.error || "Gagal menambahkan pengguna.");
    }
  }

  function openEditModal(target: UserItem) {
    setEditingUser(target);
    setEditForm({
      name: target.name,
      username: target.username,
      email: target.email || "",
      role: target.role,
      isActive: target.isActive,
    });
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;

    setIsSubmittingEdit(true);
    setFeedback(null);

    const payload = {
      name: editForm.name.trim(),
      username: editForm.username.trim().toLowerCase(),
      email: editForm.email.trim() || null,
      role: editForm.role,
      isActive: editForm.isActive,
    };

    const res = await apiClient(`/api/users/${editingUser.id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    setIsSubmittingEdit(false);

    if (res.success) {
      setEditingUser(null);
      showSuccess("Data pengguna berhasil diperbarui.");
      loadData();
    } else {
      showError(res.error || "Gagal memperbarui data pengguna.");
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetPasswordTarget) return;

    setIsSubmittingReset(true);
    setFeedback(null);

    const res = await apiClient(`/api/users/${resetPasswordTarget.id}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ password: newPassword }),
    });

    setIsSubmittingReset(false);

    if (res.success) {
      setResetPasswordTarget(null);
      setNewPassword("");
      showSuccess(`Password akun ${resetPasswordTarget.username} berhasil direset.`);
      loadData();
    } else {
      showError(res.error || "Gagal mereset password pengguna.");
    }
  }

  async function handleRevokeSessions() {
    if (!revokeSessionsTarget) return;

    setIsRevokingSessions(true);
    setFeedback(null);

    const res = await apiClient(`/api/users/${revokeSessionsTarget.id}/revoke-sessions`, {
      method: "POST",
    });

    setIsRevokingSessions(false);

    if (res.success) {
      setRevokeSessionsTarget(null);
      showSuccess(`Seluruh sesi ${revokeSessionsTarget.username} telah diputus seketika.`);
      loadData();
    } else {
      showError(res.error || "Gagal memutus sesi pengguna.");
    }
  }

  return (
    <PlatformGate
      fallbackTitle="Manajemen Pengguna Khusus Web"
      fallbackMessage="Pengaturan akun kasir dan hak akses sistem hanya diizinkan melalui antarmuka Web Komputer demi alasan keamanan operasional."
    >
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-foreground">
              Manajemen Pengguna
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Kelola akun kasir, pemilik usaha, hak akses, dan keamanan sesi operasional.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={loadData}
              className="flex size-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              aria-label="Segarkan Data"
            >
              <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 active:scale-95 transition-colors cursor-pointer"
            >
              <UserPlus className="size-4" />
              <span>Tambah Pengguna</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            role="alert"
            className={`flex items-start gap-3 rounded-xl p-4 text-sm ${
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800/40"
                : "bg-destructive/10 text-destructive ring-1 ring-destructive/20"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            ) : (
              <AlertCircle className="size-4 shrink-0 text-destructive mt-0.5" />
            )}
            <div className="flex-1 font-medium">{feedback.message}</div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-muted-foreground hover:text-foreground p-1"
              aria-label="Tutup pesan"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between shadow-2xs">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, username, atau email..."
              className="h-11 w-full rounded-xl border border-input bg-card pl-10 pr-3.5 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <div className="flex items-center gap-2.5">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-11 rounded-xl border border-input bg-card px-3.5 text-base sm:text-sm font-medium text-foreground focus:border-ring focus:outline-none"
            >
              <option value="ALL">Semua Role</option>
              <option value="OWNER">Owner</option>
              <option value="KASIR">Kasir</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 rounded-xl border border-input bg-card px-3.5 text-base sm:text-sm font-medium text-foreground focus:border-ring focus:outline-none"
            >
              <option value="ALL">Semua Status</option>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Nonaktif</option>
            </select>
          </div>
        </div>

        {/* Users Table / List */}
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
          ) : filteredUsers.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Search className="size-6" />
              </div>
              <h3 className="mt-3 text-base font-semibold text-foreground">
                Tidak ada pengguna yang cocok
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Coba sesuaikan kata kunci pencarian atau filter status yang dipilih.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop View Table */}
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
                    {filteredUsers.map((item) => {
                      const isSelf = currentUser?.id === item.id;
                      const isLocked = item.lockedUntil && new Date(item.lockedUntil) > new Date();

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
                            {item.email || <span className="italic text-muted-foreground/60">Tanpa email</span>}
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
                              <span className="text-xs text-amber-600 dark:text-amber-400">
                                {item.failedLoginAttempts}x percobaan gagal
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Normal</span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openEditModal(item)}
                                className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                                title="Edit Pengguna"
                                aria-label={`Edit ${item.name}`}
                              >
                                <Edit2 className="size-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setResetPasswordTarget(item)}
                                className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                                title="Reset Password"
                                aria-label={`Reset password ${item.name}`}
                              >
                                <KeyRound className="size-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setRevokeSessionsTarget(item)}
                                className="flex size-9 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
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

              {/* Mobile Card View */}
              <div className="divide-y divide-border md:hidden">
                {filteredUsers.map((item) => {
                  const isSelf = currentUser?.id === item.id;
                  const isLocked = item.lockedUntil && new Date(item.lockedUntil) > new Date();

                  return (
                    <div key={item.id} className="p-4 sm:p-5 space-y-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted font-bold text-sm text-foreground">
                            {item.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
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

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div>{item.email || "Tanpa email"}</div>
                        <div>
                          {item.isActive ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Aktif</span>
                          ) : (
                            <span className="text-muted-foreground font-medium">Nonaktif</span>
                          )}
                        </div>
                      </div>

                      {isLocked && (
                        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive">
                          <Lock className="size-3.5 shrink-0" />
                          <span>Akun terkunci sementara karena 5 kali percobaan login gagal.</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-2 border-t border-border">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="flex-1 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-xs sm:text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
                        >
                          <Edit2 className="size-4" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setResetPasswordTarget(item)}
                          className="flex-1 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-xs sm:text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
                        >
                          <KeyRound className="size-4" />
                          <span>Password</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRevokeSessionsTarget(item)}
                          className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
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
      </div>

      {/* Modal Tambah Pengguna */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-xs"
            onClick={() => !isSubmittingAdd && setIsAddModalOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
              <h2 className="text-lg font-semibold text-foreground">Tambah Pengguna Baru</h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="flex size-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                aria-label="Tutup"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs sm:text-sm font-medium text-foreground">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="Contoh: Danang Satria"
                  className="h-11 w-full rounded-xl border border-input bg-card px-3.5 text-base sm:text-sm text-foreground focus:border-ring focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs sm:text-sm font-medium text-foreground">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={addForm.username}
                  onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                  placeholder="Hanya huruf, angka, dan garis bawah"
                  className="h-11 w-full rounded-xl border border-input bg-card px-3.5 text-base sm:text-sm text-foreground focus:border-ring focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs sm:text-sm font-medium text-foreground">
                  Email (Opsional)
                </label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  placeholder="nama@email.com"
                  className="h-11 w-full rounded-xl border border-input bg-card px-3.5 text-base sm:text-sm text-foreground focus:border-ring focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs sm:text-sm font-medium text-foreground">
                  Password Awal
                </label>
                <input
                  type="password"
                  required
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  placeholder="Minimal 8 karakter (huruf & angka)"
                  className="h-11 w-full rounded-xl border border-input bg-card px-3.5 text-base sm:text-sm text-foreground focus:border-ring focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs sm:text-sm font-medium text-foreground">
                  Peran / Role
                </label>
                <div className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/40 px-3.5 py-3">
                  <span className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary shrink-0">
                    KASIR
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Akun baru otomatis ditetapkan sebagai Kasir (kebijakan 1 Owner tunggal).
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
                <button
                  type="button"
                  disabled={isSubmittingAdd}
                  onClick={() => setIsAddModalOpen(false)}
                  className="min-h-[44px] rounded-xl border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingAdd ? "Menyimpan..." : "Simpan Pengguna"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Pengguna */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-xs"
            onClick={() => !isSubmittingEdit && setEditingUser(null)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
              <h2 className="text-lg font-semibold text-foreground">
                Edit Pengguna: @{editingUser.username}
              </h2>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="flex size-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                aria-label="Tutup"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs sm:text-sm font-medium text-foreground">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="h-11 w-full rounded-xl border border-input bg-card px-3.5 text-base sm:text-sm text-foreground focus:border-ring focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs sm:text-sm font-medium text-foreground">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  className="h-11 w-full rounded-xl border border-input bg-card px-3.5 text-base sm:text-sm text-foreground focus:border-ring focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs sm:text-sm font-medium text-foreground">
                  Email (Opsional)
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="h-11 w-full rounded-xl border border-input bg-card px-3.5 text-base sm:text-sm text-foreground focus:border-ring focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs sm:text-sm font-medium text-foreground">
                  Peran / Role
                </label>
                {editingUser.role === "OWNER" ? (
                  <div className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/40 px-3.5 py-3">
                    <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400 shrink-0">
                      OWNER
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Akun Owner tunggal tidak dapat diubah perannya.
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/40 px-3.5 py-3">
                    <span className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary shrink-0">
                      KASIR
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Sistem menerapkan kebijakan 1 Owner tunggal. Akun tidak dapat dipromosikan.
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <label
                  className={`flex items-center gap-2.5 ${
                    editingUser.role === "OWNER" ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={editingUser.role === "OWNER" || currentUser?.id === editingUser.id}
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="size-4.5 rounded border-input text-primary focus:ring-ring"
                  />
                  <span className="text-xs sm:text-sm font-medium text-foreground">
                    Akun Aktif (Dapat Login ke Sistem)
                  </span>
                </label>
                {editingUser.role === "OWNER" ? (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Akun Owner tunggal tidak dapat dinonaktifkan.
                  </p>
                ) : currentUser?.id === editingUser.id ? (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Anda tidak dapat menonaktifkan akun Anda sendiri.
                  </p>
                ) : null}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
                <button
                  type="button"
                  disabled={isSubmittingEdit}
                  onClick={() => setEditingUser(null)}
                  className="min-h-[44px] rounded-xl border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingEdit ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reset Password */}
      {resetPasswordTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-xs"
            onClick={() => !isSubmittingReset && setResetPasswordTarget(null)}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
              <h2 className="text-base sm:text-lg font-semibold text-foreground truncate">
                Reset Password: @{resetPasswordTarget.username}
              </h2>
              <button
                type="button"
                onClick={() => setResetPasswordTarget(null)}
                className="flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                aria-label="Tutup"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs sm:text-sm font-medium text-foreground">
                  Password Baru
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 8 karakter kombinasi huruf & angka"
                  className="h-11 w-full rounded-xl border border-input bg-card px-3.5 text-base sm:text-sm text-foreground focus:border-ring focus:outline-none"
                />
              </div>

              <div className="rounded-xl bg-amber-500/10 p-3.5 text-xs leading-relaxed text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Setelah password direset, seluruh sesi login aktif pengguna ini di Web dan Android akan otomatis
                diputus seketika.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
                <button
                  type="button"
                  disabled={isSubmittingReset}
                  onClick={() => setResetPasswordTarget(null)}
                  className="min-h-[44px] rounded-xl border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReset}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingReset ? "Mereset..." : "Reset Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Revoke Sessions Confirmation */}
      {revokeSessionsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-xs"
            onClick={() => !isRevokingSessions && setRevokeSessionsTarget(null)}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <ShieldAlert className="size-6" />
            </div>
            <h3 className="mt-4 text-base sm:text-lg font-semibold text-foreground">
              Putus Sesi: @{revokeSessionsTarget.username}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Tindakan ini akan menaikkan versi token akun secara seketika dan mencabut seluruh sesi aktif
              pengguna di aplikasi Web maupun Android APK. Pengguna harus memasukkan password kembali untuk
              masuk.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isRevokingSessions}
                onClick={() => setRevokeSessionsTarget(null)}
                className="min-h-[44px] rounded-xl border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isRevokingSessions}
                onClick={handleRevokeSessions}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-destructive px-4 text-sm font-semibold text-destructive-foreground shadow-xs hover:bg-destructive/90 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isRevokingSessions ? "Memutus..." : "Ya, Putus Sesi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PlatformGate>
  );
}
