import type { Metadata, Viewport } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";

export const metadata: Metadata = {
  title: "Ksatria Graphx — POS & Kalkulator Percetakan",
  description: "Sistem kasir, kalkulator harga percetakan, dan manajemen penjualan Ksatria Graphx",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1e3a8a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="min-h-dvh antialiased flex flex-col">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
