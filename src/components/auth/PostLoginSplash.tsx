"use client";

import React, { useEffect, useState } from "react";
import { m, AnimatePresence } from "motion/react";
import { Check, ShieldCheck, UserCheck } from "lucide-react";
import { EASE_SMOOTH, EASE_EXIT } from "@/lib/motion";

export interface PostLoginSplashProps {
  isVisible: boolean;
  userName: string;
  userRole: "OWNER" | "KASIR";
  statusStep: string;
  onExited?: () => void;
}

export function PostLoginSplash({
  isVisible,
  userName,
  userRole,
  statusStep,
  onExited,
}: PostLoginSplashProps) {
  const [showCheck, setShowCheck] = useState(false);

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => setShowCheck(true), 250);
      return () => clearTimeout(timer);
    } else {
      setShowCheck(false);
    }
  }, [isVisible]);

  return (
    <AnimatePresence onExitComplete={onExited}>
      {isVisible && (
        <m.div
          key="post-login-splash-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.02,
            transition: { duration: 0.32, ease: EASE_EXIT },
          }}
          transition={{ duration: 0.25, ease: EASE_SMOOTH }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 px-6 backdrop-blur-md select-none"
          role="status"
          aria-live="polite"
          aria-label="Menyiapkan sesi pengguna"
        >
          <div className="flex flex-col items-center text-center max-w-sm w-full">
            {/* Cincin Transformasi Logo -> Sukses Checkmark */}
            <m.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.35, ease: EASE_SMOOTH }}
              className="relative mb-6 flex size-20 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 ring-4 ring-primary/25"
            >
              <AnimatePresence mode="wait">
                {showCheck ? (
                  <m.div
                    key="check-icon"
                    initial={{ scale: 0, rotate: -20, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 380, damping: 22 }}
                    className="flex items-center justify-center"
                  >
                    <Check className="size-10 stroke-[2.75]" />
                  </m.div>
                ) : (
                  <m.span
                    key="kg-mark"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="font-black text-2xl tracking-tighter"
                  >
                    KG
                  </m.span>
                )}
              </AnimatePresence>
            </m.div>

            {/* Sapaan Personal */}
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.28, ease: EASE_SMOOTH }}
              className="space-y-1.5"
            >
              <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Selamat datang, {userName || "Pengguna"}
              </h2>

              <div className="flex items-center justify-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                    userRole === "OWNER"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                      : "bg-primary/10 text-primary border border-primary/20"
                  }`}
                >
                  {userRole === "OWNER" ? (
                    <ShieldCheck className="size-3" />
                  ) : (
                    <UserCheck className="size-3" />
                  )}
                  {userRole}
                </span>
                <span className="text-xs text-muted-foreground">• Ksatria Graphx</span>
              </div>
            </m.div>

            {/* Status Progres Memuat Data */}
            <m.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32, duration: 0.28, ease: EASE_SMOOTH }}
              className="mt-8 flex flex-col items-center gap-2.5 w-full"
            >
              <div className="h-1.5 w-48 overflow-hidden rounded-full bg-muted">
                <m.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: "15%" }}
                  animate={{
                    width:
                      statusStep.includes("Selesai")
                        ? "100%"
                        : statusStep.includes("ruang kerja")
                        ? "75%"
                        : "45%",
                  }}
                  transition={{ duration: 0.45, ease: EASE_SMOOTH }}
                />
              </div>

              <p className="text-xs text-muted-foreground font-medium animate-pulse">
                {statusStep}
              </p>
            </m.div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
