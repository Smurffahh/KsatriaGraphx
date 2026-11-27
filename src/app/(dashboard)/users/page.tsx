"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Search,
  X,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { PlatformGate } from "@/components/layout/PlatformGate";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UserListSection } from "@/components/users/UserListSection";
import { AddUserDialog, EditUserDialog } from "@/components/users/UserFormModals";
import {
  ResetPasswordDialog,
  RevokeSessionsDialog,
} from "@/components/users/UserSecurityModals";
import type { CurrentUser, UserItem } from "@/components/users/types";

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<UserItem | null>(null);
  const [revokeSessionsTarget, setRevokeSessionsTarget] = useState<UserItem | null>(null);

  const [addForm, setAddForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    role: "KASIR" as "OWNER" | "KASIR",
  });
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  const [editForm, setEditForm] = useState({
    name: "",
    username: "",
    email: "",
    role: "KASIR" as "OWNER" | "KASIR",
    isActive: true,
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);
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

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmittingAdd(true);
    setFeedback(null);

    const res = await apiClient("/api/users", {
      method: "POST",
      body: JSON.stringify({
        name: addForm.name.trim(),
        username: addForm.username.trim().toLowerCase(),
        email: addForm.email.trim() || undefined,
        password: addForm.password,
        role: addForm.role,
      }),
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

    const res = await apiClient(`/api/users/${editingUser.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: editForm.name.trim(),
        username: editForm.username.trim().toLowerCase(),
        email: editForm.email.trim() || null,
        role: editForm.role,
        isActive: editForm.isActive,
      }),
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
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={loadData}
              className="size-11 sm:size-10 rounded-xl"
              aria-label="Segarkan Data"
            >
              <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="gap-2 rounded-xl min-h-11 sm:min-h-10 font-semibold"
            >
              <UserPlus className="size-4" />
              <span>Tambah Pengguna</span>
            </Button>
          </div>
        </div>

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
              className="text-muted-foreground hover:text-foreground p-1 min-h-8 min-w-8 flex items-center justify-center rounded-lg"
              aria-label="Tutup pesan"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

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

          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Filter role pengguna"
              className="h-11 rounded-xl border border-input bg-card px-3.5 text-base sm:text-sm font-medium text-foreground focus:border-ring focus:outline-none"
            >
              <option value="ALL">Semua Role</option>
              <option value="OWNER">Owner</option>
              <option value="KASIR">Kasir</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter status pengguna"
              className="h-11 rounded-xl border border-input bg-card px-3.5 text-base sm:text-sm font-medium text-foreground focus:border-ring focus:outline-none"
            >
              <option value="ALL">Semua Status</option>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Nonaktif</option>
            </select>
          </div>
        </div>

        <UserListSection
          users={filteredUsers}
          currentUser={currentUser}
          isLoading={isLoading}
          onEdit={openEditModal}
          onResetPassword={setResetPasswordTarget}
          onRevokeSessions={setRevokeSessionsTarget}
        />
      </div>

      <AddUserDialog
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        form={addForm}
        onFormChange={setAddForm}
        isSubmitting={isSubmittingAdd}
        onSubmit={handleAddUser}
      />

      <EditUserDialog
        target={editingUser}
        currentUser={currentUser}
        onClose={() => setEditingUser(null)}
        form={editForm}
        onFormChange={setEditForm}
        isSubmitting={isSubmittingEdit}
        onSubmit={handleUpdateUser}
      />

      <ResetPasswordDialog
        target={resetPasswordTarget}
        onClose={() => setResetPasswordTarget(null)}
        newPassword={newPassword}
        onPasswordChange={setNewPassword}
        isSubmitting={isSubmittingReset}
        onSubmit={handleResetPassword}
      />

      <RevokeSessionsDialog
        target={revokeSessionsTarget}
        onClose={() => setRevokeSessionsTarget(null)}
        isSubmitting={isRevokingSessions}
        onConfirm={handleRevokeSessions}
      />
    </PlatformGate>
  );
}
