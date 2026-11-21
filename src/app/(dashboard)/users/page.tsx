"use client";

import React, { useEffect, useState, useMemo } from "react";
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

  async function loadData() {
    setIsLoading(true);
    try {
      const [meRes, usersRes] = await Promise.all([
        apiClient<{ user: CurrentUser }>("/api/auth/me"),
        apiClient<{ users: UserItem[] }>("/api/users"),
      ]);

      if (meRes.success && meRes.data?.user) {
        setCurrentUser(meRes.data.user);
      }

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
  }

  useEffect(() => {
    loadData();
  }, []);

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
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
              Manajemen Pengguna
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Kelola akun kasir, pemilik usaha, hak akses, dan keamanan sesi operasional.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              className="flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Segarkan Data"
            >
              <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 active:scale-95 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
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
            className={`flex items-start gap-3 rounded-2xl p-4 text-xs ${
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800/40"
                : "bg-rose-50 text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-800/40"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <div className="flex-1 font-medium">{feedback.message}</div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, username, atau email..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="ALL">Semua Role</option>
              <option value="OWNER">Owner</option>
              <option value="KASIR">Kasir</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="ALL">Semua Status</option>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Nonaktif</option>
            </select>
          </div>
        </div>

        {/* Users Table / List */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {isLoading ? (
            <div className="flex min-h-64 items-center justify-center p-8">
              <div className="flex flex-col items-center gap-2">
                <div className="size-6 animate-spin rounded-full border-2 border-slate-900 border-t-transparent dark:border-slate-100" />
                <span className="text-xs text-slate-500">Memuat data pengguna...</span>
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                <Search className="size-6" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                Tidak ada pengguna yang cocok
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Coba sesuaikan kata kunci pencarian atau filter status yang dipilih.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop View Table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
                    <tr>
                      <th className="px-5 py-3.5">Pengguna</th>
                      <th className="px-4 py-3.5">Email</th>
                      <th className="px-4 py-3.5">Role</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5">Keamanan</th>
                      <th className="px-5 py-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredUsers.map((item) => {
                      const isSelf = currentUser?.id === item.id;
                      const isLocked = item.lockedUntil && new Date(item.lockedUntil) > new Date();

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex size-9 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {item.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                                  <span>{item.name}</span>
                                  {isSelf && (
                                    <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                      Anda
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500">@{item.username}</div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4 text-slate-600 dark:text-slate-400">
                            {item.email || <span className="italic text-slate-400">Tanpa email</span>}
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                item.role === "OWNER"
                                  ? "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-500/30"
                                  : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-500/30"
                              }`}
                            >
                              {item.role}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            {item.isActive ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                <UserCheck className="size-3.5" />
                                Aktif
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                                <UserX className="size-3.5" />
                                Nonaktif
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-4">
                            {isLocked ? (
                              <span className="inline-flex items-center gap-1 rounded bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                                <Lock className="size-3" />
                                Terkunci (5x Gagal)
                              </span>
                            ) : item.failedLoginAttempts > 0 ? (
                              <span className="text-[11px] text-amber-600 dark:text-amber-400">
                                {item.failedLoginAttempts}x percobaan gagal
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">Normal</span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openEditModal(item)}
                                className="flex size-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                title="Edit Pengguna"
                              >
                                <Edit2 className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setResetPasswordTarget(item)}
                                className="flex size-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                title="Reset Password"
                              >
                                <KeyRound className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setRevokeSessionsTarget(item)}
                                className="flex size-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                                title="Putus Semua Sesi"
                              >
                                <LogOut className="size-3.5" />
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
              <div className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
                {filteredUsers.map((item) => {
                  const isSelf = currentUser?.id === item.id;
                  const isLocked = item.lockedUntil && new Date(item.lockedUntil) > new Date();

                  return (
                    <div key={item.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-10 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {item.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
                              <span>{item.name}</span>
                              {isSelf && (
                                <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                  Anda
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">@{item.username}</div>
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            item.role === "OWNER"
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                          }`}
                        >
                          {item.role}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                        <div>{item.email || "Tanpa email"}</div>
                        <div>
                          {item.isActive ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Aktif</span>
                          ) : (
                            <span className="text-slate-400 font-medium">Nonaktif</span>
                          )}
                        </div>
                      </div>

                      {isLocked && (
                        <div className="flex items-center gap-1.5 rounded-lg bg-rose-50 p-2 text-[11px] text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                          <Lock className="size-3" />
                          <span>Akun terkunci sementara karena 5 kali percobaan login gagal.</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                          <Edit2 className="size-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setResetPasswordTarget(item)}
                          className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                          <KeyRound className="size-3.5" />
                          <span>Password</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRevokeSessionsTarget(item)}
                          className="flex size-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-400"
                          title="Putus Sesi"
                        >
                          <LogOut className="size-3.5" />
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
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => !isSubmittingAdd && setIsAddModalOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Tambah Pengguna Baru</h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="Contoh: Danang Satria"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={addForm.username}
                  onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                  placeholder="Hanya huruf, angka, dan garis bawah"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Email (Opsional)
                </label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  placeholder="nama@email.com"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Password Awal
                </label>
                <input
                  type="password"
                  required
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  placeholder="Minimal 8 karakter (huruf & angka)"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Peran / Role
                </label>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm({ ...addForm, role: e.target.value as "OWNER" | "KASIR" })}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="KASIR">KASIR - Operasional POS, Pesanan & Cetak Nota</option>
                  <option value="OWNER">OWNER - Akses Penuh Termasuk Manajemen Pengguna</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isSubmittingAdd}
                  onClick={() => setIsAddModalOpen(false)}
                  className="h-10 rounded-xl px-4 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 active:scale-95 disabled:opacity-50 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
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
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => !isSubmittingEdit && setEditingUser(null)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Edit Pengguna: @{editingUser.username}
              </h2>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Email (Opsional)
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Peran / Role
                </label>
                <select
                  value={editForm.role}
                  disabled={currentUser?.id === editingUser.id}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as "OWNER" | "KASIR" })}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 disabled:bg-slate-100 disabled:text-slate-500 focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-800/50"
                >
                  <option value="KASIR">KASIR</option>
                  <option value="OWNER">OWNER</option>
                </select>
                {currentUser?.id === editingUser.id && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Anda tidak dapat mengubah role akun Anda sendiri.
                  </p>
                )}
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={currentUser?.id === editingUser.id}
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="size-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 dark:border-slate-700 dark:bg-slate-800"
                  />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Akun Aktif (Dapat Login ke Sistem)
                  </span>
                </label>
                {currentUser?.id === editingUser.id && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Anda tidak dapat menonaktifkan akun Anda sendiri.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isSubmittingEdit}
                  onClick={() => setEditingUser(null)}
                  className="h-10 rounded-xl px-4 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 active:scale-95 disabled:opacity-50 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
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
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => !isSubmittingReset && setResetPasswordTarget(null)}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Reset Password: @{resetPasswordTarget.username}
              </h2>
              <button
                type="button"
                onClick={() => setResetPasswordTarget(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Password Baru
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 8 karakter kombinasi huruf & angka"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="rounded-xl bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                Setelah password direset, seluruh sesi login aktif pengguna ini di Web dan Android akan otomatis
                diputus seketika.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isSubmittingReset}
                  onClick={() => setResetPasswordTarget(null)}
                  className="h-10 rounded-xl px-4 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReset}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 active:scale-95 disabled:opacity-50 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
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
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => !isRevokingSessions && setRevokeSessionsTarget(null)}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex size-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
              <ShieldAlert className="size-6" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-slate-100">
              Putus Sesi: @{revokeSessionsTarget.username}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Tindakan ini akan menaikkan versi token akun secara seketika dan mencabut seluruh sesi aktif
              pengguna di aplikasi Web maupun Android APK. Pengguna harus memasukkan password kembali untuk
              masuk.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isRevokingSessions}
                onClick={() => setRevokeSessionsTarget(null)}
                className="h-10 rounded-xl px-4 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isRevokingSessions}
                onClick={handleRevokeSessions}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-rose-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 active:scale-95 disabled:opacity-50"
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
