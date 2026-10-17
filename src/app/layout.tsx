import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Archivo, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { VaultProvider } from "@/context/VaultContext";
import { FeedbackProvider } from "@/components/common/Feedback";
import { AuthGate } from "@/components/auth/AuthGate";

// Variable Archivo with the width axis: condensed widths carry the uppercase labels (section-label, readout captions)
const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  variable: "--font-sans",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BikeVault - Vaše kola pod absolutní kontrolou",
  description: "Digitální servisní kniha, virtuální garáž, správa komponentů a sledování nákladů na vlastnictví jízdních kol s ukládáním na Google Drive.",
  applicationName: "BikeVault",
  appleWebApp: {
    capable: true,
    title: "BikeVault",
    // Opaque bar: the light login screens would otherwise sit under white status-bar text
    statusBarStyle: "black",
  },
  formatDetection: { telephone: false },
};

// viewport-fit=cover lets the dark shell run under the notch; safe-area insets are handled in the shell components
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f1113",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs" className={`h-full bg-slate-50 ${archivo.variable} ${jetBrainsMono.variable}`}>
      <head>
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${archivo.className} h-full text-slate-800 antialiased selection:bg-signal-200 selection:text-slate-900 bg-slate-50`}>
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
