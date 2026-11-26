"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Upload, X, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";

interface ProductImageUploaderProps {
  currentImageUrl: string | null | undefined;
  onUploadSuccess: (result: { imageUrl: string; imageKey: string }) => void;
  onRemoveImage: () => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function ProductImageUploader({
  currentImageUrl,
  onUploadSuccess,
  onRemoveImage,
  disabled = false,
}: ProductImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bersihkan object URL saat unmount atau saat previewUrl berganti
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);

    // 1. Validasi tipe file di client
    if (!ACCEPTED_TYPES.includes(file.type)) {
      const msg = "Format file tidak didukung. Pilih file JPG, PNG, atau WebP.";
      setErrorMessage(msg);
      toast.error(msg);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // 2. Validasi ukuran file di client (Maks 2 MB)
    if (file.size > MAX_FILE_SIZE) {
      const msg = `Ukuran file (${(file.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas maksimal 2 MB.`;
      setErrorMessage(msg);
      toast.error(msg);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // 3. Buat local preview
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    // 4. Eksekusi upload ke endpoint aman
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await apiClient<{ imageUrl: string; imageKey: string }>(
        "/api/uploads/product-image",
        {
          method: "POST",
          body: formData,
        }
      );

      if (res.success && res.data) {
        setPreviewUrl(res.data.imageUrl);
        onUploadSuccess(res.data);
        toast.success("Foto produk berhasil diunggah");
      } else {
        const msg = res.error || "Gagal mengunggah foto produk.";
        setErrorMessage(msg);
        toast.error(msg);
        setPreviewUrl(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat mengunggah foto.";
      setErrorMessage(msg);
      toast.error(msg);
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleTriggerInput() {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  }

  function handleClear() {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setErrorMessage(null);
    onRemoveImage();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const activeDisplayUrl = previewUrl || currentImageUrl;

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
        Foto Produk (Opsional — Maks 2 MB)
      </label>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        disabled={disabled || isUploading}
        className="hidden"
        aria-label="Pilih Foto Produk"
      />

      {activeDisplayUrl ? (
        <div className="relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-start sm:gap-4 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="relative size-28 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs dark:border-slate-700 dark:bg-slate-800">
            <Image
              src={activeDisplayUrl}
              alt="Pratinjau Foto Produk"
              fill
              unoptimized={activeDisplayUrl.startsWith("blob:")}
              className="object-cover"
            />
            {isUploading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white backdrop-blur-xs">
                <RefreshCw className="size-5 animate-spin" />
                <span className="mt-1 text-xs font-medium">Mengunggah...</span>
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-1 flex-col justify-center sm:mt-0">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleTriggerInput}
                disabled={disabled || isUploading}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 active:scale-95 disabled:pointer-events-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                <RefreshCw className="size-3.5" />
                Ganti Foto
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={disabled || isUploading}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 active:scale-95 disabled:pointer-events-none disabled:opacity-50 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60 cursor-pointer"
              >
                <X className="size-3.5" />
                Hapus
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Otomatis dikonversi ke format WebP terkompresi tanpa metadata lokasi (EXIF).
            </p>
          </div>
        </div>
      ) : (
        <div
          onClick={handleTriggerInput}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleTriggerInput();
            }
          }}
          tabIndex={disabled || isUploading ? -1 : 0}
          role="button"
          aria-label="Klik untuk memilih foto produk"
          className={`flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-4 text-center transition-colors hover:border-slate-400 hover:bg-slate-100/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-900/30 dark:hover:border-slate-600 dark:hover:bg-slate-900/60 ${
            disabled ? "pointer-events-none opacity-50" : ""
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="size-6 animate-spin text-blue-600 dark:text-blue-400" />
              <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                Memproses &amp; mengunggah foto...
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex size-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <Upload className="size-4.5" />
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                Pilih atau seret foto produk ke sini
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                JPG, PNG, atau WebP (maksimal 2 MB)
              </p>
            </div>
          )}
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
          <AlertCircle className="size-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
