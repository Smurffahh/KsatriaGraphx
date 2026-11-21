"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useTheme } from "next-themes";

function ThemeAwareToaster() {
  const { resolvedTheme } = useTheme();

  return (
    <Toaster
      theme={(resolvedTheme as "light" | "dark") || "system"}
      richColors
      closeButton
      duration={3500}
      position="top-right"
      mobileOffset={{ top: "env(safe-area-inset-top, 16px)", left: "16px", right: "16px" }}
      toastOptions={{
        className: "font-sans border border-border shadow-md rounded-[var(--radius)]",
        style: {
          background: "var(--popover)",
          color: "var(--popover-foreground)",
          borderColor: "var(--border)",
        },
      }}
    />
  );
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            gcTime: 5 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ThemeAwareToaster />
    </QueryClientProvider>
  );
}
