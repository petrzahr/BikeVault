"use client";

import React, { ReactNode } from "react";
import { Bike, Loader2 } from "lucide-react";
import { useVault } from "@/context/VaultContext";
import { LoginScreen } from "./LoginScreen";

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { isLoaded, isAuthenticated, isInitialSyncDone } = useVault();

  // 1. Initial local/session verification in progress
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 select-none">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25 flex items-center justify-center animate-pulse mb-3.5">
          <Bike className="w-8 h-8" />
        </div>
        <div className="text-slate-900 font-extrabold text-lg tracking-tight">
          Bike<span className="text-blue-600">Vault</span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-xs mt-2.5 font-medium">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
          <span>Ověřuji přihlášení...</span>
        </div>
      </div>
    );
  }

  // 2. Not authenticated -> Login Wall (LoginScreen)
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // 3. Authenticated but initial Google Drive download still in progress
  if (!isInitialSyncDone) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 select-none">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25 flex items-center justify-center animate-pulse mb-3.5">
          <Bike className="w-8 h-8" />
        </div>
        <div className="text-slate-900 font-extrabold text-lg tracking-tight">
          Bike<span className="text-blue-600">Vault</span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-xs mt-2.5 font-medium">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
          <span>Načítám data z Google Disku...</span>
        </div>
      </div>
    );
  }

  // 4. Authenticated & initial sync done -> render app
  return <>{children}</>;
}
