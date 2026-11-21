"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { m, AnimatePresence } from "motion/react";
import { EASE_SMOOTH, EASE_EXIT } from "@/lib/motion";

interface PreLoginSplashProps {
  onComplete: () => void;
}

export function PreLoginSplash({ onComplete }: PreLoginSplashProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasCheckedSession, setHasCheckedSession] = useState(false);
  const completedRef = useRef(false);

  const handleFinish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setIsVisible(false);
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const seen = sessionStorage.getItem("kgx_prelogin_splash_seen");
    const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Jika sudah pernah tampil di sesi tab ini atau pengguna memilih reduced motion, lewati
    if (seen === "true" || isReduced) {
      setHasCheckedSession(true);
      handleFinish();
      return;
    }

    sessionStorage.setItem("kgx_prelogin_splash_seen", "true");
    setIsVisible(true);
    setHasCheckedSession(true);

    // Durasi total ~1.25 detik sebelum fade out
    const timer = setTimeout(() => {
      handleFinish();
    }, 1250);

    return () => clearTimeout(timer);
  }, [handleFinish]);

  if (!hasCheckedSession) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <m.div
          key="prelogin-splash-overlay"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 0.98,
            transition: { duration: 0.28, ease: EASE_EXIT },
          }}
          onClick={handleFinish}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-6 select-none cursor-pointer"
          role="status"
          aria-live="polite"
          aria-label="Memuat aplikasi Ksatria Graphx. Ketuk untuk melanjutkan."
        >
          <div className="flex flex-col items-center text-center max-w-sm">
            {/* Emblem KG dengan Scale & Glow */}
            <m.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.45, ease: EASE_SMOOTH }}
              className="mb-5 flex size-20 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/20 ring-4 ring-primary/20"
            >
              <span className="font-black text-2xl tracking-tighter">KG</span>
            </m.div>

            {/* Judul & Subjudul Brand */}
            <m.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.35, ease: EASE_SMOOTH }}
              className="space-y-1"
            >
              <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                Ksatria Graphx
              </h1>
              <p className="text-xs font-medium text-muted-foreground">
                POS & Kalkulator Percetakan
              </p>
            </m.div>

            {/* Shimmer Progress Bar Halus */}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              className="mt-6 flex flex-col items-center gap-2"
            >
              <div className="h-1 w-32 overflow-hidden rounded-full bg-muted">
                <m.div
                  className="h-full bg-primary rounded-full"
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.1,
                    ease: "easeInOut",
                  }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground/80 tracking-wide uppercase">
                Ketuk layar untuk lewat
              </span>
            </m.div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
