"use client";

import React, { useState } from "react";
import { useVault } from "@/context/VaultContext";
import { GoogleIcon } from "../common/GoogleIcon";
import { Bike, ShieldCheck, Zap, Wrench, AlertCircle, AlertTriangle, Loader2, Mail, Check, RotateCcw } from "lucide-react";
import { buildGmailComposeUrl, buildAccessRequestMailtoUrl, ACCESS_REQUEST_EMAIL } from "@/constants/authConfig";

export const LoginScreen: React.FC = () => {
  const { login, syncStatus, syncError } = useVault();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const isSyncing = isLoggingIn || syncStatus === "saving";
  const displayError = localError || syncError;

  // Detekce, zda jde o chybu neautorizovaného testera v Google OAuth (Testing mode)
  const isAccessDenied =
    displayError &&
    (displayError.toLowerCase().includes("access_denied") ||
      displayError.toLowerCase().includes("unauthorized") ||
      displayError.toLowerCase().includes("not completed the google verification") ||
      displayError.toLowerCase().includes("přístup byl zamítnut") ||
      displayError.toLowerCase().includes("neautorizován"));

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setLocalError(null);
    try {
      await login();
    } catch (err: unknown) {
      console.error("Přihlášení selhalo:", err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("popup_closed_by_user") || msg.includes("zavřeno")) {
        setLocalError("Přihlašovací okno bylo zavřeno. Zkuste to prosím znovu.");
      } else {
        setLocalError(msg || "Nepodařilo se přihlásit k účtu Google.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleResetError = () => {
    setLocalError(null);
  };

  const handleCopyEmail = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(ACCESS_REQUEST_EMAIL);
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 3000);
      } else if (typeof document !== "undefined") {
        const textarea = document.createElement("textarea");
        textarea.value = ACCESS_REQUEST_EMAIL;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 3000);
      }
    } catch {
      if (typeof window !== "undefined") {
        window.prompt("Zkopírujte si prosím kontaktní e-mail:", ACCESS_REQUEST_EMAIL);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 select-none relative overflow-hidden text-slate-100">
      {/* Ambient decorative glow background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] bg-cyan-600/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-md sm:max-w-lg w-full bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-2xl shadow-black/80 p-7 sm:p-9 space-y-7 relative z-10">
        {/* Logo a hlavička */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25 mb-1">
            <Bike className="w-9 h-9" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Bike<span className="text-blue-500">Vault</span>
            </h1>
            <p className="text-xs text-blue-400 font-bold uppercase tracking-wider mt-0.5">
              Váš digitální cyklistický deník a servisní kniha
            </p>
          </div>
          <p className="text-sm text-slate-300 pt-1 leading-relaxed">
            Mějte svá kola, komponenty, nastavení odpružení a servisní intervaly plně pod kontrolou. Data jsou bezpečně uložena v soukromém prostoru vašeho Google Disku.
          </p>
        </div>

        {/* Přehled výhod */}
        <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60 space-y-3 text-xs text-slate-300">
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-blue-950/80 text-blue-400 border border-blue-800/60 shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-slate-100 block">Soukromé úložiště Google Disk</span>
              <span className="text-slate-400">Vaše cyklistická data jsou bezpečně uložena v neveřejném aplikačním prostoru vašeho účtu Google.</span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 shrink-0 mt-0.5">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-slate-100 block">Automatická synchronizace</span>
              <span className="text-slate-400">Aplikace pracuje bleskově s místní mezipamětí a všechny změny průběžně ukládá na pozadí.</span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-indigo-950/80 text-indigo-400 border border-indigo-800/60 shrink-0 mt-0.5">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-slate-100 block">Plánování servisu & životopis dílů</span>
              <span className="text-slate-400">Sledujte servisní intervaly, motohodiny, nastavení odpružení a kompletní historii komponentů.</span>
            </div>
          </div>
        </div>

        {/* Chybové hlášení / Stav zamítnutí přístupu */}
        {displayError && (
          <div
            className={`p-4 rounded-2xl border text-xs space-y-2 ${
              isAccessDenied
                ? "bg-amber-950/60 border-amber-800/80 text-amber-200"
                : "bg-red-950/60 border-red-800/80 text-red-200"
            }`}
          >
            <div className="flex items-start gap-2.5">
              {isAccessDenied ? (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <span className="font-bold block text-sm">
                  {isAccessDenied ? "Neautorizovaný účet / Omezený přístup" : "Přihlášení se nezdařilo"}
                </span>
                <p className="leading-relaxed">
                  {isAccessDenied
                    ? "Aplikace BikeVault je momentálně v režimu privátního testování a váš Google účet nebyl autorizován. Pro přidání mezi testery využijte žádost o přístup níže."
                    : displayError}
                </p>
              </div>
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={handleResetError}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Zkusit jiný účet</span>
              </button>
            </div>
          </div>
        )}

        {/* Hlavní akce - Tlačítko přihlášení */}
        <div className="space-y-3 pt-1">
          <button
            type="button"
            onClick={handleLogin}
            disabled={isSyncing}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold border border-transparent shadow-lg shadow-black/30 hover:shadow-xl transition-all active:scale-[0.99] cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed text-sm"
          >
            {isSyncing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span>Přihlašuji a načítám data...</span>
              </>
            ) : (
              <>
                <GoogleIcon className="w-5 h-5 shrink-0" />
                <span>Přihlásit se přes Google</span>
              </>
            )}
          </button>

          <p className="text-[11px] text-center text-slate-400">
            Pro vstup do aplikace je vyžadováno přihlášení k vašemu Google účtu.
          </p>
        </div>

        {/* Oddělovač */}
        <div className="relative flex items-center py-0.5">
          <div className="flex-grow border-t border-slate-800" />
          <span className="flex-shrink mx-3 text-xs font-medium text-slate-500">nebo</span>
          <div className="flex-grow border-t border-slate-800" />
        </div>

        {/* Žádost o přístup do testovacího režimu */}
        <div className="space-y-3 text-center sm:text-left">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-100">Nemáte přístup?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              BikeVault je momentálně dostupný pouze schváleným testovacím uživatelům. Pošlete žádost o přístup a po schválení se budete moci přihlásit svým účtem Google.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <a
              href={buildGmailComposeUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700/80 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 active:scale-[0.99] cursor-pointer"
            >
              <Mail className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Požádat přes Gmail</span>
            </a>

            <a
              href={buildAccessRequestMailtoUrl()}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700/80 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 active:scale-[0.99] cursor-pointer"
            >
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Otevřít v e-mailu</span>
            </a>
          </div>

          <div className="flex flex-col items-center sm:items-start pt-0.5">
            {copiedEmail ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                <Check className="w-3.5 h-3.5" />
                <span>E-mailová adresa byla zkopírována.</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleCopyEmail}
                title={`Zkopírovat adresu ${ACCESS_REQUEST_EMAIL}`}
                className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
              >
                Zkopírovat kontaktní e-mail ({ACCESS_REQUEST_EMAIL})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Patička */}
      <footer className="mt-8 text-center text-xs text-slate-500 font-medium">
        BikeVault &bull; Vaše kola pod absolutní kontrolou
      </footer>
    </div>
  );
};
