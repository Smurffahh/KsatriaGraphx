"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { isNativeApp } from "@/lib/platform";
import { resolveApiUrl } from "@/lib/api/client";
import {
  APP_VERSION,
  compareSemver,
  type AppVersionResponse,
} from "@/lib/version";

const STORAGE_KEY_DISMISSED = "kgx_dismissed_update_version";

// Module-level reactive store untuk menyinkronkan dialog antar instance hook (AppShell vs Settings)
let globalIsModalOpen = false;
const modalSubscribers = new Set<(isOpen: boolean) => void>();

function setGlobalModalOpen(isOpen: boolean) {
  globalIsModalOpen = isOpen;
  modalSubscribers.forEach((cb) => cb(isOpen));
}

export interface UpdateCheckOutcome {
  status: "update-available" | "up-to-date" | "error";
  currentVersion: string;
  latestVersion: string | null;
  release: AppVersionResponse | null;
  errorMessage?: string;
}

export async function fetchAppVersion(force: boolean = false): Promise<AppVersionResponse> {
  const isNative = isNativeApp();
  const queryParams = new URLSearchParams();
  if (force) {
    queryParams.set("force", "1");
    queryParams.set("_t", String(Date.now()));
  }
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";
  const url = resolveApiUrl(`/api/app/version${queryString}`, isNative);

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-Client-Platform": isNative ? "apk" : "web",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Gagal memuat status versi (${res.status})`);
  }

  const json = (await res.json()) as AppVersionResponse;
  const targetLatest = json.latestVersion || APP_VERSION;
  const hasUpdate = compareSemver(targetLatest, APP_VERSION) > 0;

  return {
    ...json,
    latestVersion: targetLatest,
    hasUpdate,
  };
}

export function useAppUpdate() {
  const queryClient = useQueryClient();
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpenState] = useState(globalIsModalOpen);
  const [isManualChecking, setIsManualChecking] = useState(false);

  useEffect(() => {
    const handler = (open: boolean) => {
      setIsModalOpenState(open);
    };
    modalSubscribers.add(handler);
    return () => {
      modalSubscribers.delete(handler);
    };
  }, []);

  const setIsModalOpen = useCallback((open: boolean) => {
    setGlobalModalOpen(open);
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_DISMISSED);
      if (stored) {
        setDismissedVersion(stored);
      }
    } catch {
      // Abaikan jika localStorage tidak tersedia
    }
  }, []);

  const {
    data: versionData,
    isLoading,
  } = useQuery<AppVersionResponse>({
    queryKey: ["app-version"],
    queryFn: () => fetchAppVersion(false),
    staleTime: 3 * 60 * 1000,
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
  }, [latestVersion, setIsModalOpen]);

  const checkForUpdate = useCallback(
    async (options?: { force?: boolean; silent?: boolean }): Promise<UpdateCheckOutcome> => {
      const force = options?.force ?? true;
      const silent = options?.silent ?? false;

      setIsManualChecking(true);
      try {
        const freshData = await fetchAppVersion(force);
        queryClient.setQueryData(["app-version"], freshData);

        if (freshData.hasUpdate) {
          setIsModalOpen(true);
          if (!silent) {
            toast.info(`Tersedia pembaruan versi v${freshData.latestVersion}!`, {
              description: "Buka dialog pembaruan untuk melihat rincian perbaikan.",
            });
          }
          return {
            status: "update-available",
            currentVersion: APP_VERSION,
            latestVersion: freshData.latestVersion,
            release: freshData,
          };
        } else {
          if (!silent) {
            toast.success("Aplikasi sudah menggunakan versi terbaru", {
              description: `Versi aktif: v${APP_VERSION} • Tidak ada pembaruan tertunda.`,
            });
          }
          return {
            status: "up-to-date",
            currentVersion: APP_VERSION,
            latestVersion: freshData.latestVersion,
            release: freshData,
          };
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error && err.message
            ? err.message
            : "Gagal memeriksa pembaruan. Pastikan koneksi internet aktif.";

        if (!silent) {
          toast.error("Gagal memeriksa pembaruan", {
            description: "Pastikan koneksi internet aktif dan coba beberapa saat lagi.",
          });
        }
        return {
          status: "error",
          currentVersion: APP_VERSION,
          latestVersion: null,
          release: null,
          errorMessage: errorMsg,
        };
      } finally {
        setIsManualChecking(false);
      }
    },
    [queryClient, setIsModalOpen]
  );

  const checkForUpdatesManual = useCallback(async (): Promise<UpdateCheckOutcome> => {
    return checkForUpdate({ force: true, silent: false });
  }, [checkForUpdate]);

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
    checkForUpdate,
    checkForUpdatesManual,
  };
}
