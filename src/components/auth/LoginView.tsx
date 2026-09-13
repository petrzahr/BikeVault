"use client";

import React, { useState } from "react";
import { Bike, HardDrive, ShieldCheck, Lock, AlertCircle, Loader2 } from "lucide-react";
import { useVault } from "@/context/VaultContext";

export function LoginView() {
  const { login, syncError } = useVault();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMessage(null);
    try {
      await login();
    } catch (err: unknown) {
      console.error("Přihlášení selhalo:", err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("popup_closed") || msg.includes("zavřeno")) {
        setErrorMessage("Přihlašovací okno bylo zavřeno. Zkuste to prosím znovu.");
      } else {
        setErrorMessage(msg || "Nepodařilo se přihlásit k účtu Google.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Logo Badge */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shadow-sm mb-4">
          <Bike className="w-9 h-9" />
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Bike<span className="text-blue-600">Vault</span>
        </h1>
        <p className="mt-1.5 text-sm text-slate-600 font-medium">
          Kompletní historie a digitální servisní kniha tvých kol
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-sm border border-slate-200 rounded-2xl">
          {/* Headline & Description */}
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold text-slate-900">
              Přihlášení k vašemu trezoru
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Data jsou uložena výhradně ve vašem osobním Google Disku.
            </p>
          </div>

          {/* Error Alert */}
          {(errorMessage || syncError) && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Chyba autorizace</p>
                <p className="mt-0.5 text-rose-700">{errorMessage || syncError}</p>
              </div>
            </div>
          )}

          {/* Google Sign-in Button */}
          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm shadow-xs hover:shadow transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                <span>Ověřuji účet Google...</span>
              </>
            ) : (
              <>
                {/* Google G Logo SVG */}
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Přihlásit se přes Google</span>
              </>
            )}
          </button>

          {/* Feature highlights */}
          <div className="mt-8 pt-6 border-t border-slate-100 space-y-3.5">
            <div className="flex items-start gap-3 text-left">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <HardDrive className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-800">
                  Data na vašem Google Disku
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Soubor <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono text-[10px]">bikevault_data.json</code> je uložen pouze ve vašem Disku s rozsahem přístupu <span className="font-mono text-[10px] text-slate-600">drive.file</span>.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-left">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-800">
                  100% soukromí bez cizích databází
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Aplikace nemá žádnou centrální databázi ani server, kde by se ukládala vaše data.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-left">
              <div className="w-7 h-7 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-800">
                  Bezpečný standard OAuth 2.0
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Aplikace má přístup výhradně k souborům, které sama vytvořila. Nemůže číst jiné dokumenty.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-400 mt-6">
          BikeVault &bull; Verze 0.1.0 (Google Drive Edition)
        </p>
      </div>
    </div>
  );
}
