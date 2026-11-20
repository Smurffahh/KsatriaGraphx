"use client";

import React, { useEffect, useState } from "react";
import { isNativeApp } from "@/lib/platform";
import { ShieldAlert, Globe } from "lucide-react";

interface PlatformGateProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

export function PlatformGate({
  children,
  fallbackTitle = "Fitur Khusus Web",
  fallbackMessage = "Pengelolaan pengguna dan izin akses hanya dapat dikelola melalui browser Web komputer oleh Pemilik Usaha (Owner) demi alasan kepatuhan keamanan.",
}: PlatformGateProps) {
  const [isNative, setIsNative] = useState<boolean | null>(null);

  useEffect(() => {
    setIsNative(isNativeApp());
  }, []);

  if (isNative === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <div className="size-6 animate-spin rounded-full border-2 border-slate-900 border-t-transparent dark:border-slate-100" />
      </div>
    );
  }

  if (isNative) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:ring-amber-800/50">
          <ShieldAlert className="size-7" />
        </div>
        <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {fallbackTitle}
        </h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {fallbackMessage}
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <Globe className="size-4" />
          Silakan buka alamat aplikasi ini melalui browser Chrome/Firefox di laptop atau PC Anda.
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
