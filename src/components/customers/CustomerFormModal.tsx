"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2, Save, User, Phone, MapPin, FileText } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";

export interface CustomerData {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
}

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedCustomer?: CustomerData) => void;
  initialData?: CustomerData | null;
}

export function CustomerFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: CustomerFormModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setPhone(initialData.phone || "");
      setAddress(initialData.address || "");
      setNotes(initialData.notes || "");
    } else {
      setName("");
      setPhone("");
      setAddress("");
      setNotes("");
    }
    setErrorMessage("");
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Nama pelanggan wajib diisi");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      };

      let res;
      if (initialData?.id) {
        res = await apiClient.patch<CustomerData>(
          `/api/customers/${initialData.id}`,
          payload
        );
      } else {
        res = await apiClient.post<CustomerData>("/api/customers", payload);
      }

      if (!res.success) {
        throw new Error(res.error || "Gagal menyimpan data pelanggan");
      }

      toast.success(
        initialData?.id
          ? "Data pelanggan berhasil diperbarui"
          : "Pelanggan baru berhasil ditambahkan"
      );
      onSuccess(res.data);
      onClose();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      const msg = errorObj.message || "Gagal menyimpan data pelanggan";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6 border-b border-border bg-surface-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <User className="size-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-text">
                {initialData ? "Ubah Data Pelanggan" : "Tambah Pelanggan Baru"}
              </h2>
              <p className="text-xs sm:text-sm text-text-muted">
                Simpan kontak untuk riwayat nota dan pesanan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text rounded-xl hover:bg-surface-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3.5 text-sm text-danger bg-danger/10 border border-danger/20 rounded-xl">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-xs sm:text-sm font-medium text-text-muted mb-1.5">
              Nama Lengkap / Instansi <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Budi Santoso / PT Maju Jaya"
                required
                className="h-11 w-full pl-10 pr-4 text-base sm:text-sm bg-surface-muted border border-border rounded-xl text-text placeholder:text-text-muted/60 focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary transition-[color,background-color,border-color,box-shadow]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-text-muted mb-1.5">
              Nomor WhatsApp
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08123456789 atau 628..."
                className="h-11 w-full pl-10 pr-4 text-base sm:text-sm bg-surface-muted border border-border rounded-xl text-text placeholder:text-text-muted/60 focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary transition-[color,background-color,border-color,box-shadow]"
              />
            </div>
            <p className="mt-1.5 text-xs text-text-muted">
              Format otomatis disesuaikan ke standar Indonesia (628...).
            </p>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-text-muted mb-1.5">
              Alamat
            </label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-3.5 size-4 text-text-muted" />
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                placeholder="Alamat kantor / tempat tinggal..."
                className="w-full pl-10 pr-4 py-2.5 text-base sm:text-sm bg-surface-muted border border-border rounded-xl text-text placeholder:text-text-muted/60 focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary transition-[color,background-color,border-color,box-shadow]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-text-muted mb-1.5">
              Catatan Khusus
            </label>
            <div className="relative">
              <FileText className="absolute left-3.5 top-3.5 size-4 text-text-muted" />
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Catatan preferensi desain, tempo bayar, dll..."
                className="w-full pl-10 pr-4 py-2.5 text-base sm:text-sm bg-surface-muted border border-border rounded-xl text-text placeholder:text-text-muted/60 focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary transition-[color,background-color,border-color,box-shadow]"
              />
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-sm font-medium text-text-muted hover:text-text rounded-xl hover:bg-surface-muted transition-colors min-h-[44px] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-primary hover:bg-primary-hover text-white rounded-xl shadow-xs transition-colors min-h-[44px] disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  <span>{initialData ? "Simpan Perubahan" : "Simpan Pelanggan"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
