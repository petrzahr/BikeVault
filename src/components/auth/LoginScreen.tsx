"use client";

import React, { useState } from "react";
import { useVault } from "@/context/VaultContext";
import { useFeedback } from "@/components/common/Feedback";
import { GoogleIcon } from "../common/GoogleIcon";
import { Bike, ShieldCheck, Zap, Wrench, AlertCircle, AlertTriangle, Loader2, Mail, Check, RotateCcw } from "lucide-react";
import { buildGmailComposeUrl, ACCESS_REQUEST_EMAIL } from "@/constants/authConfig";
import { buttonClass } from "@/lib/ui";

export const LoginScreen: React.FC = () => {
  const { login, syncStatus, syncError } = useVault();
  const { toast } = useFeedback();
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
      toast(`Zkopírujte si prosím kontaktní e-mail: ${ACCESS_REQUEST_EMAIL}`, "info");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-brand-50/40 to-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 select-none">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/60 p-7 sm:p-9 space-y-7">
        
        {/* Logo a hlavička */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800 text-white shadow-lg shadow-slate-900/20 mb-1">
            <Bike className="w-9 h-9" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
              BikeVault
            </h1>
            <p className="text-xs text-brand-600 font-bold uppercase tracking-wider mt-0.5">
              Vaše kola pod absolutní kontrolou
            </p>
          </div>
          <p className="text-sm text-slate-600 pt-1 leading-relaxed">
            Mějte svá kola, komponenty, nastavení odpružení a servisní intervaly pod kontrolou. Data jsou bezpečně uložena v soukromém prostoru vašeho účtu Google.
          </p>
        </div>

        {/* Přehled výhod */}
        <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/60 space-y-3 text-xs text-slate-600">
          <div className="flex items-start gap-3">
            <div className="p-1 rounded-lg bg-brand-100 text-brand-700 shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-slate-800 block">Soukromé úložiště Google Disk</span>
              <span>Vaše cyklistická data jsou bezpečně uložena v neveřejném aplikačním prostoru vašeho účtu Google.</span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-1 rounded-lg bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-slate-800 block">Automatická synchronizace</span>
              <span>Aplikace pracuje rychle s místní mezipamětí a všechny změny průběžně ukládá na pozadí.</span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-1 rounded-lg bg-brand-100 text-brand-700 shrink-0 mt-0.5">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-slate-800 block">Plánování servisu & životopis dílů</span>
              <span>Sledujte servisní intervaly, motohodiny, nastavení odpružení a kompletní historii komponentů.</span>
            </div>
          </div>
        </div>

        {/* Chybové hlášení při selhání přihlášení */}
        {displayError && (
          <div
            className={`p-3.5 rounded-xl border flex items-start justify-between gap-2.5 text-xs ${
              isAccessDenied
                ? "bg-amber-50 border-amber-200 text-amber-800"
                : "bg-rose-50 border-rose-200 text-rose-700"
            }`}
          >
            <div className="flex items-start gap-2.5">
              {isAccessDenied ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <span className="font-semibold block">
                  {isAccessDenied ? "Nemáte schválený přístup" : "Přihlášení se nezdařilo"}
                </span>
                <p className={isAccessDenied ? "text-amber-700 leading-relaxed" : "text-rose-600 leading-relaxed"}>
                  {isAccessDenied
                    ? "Aplikace BikeVault je momentálně dostupná pouze schváleným testovacím uživatelům. Pošlete žádost o přístup níže."
                    : displayError}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetError}
              title="Zkusit jiný účet"
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-colors shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Hlavní akce - Tlačítko přihlášení */}
        <div className="space-y-3 pt-1">
          <button
            type="button"
            onClick={handleLogin}
            disabled={isSyncing}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-bold border border-slate-300 shadow-md shadow-slate-200/50 hover:border-brand-300 hover:shadow-lg transition-all active:scale-[0.99] cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed text-sm"
          >
            {isSyncing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
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
          <div className="flex-grow border-t border-slate-200" />
          <span className="flex-shrink mx-3 text-xs font-medium text-slate-400">nebo</span>
          <div className="flex-grow border-t border-slate-200" />
        </div>

        {/* Žádost o přístup do testovacího režimu */}
        <div className="space-y-3 text-center sm:text-left">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800">Nemáte přístup?</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              BikeVault je momentálně dostupný pouze schváleným testovacím uživatelům. Pošlete žádost o přístup a po schválení se budete moci přihlásit svým účtem Google.
            </p>
          </div>

          <a
            href={buildGmailComposeUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass("secondary", "md", "w-full")}
          >
            <Mail className="w-4 h-4 text-slate-500 shrink-0" />
            <span>Požádat o přístup přes Gmail</span>
          </a>

          <div className="flex flex-col items-center sm:items-start pt-0.5">
            {copiedEmail ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                <Check className="w-3.5 h-3.5" />
                <span>E-mail zkopírován</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleCopyEmail}
                title={`Zkopírovat adresu ${ACCESS_REQUEST_EMAIL}`}
                className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-500 rounded"
              >
                Zkopírovat kontaktní e-mail
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Patička */}
      <footer className="mt-8 text-center text-xs text-slate-400 font-medium">
        BikeVault &bull; Vaše kola pod absolutní kontrolou
      </footer>
    </div>
  );
};
