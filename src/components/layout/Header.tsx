"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useVault } from "@/context/VaultContext";
import { useFeedback } from "@/components/common/Feedback";
import {
  Menu,
  RefreshCw,
  LogOut,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { GoogleIcon } from "@/components/common/GoogleIcon";
import { buttonClass } from "@/lib/ui";
import { StravaStatusBadge } from "@/components/layout/StravaStatusBadge";

interface HeaderProps {
  onToggleMobileMenu: () => void;
  activeScreenTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileMenu,
  activeScreenTitle,
}) => {
  const pathname = usePathname();
  const {
    appState,
    syncStatus,
    syncError,
    user,
    lastSyncedAt,
    isAuthenticated,
    login,
    logout,
    reauthorizeGoogleDrive,
    syncNow,
  } = useVault();
  const { confirm } = useFeedback();

  const isDriveConnected = isAuthenticated;
  const connectGoogleDrive = login;


  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const getScreenTitle = () => {
    if (activeScreenTitle) return activeScreenTitle;
    if (pathname === "/" || pathname === "/garage") return "Garáž kol";
    if (pathname.startsWith("/bikes")) return "Detail kola";
    if (pathname === "/components" || pathname.startsWith("/components")) return "Sklad komponentů";
    if (pathname === "/maintenance") return "Plánovač a servisní kniha";
    if (pathname === "/finances") return "Finanční přehled & TCO";
    if (pathname === "/statistics") return "Analytika & statistiky";
    if (pathname === "/lists") return "Správa seznamů";
    if (pathname === "/settings") return "Nastavení aplikace";
    return "BikeVault";
  };

  return (
    <>
      <header className="h-16 min-h-16 shrink-0 bg-ink-900 border-b border-white/10 sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between gap-2 select-none">
        {/* Levá strana: mobilní menu + název sekce */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            onClick={onToggleMobileMenu}
            aria-label="Otevřít menu"
            className="p-2 rounded-xl text-white/60 hover:bg-white/10 md:hidden shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <h1 className="text-base font-bold text-white leading-tight truncate">
              {getScreenTitle()}
            </h1>
            <p className="text-[11px] text-white/45 font-medium hidden sm:block truncate">
              BikeVault – Vaše kola pod absolutní kontrolou
            </p>
          </div>
        </div>

        {/* Pravá strana: Google Disk tlačítko / stavový indikátor */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <StravaStatusBadge />
          {!isDriveConnected ? (
            <button
              type="button"
              onClick={connectGoogleDrive}
              disabled={syncStatus === "saving"}
              title="Připojit Google Disk pro automatickou synchronizaci"
              className={buttonClass("outlineDark", "sm")}
            >
              <GoogleIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">
                {syncStatus === "saving" ? "Připojuji..." : "Připojit Google Disk"}
              </span>
              <span className="sm:hidden">
                {syncStatus === "saving" ? "..." : "Disk"}
              </span>
            </button>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                title="Google Disk připojen – klikněte pro podrobnosti a synchronizaci"
                className={buttonClass("outlineDark", "sm")}
              >
                <GoogleIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="relative flex h-2 w-2">
                  {syncStatus === "saving" && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-navy-400 opacity-75"></span>
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      syncStatus === "saving"
                        ? "bg-navy-500"
                        : syncStatus === "error" || appState === "scopeInsufficient"
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                  ></span>
                </span>
                <span className="hidden sm:inline">
                  {syncStatus === "saving"
                    ? "Synchronizuji změny"
                    : appState === "scopeInsufficient"
                    ? "Chybí oprávnění"
                    : syncStatus === "error"
                    ? "Chyba"
                    : "Synchronizováno"}
                </span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-slate-200/90 shadow-xl p-3.5 z-50 space-y-3 text-xs animate-scale-in">
                  {/* Uživatelský profil / Stav */}
                  <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
                    {user?.photoLink ? (
                      <img
                        src={user.photoLink}
                        alt={user.displayName || "Google"}
                        className="w-8 h-8 rounded-full border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {user?.displayName ? user.displayName[0].toUpperCase() : "G"}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 truncate">
                        {user?.displayName || "Google Uživatel"}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {user?.emailAddress || "Propojeno s Google Drive"}
                      </p>
                    </div>
                  </div>

                  {/* Informace o synchronizaci */}
                  <div className="p-2.5 bg-slate-50 rounded-xl space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Stav:</span>
                      <span className="font-semibold flex items-center gap-1">
                        {syncStatus === "saving" ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin text-navy-600" />
                            <span className="text-navy-600">Probíhá zápis</span>
                          </>
                        ) : syncStatus === "error" ? (
                          <>
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            <span className="text-amber-600">Chyba</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">Synchronizováno</span>
                          </>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-500">
                      <span>Poslední uložení:</span>
                      <span className="font-medium text-slate-700">
                        {lastSyncedAt
                          ? new Date(lastSyncedAt).toLocaleTimeString("cs-CZ", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })
                          : "Při této relaci"}
                      </span>
                    </div>

                    {syncError && (
                      <p className="text-[10px] text-rose-600 pt-1.5 border-t border-slate-100 mt-1.5">
                        {syncError}
                      </p>
                    )}
                  </div>

                  {/* Tlačítko synchronizace */}
                  <div className="space-y-1.5 pt-1">
                    {appState === "scopeInsufficient" ? (
                      <button
                        type="button"
                        onClick={() => {
                          reauthorizeGoogleDrive();
                          setMenuOpen(false);
                        }}
                        disabled={syncStatus === "saving"}
                        className={buttonClass("warning", "md", "w-full")}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === "saving" ? "animate-spin" : ""}`} />
                        <span>Obnovit oprávnění Google</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          syncNow();
                          setMenuOpen(false);
                        }}
                        disabled={syncStatus === "saving"}
                        className={buttonClass("soft", "md", "w-full")}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === "saving" ? "animate-spin" : ""}`} />
                        <span>Synchronizovat nyní</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await confirm({
                          message: "Opravdu se chcete odhlásit z aplikace BikeVault?",
                          confirmText: "Odhlásit",
                          isDestructive: true,
                        });
                        if (ok) {
                          logout();
                          setMenuOpen(false);
                        }
                      }}
                      className={buttonClass("ghost", "sm", "w-full hover:text-rose-600 hover:bg-rose-50")}
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Odpojit Google Disk</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>
    </>
  );
};

export default Header;
