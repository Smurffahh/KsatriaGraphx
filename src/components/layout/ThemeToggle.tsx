"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  if (!mounted) {
    return (
      <div
        className={`size-10 rounded-xl border border-border/60 bg-surface/50 ${className}`}
        aria-hidden="true"
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex size-10 items-center justify-center rounded-xl border border-border/80 bg-surface text-foreground shadow-xs transition-colors hover:bg-muted hover:text-foreground active:scale-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring ${className}`}
      aria-label={
        isDark ? "Beralih ke mode terang" : "Beralih ke mode gelap"
      }
      title={isDark ? "Mode Terang" : "Mode Gelap"}
    >
      {isDark ? (
        <Sun className="size-4 text-amber-400 transition-transform hover:rotate-45" />
      ) : (
        <Moon className="size-4 text-slate-700 transition-transform hover:-rotate-12" />
      )}
    </button>
  );
}
