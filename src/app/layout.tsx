import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/layout/Navigation";

export const metadata: Metadata = {
  title: "BikeVault — Kompletní historie tvých kol",
  description: "Digitální servisní kniha, virtuální garáž, správa komponentů a sledování nákladů na vlastnictví jízdních kol.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <body className="bg-slate-50 text-slate-900 min-h-screen antialiased">
        <Navigation />
        <main className="md:pl-64 pb-20 md:pb-8 min-h-screen">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
