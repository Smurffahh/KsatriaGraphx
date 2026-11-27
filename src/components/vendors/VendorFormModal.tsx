"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2, Save, Building2, User, Phone, MapPin, Wrench, Clock, FileText } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";

export interface VendorData {
  id: string;
  name: string;
  contactName: string | null;
  whatsapp: string;
  address: string | null;
  specialty: string | null;
  leadTimeDays: number;
  notes: string | null;
  isActive: boolean;
}

interface VendorFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedVendor?: VendorData) => void;
  initialData?: VendorData | null;
}

export function VendorFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: VendorFormModalProps) {
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [leadTimeDays, setLeadTimeDays] = useState<string>("1");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setContactName(initialData.contactName || "");
      setWhatsapp(initialData.whatsapp || "");
      setSpecialty(initialData.specialty || "");
      setLeadTimeDays(String(initialData.leadTimeDays ?? 1));
      setAddress(initialData.address || "");
      setNotes(initialData.notes || "");
      setIsActive(Boolean(initialData.isActive));
    } else {
      setName("");
      setContactName("");
      setWhatsapp("");
      setSpecialty("");
      setLeadTimeDays("1");
      setAddress("");
      setNotes("");
      setIsActive(true);
    }
    setErrorMessage("");
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Nama vendor / percetakan wajib diisi.");
      return;
    }
    if (!whatsapp.trim()) {
      setErrorMessage("Nomor WhatsApp vendor wajib diisi.");
      return;
    }

    const parsedLeadTime = Math.max(0, parseInt(leadTimeDays || "1", 10) || 0);

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const payload = {
        name: name.trim(),
        contactName: contactName.trim() || null,
        whatsapp: whatsapp.trim(),
        specialty: specialty.trim() || null,
        leadTimeDays: parsedLeadTime,
        address: address.trim() || null,
        notes: notes.trim() || null,
        isActive,
      };

      const res = initialData?.id
        ? await apiClient.patch<VendorData>(`/api/vendors/${initialData.id}`, payload)
        : await apiClient.post<VendorData>("/api/vendors", payload);

      if (!res.success) {
        throw new Error(res.error || "Gagal menyimpan data vendor");
      }

      toast.success(
        initialData?.id ? "Data vendor mitra diperbarui" : "Vendor mitra baru ditambahkan"
      );
      onSuccess(res.data);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan data vendor";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]">
        <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6 border-b border-border bg-surface-muted/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <Building2 className="size-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-text truncate">
                {initialData ? "Ubah Data Vendor Mitra" : "Tambah Vendor Mitra"}
              </h2>
              <p className="text-xs sm:text-sm text-text-muted truncate">
                Kelola kontak percetakan atau konveksi rekanan (khusus Owner)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text rounded-xl hover:bg-surface-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 cursor-pointer"
            aria-label="Tutup modal vendor"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3.5 text-sm text-danger bg-danger/10 border border-danger/20 rounded-xl">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-xs sm:text-sm font-medium text-text-muted mb-1.5">
              Nama Vendor / Percetakan <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Percetakan Digital Putra / Konveksi Nusantara"
                required
                className="h-11 w-full pl-10 pr-4 text-base sm:text-sm bg-surface-muted border border-border rounded-xl text-text placeholder:text-text-muted/60 focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-text-muted mb-1.5">
                Nama PIC / Admin Order
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Contoh: Mas Andi"
                  className="h-11 w-full pl-10 pr-4 text-base sm:text-sm bg-surface-muted border border-border rounded-xl text-text placeholder:text-text-muted/60 focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-text-muted mb-1.5">
                Nomor WhatsApp <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="08123456789"
                  required
                  className="h-11 w-full pl-10 pr-4 text-base sm:text-sm tabular-nums bg-surface-muted border border-border rounded-xl text-text placeholder:text-text-muted/60 focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-text-muted mb-1.5">
                Spesialisasi Produksi
              </label>
              <div className="relative">
                <Wrench className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="Banner Flexi, Stiker A3+, Sablon Kaos"
                  className="h-11 w-full pl-10 pr-4 text-base sm:text-sm bg-surface-muted border border-border rounded-xl text-text placeholder:text-text-muted/60 focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-text-muted mb-1.5">
                Estimasi (Hari)
              </label>
              <div className="relative">
                <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={leadTimeDays}
                  onChange={(e) => setLeadTimeDays(e.target.value)}
                  className="h-11 w-full pl-10 pr-3 text-base sm:text-sm tabular-nums bg-surface-muted border border-border rounded-xl text-text focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-text-muted mb-1.5">
              Alamat Workshop Vendor
            </label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-3.5 size-4 text-text-muted" />
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Alamat pengambilan barang hasil cetak..."
                className="w-full pl-10 pr-4 py-2.5 text-base sm:text-sm bg-surface-muted border border-border rounded-xl text-text placeholder:text-text-muted/60 focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-text-muted mb-1.5">
              Catatan Internal (Rekening Setoran / Jam Tutup)
            </label>
            <div className="relative">
              <FileText className="absolute left-3.5 top-3.5 size-4 text-text-muted" />
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: BCA 1234567 a.n. Putra Digital, cut-off order jam 16.00"
                className="w-full pl-10 pr-4 py-2.5 text-base sm:text-sm bg-surface-muted border border-border rounded-xl text-text placeholder:text-text-muted/60 focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <input
              type="checkbox"
              id="vendorIsActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-4.5 rounded border-border text-primary focus:ring-primary"
            />
            <label htmlFor="vendorIsActive" className="text-sm font-medium text-text select-none">
              Vendor aktif &amp; tersedia untuk penugasan produksi
            </label>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 px-5 py-4 sm:px-6 border-t border-border bg-surface-muted/30">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-h-[44px] px-4 rounded-xl border border-border text-sm font-semibold text-text hover:bg-surface-muted transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex min-h-[44px] items-center gap-2 px-5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 transition-transform cursor-pointer"
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            <span>{isSubmitting ? "Menyimpan..." : "Simpan Vendor"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
