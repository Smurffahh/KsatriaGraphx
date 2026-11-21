"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { isNativeApp } from "@/lib/platform";
import { resolveApiUrl } from "@/lib/api/client";
import {
  APP_VERSION,
  compareSemver,
  type AppVersionResponse,
} from "@/lib/version";

const STORAGE_KEY_DISMISSED = "kgx_dismissed_update_version";

async function fetchAppVersion(): Promise<AppVersionResponse> {
  const isNative = isNativeApp();
  const url = resolveApiUrl("/api/app/version", isNative);

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-Client-Platform": isNative ? "android" : "web",
    },
  });

  if (!res.ok) {
    throw new Error(`Gagal memuat status versi (${res.status})`);
  }

  const json = await res.json();
  return {
    ...json,
    hasUpdate: compareSemver(json.latestVersion || APP_VERSION, APP_VERSION) > 0,
  };
}

export function useAppUpdate() {
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManualChecking, setIsManualChecking] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_DISMISSED);
      if (stored) {
        setDismissedVersion(stored);
      }
    } catch {
      // Abaikan jika local storage tidak tersedia
    }
  }, []);

  const {
    data: versionData,
    isLoading,
    refetch,
  } = useQuery<AppVersionResponse>({
    queryKey: ["app-version"],
    queryFn: fetchAppVersion,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const latestVersion = versionData?.latestVersion || APP_VERSION;
  const rawHasUpdate = Boolean(versionData?.hasUpdate);
  const isDismissed = dismissedVersion === latestVersion;
  const isUpdateAvailable = rawHasUpdate && !isDismissed;

  const dismissUpdate = useCallback((versionToDismiss?: string) => {
    const v = versionToDismiss || latestVersion;
    try {
      localStorage.setItem(STORAGE_KEY_DISMISSED, v);
      setDismissedVersion(v);
    } catch {
      // Abaikan error localStorage
    }
    setIsModalOpen(false);
  }, [latestVersion]);

  const checkForUpdatesManual = useCallback(async () => {
    setIsManualChecking(true);
    try {
      const result = await refetch();
      const freshData = result.data;
      if (freshData?.hasUpdate) {
        setIsModalOpen(true);
        toast.info(
          `Tersedia pembaruan versi v${freshData.latestVersion}!`,
          {
            description: "Buka dialog pembaruan untuk melihat rincian perbaikan.",
          }
        );
      } else {
        toast.success("Aplikasi sudah menggunakan versi terbaru", {
          description: `Versi aktif: v${APP_VERSION} • Tidak ada pembaruan tertunda.`,
        });
      }
    } catch {
      toast.error("Gagal memeriksa pembaruan", {
        description: "Pastikan koneksi internet aktif dan coba beberapa saat lagi.",
      });
    } finally {
      setIsManualChecking(false);
    }
  }, [refetch]);

  return {
    versionData,
    currentVersion: APP_VERSION,
    latestVersion,
    hasUpdate: rawHasUpdate,
    isUpdateAvailable,
    isLoading,
    isManualChecking,
    isModalOpen,
    setIsModalOpen,
    dismissUpdate,
    checkForUpdatesManual,
  };
}
