"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { PostLoginSplash } from "@/components/auth/PostLoginSplash";

interface PostLoginTransitionOptions {
  userName: string;
  userRole: "OWNER" | "KASIR";
  targetUrl?: string;
  onReady?: () => void;
}

interface SplashTransitionContextType {
  triggerPostLoginTransition: (options: PostLoginTransitionOptions) => void;
  isTransitioning: boolean;
}

const SplashTransitionContext = createContext<SplashTransitionContextType | null>(null);

export function useSplashTransition() {
  const context = useContext(SplashTransitionContext);
  if (!context) {
    throw new Error("useSplashTransition harus digunakan di dalam SplashTransitionProvider");
  }
  return context;
}

export function SplashTransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isVisible, setIsVisible] = useState(false);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState<"OWNER" | "KASIR">("KASIR");
  const [statusStep, setStatusStep] = useState("Memverifikasi sesi...");
  const transitionActiveRef = useRef(false);

  const triggerPostLoginTransition = useCallback(
    ({ userName, userRole, targetUrl = "/dashboard", onReady }: PostLoginTransitionOptions) => {
      if (transitionActiveRef.current) return;
      transitionActiveRef.current = true;

      setUserName(userName);
      setUserRole(userRole);
      setStatusStep("Memverifikasi sesi...");
      setIsVisible(true);

      const isReduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // Pemanasan data riil di background secara paralel
      try {
        queryClient.prefetchQuery({
          queryKey: ["dashboard", "today"],
          queryFn: () => apiClient("/api/dashboard?period=today").then((res) => res.data),
          staleTime: 30 * 1000,
        });

        queryClient.prefetchQuery({
          queryKey: ["products", "active"],
          queryFn: () =>
            apiClient("/api/products?includeInactive=false").then(
              (res) => (res.data || []).filter((p: { isActive: boolean }) => p.isActive)
            ),
          staleTime: 60 * 1000,
        });

        queryClient.prefetchQuery({
          queryKey: ["quick-calc-settings"],
          queryFn: () =>
            apiClient<{ storeName: string }>("/api/settings/public").then(
              (res) => res.data || { storeName: "Ksatria Graphx" }
            ),
          staleTime: 10 * 60 * 1000,
        });
      } catch {
        // Abaikan kegagalan prefetch - halaman tujuan tetap bisa fetch mandiri
      }

      if (isReduced) {
        // Transisi instan untuk pengguna reduced-motion
        setTimeout(() => {
          router.replace(targetUrl);
          if (onReady) onReady();
          setIsVisible(false);
          transitionActiveRef.current = false;
        }, 150);
        return;
      }

      // Step 2: Menyiapkan ruang kerja
      const step2Timer = setTimeout(() => {
        setStatusStep("Menyiapkan ruang kerja & memuat data toko...");
      }, 350);

      // Step 3: Pengalihan mulus
      const step3Timer = setTimeout(() => {
        setStatusStep("Selesai! Mengalihkan ke sistem...");
        router.replace(targetUrl);
        if (onReady) onReady();

        // Singkap overlay setelah navigasi dipicu
        setTimeout(() => {
          setIsVisible(false);
          transitionActiveRef.current = false;
        }, 320);
      }, 1250);

      return () => {
        clearTimeout(step2Timer);
        clearTimeout(step3Timer);
      };
    },
    [router, queryClient]
  );

  return (
    <SplashTransitionContext.Provider
      value={{
        triggerPostLoginTransition,
        isTransitioning: isVisible,
      }}
    >
      {children}
      <PostLoginSplash
        isVisible={isVisible}
        userName={userName}
        userRole={userRole}
        statusStep={statusStep}
        onExited={() => {
          transitionActiveRef.current = false;
        }}
      />
    </SplashTransitionContext.Provider>
  );
}
