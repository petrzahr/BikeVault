import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { VaultProvider } from "@/context/VaultContext";
import { FeedbackProvider } from "@/components/common/Feedback";
import { AuthGate } from "@/components/auth/AuthGate";

export const metadata: Metadata = {
  title: "BikeVault - Vaše kola pod absolutní kontrolou",
  description: "Digitální servisní kniha, virtuální garáž, správa komponentů a sledování nákladů na vlastnictví jízdních kol s ukládáním na Google Drive.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs" className="h-full bg-slate-50">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
        />
      </head>
      <body className="h-full text-slate-800 antialiased selection:bg-brand-100 selection:text-brand-900 bg-slate-50">
        <FeedbackProvider>
          <VaultProvider>
            <AuthGate>
              <AppShell>
                {children}
              </AppShell>
            </AuthGate>
          </VaultProvider>
        </FeedbackProvider>
      </body>
    </html>
  );
}
