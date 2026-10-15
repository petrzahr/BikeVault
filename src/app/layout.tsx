import type { Metadata } from "next";
import Script from "next/script";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { VaultProvider } from "@/context/VaultContext";
import { FeedbackProvider } from "@/components/common/Feedback";
import { AuthGate } from "@/components/auth/AuthGate";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BikeVault - Vaše kola pod absolutní kontrolou",
  description: "Digitální servisní kniha, virtuální garáž, správa komponentů a sledování nákladů na vlastnictví jízdních kol s ukládáním na Google Drive.",
  icons: {
    icon: [
      { url: "/favicon.svg?v=2", type: "image/svg+xml" },
    ],
    apple: "/favicon.svg?v=2",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs" className={`h-full bg-slate-50 ${plusJakartaSans.variable}`}>
      <head>
        <link rel="icon" href="/favicon.svg?v=2" type="image/svg+xml" />
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${plusJakartaSans.className} h-full text-slate-800 antialiased selection:bg-navy-100 selection:text-navy-900 bg-slate-50`}>
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
