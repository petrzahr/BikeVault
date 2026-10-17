"use client";

import React, { ReactNode } from "react";
import { Bike, Loader2, AlertTriangle, Download, LogOut, RefreshCw } from "lucide-react";
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
    syncStatus,
    loadErrorDetail,
    corruptedRawPayload,
    exportCorruptedFile,
    reauthorizeGoogleDrive,
    logout,
  } = useVault();

  // 1. Initial local/session verification in progress
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 select-none">
        <div className="w-16 h-16 rounded-2xl bg-signal-600 text-white shadow-lg flex items-center justify-center animate-pulse motion-reduce:animate-none mb-3.5">
          <Bike className="w-8 h-8" />
        </div>
        <div className="text-slate-900 font-extrabold text-lg tracking-tight">
          Bike<span className="text-signal-600">Vault</span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-xs mt-2.5 font-medium">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-signal-600" />
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
        <div className="w-16 h-16 rounded-2xl bg-signal-600 text-white shadow-lg flex items-center justify-center animate-pulse motion-reduce:animate-none mb-3.5">
          <Bike className="w-8 h-8" />
        </div>
        <div className="text-slate-900 font-extrabold text-lg tracking-tight">
          Bike<span className="text-signal-600">Vault</span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-xs mt-2.5 font-medium">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-signal-600" />
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
        <div className="card max-w-md w-full p-6 sm:p-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 mb-4">
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
            <div className="panel panel-neutral text-left mb-5">
              <span className="font-semibold block mb-1">
                Technický detail:
              </span>
              <p className="font-mono text-rose-700 break-words line-clamp-4">
                {loadErrorDetail}
              </p>
            </div>
          )}
          <div className="flex flex-col gap-2.5">
            {corruptedRawPayload && (
              <button
                type="button"
                onClick={exportCorruptedFile}
                className="btn-primary w-full"
              >
                <Download className="w-4 h-4" />
                <span>Stáhnout původní data pro kontrolu</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => logout()}
              className="btn-secondary w-full"
            >
              <LogOut className="w-4 h-4" />
              <span>Odhlásit se a zkusit znovu</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 5. Re-consent Gate: scopeInsufficient
  // The token is missing the drive.file scope. Must re-authorize before proceeding.
  if (appState === "scopeInsufficient") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 select-none">
        <div className="card max-w-md w-full p-6 sm:p-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-steel-50 flex items-center justify-center text-steel-600 mb-4">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">
            Vyžadováno oprávnění k Disku
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed mb-4">
            BikeVault potřebuje znovu povolit přístup ke svým datům na Google Disku.
          </p>
          <div className="panel panel-neutral text-left mb-5 space-y-1">
            <p className="font-semibold text-slate-800">Proč je to potřeba?</p>
            <p>
              Aplikace ukládá data přímo na váš osobní Google Disk do souboru{" "}
              <code className="bg-white px-1 py-0.5 rounded border border-slate-200 font-mono">
                bikevault_data.json
              </code>
              . Bez tohoto oprávnění nelze data načíst ani bezpečně ukládat.
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              disabled={syncStatus === "saving"}
              onClick={() => reauthorizeGoogleDrive()}
              className="btn-primary w-full"
            >
              {syncStatus === "saving" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span>Obnovit oprávnění Google</span>
            </button>
            <button
              type="button"
              onClick={() => logout()}
              className="btn-secondary w-full"
            >
              <LogOut className="w-4 h-4" />
              <span>Odhlásit se</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 5. Authenticated & initial sync done & state is ready -> render app
  return <>{children}</>;
}
