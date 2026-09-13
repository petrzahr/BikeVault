"use client";

import React, { ReactNode } from "react";
import { Bike, Loader2, AlertTriangle, Download, LogOut } from "lucide-react";
import { useVault } from "@/context/VaultContext";
import { LoginScreen } from "./LoginScreen";

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const {
    isLoaded,
    isAuthenticated,
    isInitialSyncDone,
    appState,
    loadErrorDetail,
    corruptedRawPayload,
    exportCorruptedFile,
    logout,
  } = useVault();

  // 1. Initial local/session verification in progress
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 select-none">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-600 to-sky-500 text-white shadow-lg shadow-sky-500/25 flex items-center justify-center animate-pulse mb-3.5">
          <Bike className="w-8 h-8" />
        </div>
        <div className="text-slate-900 font-extrabold text-lg tracking-tight">
          Bike<span className="text-sky-600">Vault</span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-xs mt-2.5 font-medium">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
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
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-600 to-sky-500 text-white shadow-lg shadow-sky-500/25 flex items-center justify-center animate-pulse mb-3.5">
          <Bike className="w-8 h-8" />
        </div>
        <div className="text-slate-900 font-extrabold text-lg tracking-tight">
          Bike<span className="text-sky-600">Vault</span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-xs mt-2.5 font-medium">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
          <span>Načítám data z Google Disku...</span>
        </div>
      </div>
    );
  }

  // 4. Critical Data Safety Gate: loadError
  // Never overwrite or render broken empty state if cloud data failed to parse/validate!
  if (appState === "loadError") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 select-none">
        <div className="max-w-md w-full bg-white rounded-2xl border border-rose-200 shadow-xl p-6 sm:p-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-4 shadow-sm">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">
            Bezpečnostní ochrana dat BikeVault
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed mb-4">
            Data BikeVault se nepodařilo bezpečně načíst. Původní data na Google Disku{" "}
            <strong>nebyla přepsána</strong>. Zkontrolujte nebo obnovte uložená data.
          </p>
          {loadErrorDetail && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left mb-5">
              <span className="text-[11px] font-semibold text-slate-700 block mb-1">
                Technický detail:
              </span>
              <p className="text-[11px] font-mono text-rose-600 break-words line-clamp-4">
                {loadErrorDetail}
              </p>
            </div>
          )}
          <div className="flex flex-col gap-2.5">
            {corruptedRawPayload && (
              <button
                type="button"
                onClick={exportCorruptedFile}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Stáhnout původní data pro kontrolu</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => logout()}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Odhlásit se a zkusit znovu</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 5. Authenticated & initial sync done & state is ready -> render app
  return <>{children}</>;
}
