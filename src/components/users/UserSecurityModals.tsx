"use client";

import React from "react";
import { ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { UserItem } from "./types";

interface ResetPasswordDialogProps {
  target: UserItem | null;
  onClose: () => void;
  newPassword: string;
  onPasswordChange: (val: string) => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function ResetPasswordDialog({
  target,
  onClose,
  newPassword,
  onPasswordChange,
  isSubmitting,
  onSubmit,
}: ResetPasswordDialogProps) {
  return (
    <Dialog open={Boolean(target)} onOpenChange={(next) => !next && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="truncate">
            Reset Password: @{target?.username}
          </DialogTitle>
          <DialogDescription>
            Tetapkan password baru untuk akun ini.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs sm:text-sm font-medium text-foreground">
              Password Baru
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="Minimal 8 karakter kombinasi huruf & angka"
              className="h-11 w-full rounded-xl border border-input bg-card px-3.5 text-base sm:text-sm text-foreground focus:border-ring focus:outline-none"
            />
          </div>

          <div className="rounded-xl bg-amber-500/10 p-3.5 text-xs leading-relaxed text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Setelah password direset, seluruh sesi login aktif pengguna ini di Web dan Android akan
            otomatis diputus seketika.
          </div>

          <DialogFooter>
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
              {isSubmitting ? "Mereset..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface RevokeSessionsDialogProps {
  target: UserItem | null;
  onClose: () => void;
  isSubmitting: boolean;
  onConfirm: () => void;
}

export function RevokeSessionsDialog({
  target,
  onClose,
  isSubmitting,
  onConfirm,
}: RevokeSessionsDialogProps) {
  return (
    <Dialog open={Boolean(target)} onOpenChange={(next) => !next && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <div className="flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <ShieldAlert className="size-6" />
        </div>
        <DialogHeader>
          <DialogTitle>Putus Sesi: @{target?.username}</DialogTitle>
          <DialogDescription>
            Tindakan ini mencabut seluruh sesi login aktif akun di Web maupun Android APK.
            Pengguna perlu masuk ulang memakai passwordnya.
          </DialogDescription>
        </DialogHeader>

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
          <Button
            type="button"
            variant="destructive"
            disabled={isSubmitting}
            onClick={onConfirm}
            className="min-h-11"
          >
            {isSubmitting ? "Memutus..." : "Ya, Putus Sesi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
