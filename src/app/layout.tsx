import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Navigation } from "@/components/layout/Navigation";
import { VaultProvider } from "@/context/VaultContext";
import { AuthGate } from "@/components/auth/AuthGate";

export const metadata: Metadata = {
  title: "BikeVault — Kompletní historie tvých kol",
  description: "Digitální servisní kniha, virtuální garáž, správa komponentů a sledování nákladů na vlastnictví jízdních kol s ukládáním na Google Drive.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <head>
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
        />
      </head>
      <body className="bg-slate-50 text-slate-900 min-h-screen antialiased">
        <VaultProvider>
          <AuthGate>
            <Navigation />
            <main className="md:pl-64 pb-20 md:pb-8 min-h-screen">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                {children}
              </div>
            </main>
          </AuthGate>
        </VaultProvider>
      </body>
    </html>
  );
}
