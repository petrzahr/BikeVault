"use client";

import React, { useState } from "react";
import { useVault } from "@/context/VaultContext";
import { useFeedback } from "@/components/common/Feedback";
import { GoogleIcon } from "../common/GoogleIcon";
import { Bike, AlertCircle, AlertTriangle, Loader2, Mail, Check, RotateCcw } from "lucide-react";
import { buildGmailComposeUrl, ACCESS_REQUEST_EMAIL } from "@/constants/authConfig";

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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6 select-none">
      {/* Minimální vstup: kdo jsem, jedna akce, cesta pro ty, kdo přístup nemají */}
      <div className="max-w-sm w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-7 sm:p-8 space-y-6">

        {/* Logo a hlavička */}
        <div className="text-center space-y-3">
          <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-navy-600 text-white ${isSyncing ? "animate-pulse motion-reduce:animate-none" : ""}`}>
            <Bike className="w-8 h-8" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">
              BikeVault
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Vaše kola pod absolutní kontrolou
            </p>
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
              className="p-1 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-white/60 transition-colors shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Hlavní akce - Tlačítko přihlášení */}
        <div>
          <button
            type="button"
            onClick={handleLogin}
            disabled={isSyncing}
            className="w-full min-h-12 flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-900 font-bold border border-slate-300 shadow-sm hover:border-navy-300 transition-colors active:scale-[0.99] cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500/40"
          >
            {isSyncing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-navy-600" />
                <span>Přihlašuji a načítám data…</span>
              </>
            ) : (
              <>
                <GoogleIcon className="w-5 h-5 shrink-0" />
                <span>Přihlásit se přes Google</span>
              </>
            )}
          </button>
        </div>

        {/* Žádost o přístup: aplikace je jen pro schválené testovací uživatele */}
        <div className="pt-5 border-t border-slate-100 text-center text-xs text-slate-500 space-y-1 select-text">
          <h2 className="font-semibold text-slate-600">Nemáte přístup?</h2>
          {/* Adresa je vidět i jako text, aby šla označit a zkopírovat ručně */}
          <p className="select-all text-slate-600 break-all">{ACCESS_REQUEST_EMAIL}</p>
          <div className="flex flex-col items-center">
            <a
              href={buildGmailComposeUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-11 md:min-h-8 inline-flex items-center gap-1.5 px-2 rounded-lg font-semibold text-navy-700 hover:bg-navy-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500/40"
            >
              <Mail className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Požádat o přístup přes Gmail</span>
            </a>
            {copiedEmail ? (
              <span role="status" className="min-h-11 md:min-h-8 inline-flex items-center gap-1.5 px-2 font-medium text-emerald-600">
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                <span>E-mailová adresa byla zkopírována.</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleCopyEmail}
                title={`Zkopírovat adresu ${ACCESS_REQUEST_EMAIL}`}
                className="min-h-11 md:min-h-8 inline-flex items-center px-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-50 underline underline-offset-2 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500/40"
              >
                Zkopírovat kontaktní e-mail
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
