"use client";

import React, { useEffect, useRef, useState } from "react";
import { formatRupiah } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number;
  format?: "currency" | "integer" | "decimal";
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export function AnimatedNumber({
  value,
  format = "integer",
  duration = 450,
  className = "",
  prefix = "",
  suffix = "",
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState<number>(value);
  const previousValueRef = useRef<number>(value);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const isReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (isReducedMotion || duration <= 0) {
      setDisplayValue(value);
      previousValueRef.current = value;
      return;
    }

    const startValue = previousValueRef.current;
    const diff = value - startValue;

    if (diff === 0) {
      setDisplayValue(value);
      return;
    }

    const startTime = performance.now();

    const updateCounter = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic: 1 - pow(1 - progress, 3)
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentVal = startValue + diff * easeProgress;

      setDisplayValue(currentVal);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(updateCounter);
      } else {
        setDisplayValue(value);
        previousValueRef.current = value;
      }
    };

    animationFrameRef.current = requestAnimationFrame(updateCounter);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [value, duration]);

  const formattedText = (() => {
    if (format === "currency") {
      return formatRupiah(Math.round(displayValue));
    }
    if (format === "decimal") {
      return displayValue.toLocaleString("id-ID", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
      });
    }
    return Math.round(displayValue).toLocaleString("id-ID");
  })();

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {formattedText}
      {suffix}
    </span>
  );
}
