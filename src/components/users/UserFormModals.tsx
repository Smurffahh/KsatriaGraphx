"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { CurrentUser, UserItem } from "./types";

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: {
    name: string;
    username: string;
    email: string;
    password: string;
    role: "OWNER" | "KASIR";
  };
  onFormChange: (next: AddUserDialogProps["form"]) => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function AddUserDialog({
  open,
  onOpenChange,
  form,
  onFormChange,
  isSubmitting,
  onSubmit,
}: AddUserDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Pengguna Baru</DialogTitle>
          <DialogDescription>
            Buat akun kasir operasional baru untuk login di Web atau APK Kasir.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs sm:text-sm font-medium text-foreground">
              Nama Lengkap
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => onFormChange({ ...form, name: e.target.value })}
              placeholder="Contoh: Budi Santoso"
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
              value={form.username}
              onChange={(e) => onFormChange({ ...form, username: e.target.value })}
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
              value={form.email}
              onChange={(e) => onFormChange({ ...form, email: e.target.value })}
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
              value={form.password}
              onChange={(e) => onFormChange({ ...form, password: e.target.value })}
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

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
              className="min-h-11"
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-h-11">
              {isSubmitting ? "Menyimpan..." : "Simpan Pengguna"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface EditUserDialogProps {
  target: UserItem | null;
  currentUser: CurrentUser | null;
  onClose: () => void;
  form: {
    name: string;
    username: string;
    email: string;
    role: "OWNER" | "KASIR";
    isActive: boolean;
  };
  onFormChange: (next: EditUserDialogProps["form"]) => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function EditUserDialog({
  target,
  currentUser,
  onClose,
  form,
  onFormChange,
  isSubmitting,
  onSubmit,
}: EditUserDialogProps) {
  return (
    <Dialog open={Boolean(target)} onOpenChange={(next) => !next && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Pengguna: @{target?.username}</DialogTitle>
          <DialogDescription>
            Perbarui identitas atau status aktif akun pengguna ini.
          </DialogDescription>
        </DialogHeader>

        {target && (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs sm:text-sm font-medium text-foreground">
                Nama Lengkap
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => onFormChange({ ...form, name: e.target.value })}
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
                value={form.username}
                onChange={(e) => onFormChange({ ...form, username: e.target.value })}
                className="h-11 w-full rounded-xl border border-input bg-card px-3.5 text-base sm:text-sm text-foreground focus:border-ring focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs sm:text-sm font-medium text-foreground">
                Email (Opsional)
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => onFormChange({ ...form, email: e.target.value })}
                className="h-11 w-full rounded-xl border border-input bg-card px-3.5 text-base sm:text-sm text-foreground focus:border-ring focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs sm:text-sm font-medium text-foreground">
                Peran / Role
              </label>
              {target.role === "OWNER" ? (
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

            <div className="pt-1">
              <label
                className={`flex items-center gap-2.5 min-h-11 ${
                  target.role === "OWNER" ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                }`}
              >
                <input
                  type="checkbox"
                  disabled={target.role === "OWNER" || currentUser?.id === target.id}
                  checked={form.isActive}
                  onChange={(e) => onFormChange({ ...form, isActive: e.target.checked })}
                  className="size-4.5 rounded border-input text-primary focus:ring-ring"
                />
                <span className="text-xs sm:text-sm font-medium text-foreground">
                  Akun Aktif (Dapat Login ke Sistem)
                </span>
              </label>
              {target.role === "OWNER" ? (
                <p className="text-xs text-muted-foreground">
                  Akun Owner tunggal tidak dapat dinonaktifkan.
                </p>
              ) : currentUser?.id === target.id ? (
                <p className="text-xs text-muted-foreground">
                  Anda tidak dapat menonaktifkan akun Anda sendiri.
                </p>
              ) : null}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={onClose}
                className="min-h-11"
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting} className="min-h-11">
                {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
