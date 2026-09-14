"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useVault } from "@/context/VaultContext";
import { 
  Menu, 
  RefreshCw, 
  LogOut, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";
import { GoogleIcon } from "@/components/common/GoogleIcon";

interface HeaderProps {
  onToggleMobileMenu: () => void;
  activeScreenTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileMenu,
  activeScreenTitle,
}) => {
  const pathname = usePathname();
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    exportBackup,
    importBackup,
  } = useVault();

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
    if (pathname === "/settings") return "Nastavení aplikace";
    return "BikeVault";
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const success = await importBackup(text);
      if (success) {
        alert("Záloha byla úspěšně importována!");
        setMenuOpen(false);
      }
    } catch {
      alert("Chyba při čtení souboru.");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFile}
        accept=".json"
        className="hidden"
      />

      <header className="h-16 min-h-16 shrink-0 bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between gap-2 select-none">
        {/* Levá strana: mobilní menu + název sekce */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            onClick={onToggleMobileMenu}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 md:hidden shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <h1 className="text-base font-bold text-slate-900 leading-tight truncate">
              {getScreenTitle()}
            </h1>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block truncate">
              BikeVault – Vaše kola pod absolutní kontrolou
            </p>
          </div>
        </div>

        {/* Pravá strana: Google Disk tlačítko / stavový indikátor */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {!isDriveConnected ? (
            <button
              type="button"
              onClick={connectGoogleDrive}
              disabled={syncStatus === "saving"}
              title="Připojit Google Disk pro automatickou synchronizaci"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition-all hover:border-sky-300 active:scale-[0.98] cursor-pointer"
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
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition-all hover:border-sky-300 active:scale-[0.98] cursor-pointer"
              >
                <GoogleIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="relative flex h-2 w-2">
                  {syncStatus === "saving" && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      syncStatus === "saving"
                        ? "bg-sky-500"
                        : syncStatus === "error" || appState === "scopeInsufficient"
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                  ></span>
                </span>
                <span className="hidden sm:inline">
                  {syncStatus === "saving"
                    ? "Ukládám..."
                    : appState === "scopeInsufficient"
                    ? "Chybí oprávnění"
                    : syncStatus === "error"
                    ? "Chyba"
                    : "Synchronizováno"}
                </span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-slate-200/90 shadow-xl p-3.5 z-50 space-y-3 text-xs animate-in fade-in zoom-in-95 duration-100">
                  {/* Uživatelský profil / Stav */}
                  <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
                    {user?.photoLink ? (
                      <img
                        src={user.photoLink}
                        alt={user.displayName || "Google"}
                        className="w-8 h-8 rounded-full border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs shrink-0">
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
                  <div className="p-2.5 bg-slate-50 rounded-xl space-y-1 text-[11px]">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Stav:</span>
                      <span className="font-semibold flex items-center gap-1">
                        {syncStatus === "saving" ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin text-sky-600" />
                            <span className="text-sky-600">Probíhá zápis</span>
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
                      <p className="text-[10px] text-red-600 pt-1 border-t border-slate-200 mt-1">
                        {syncError}
                      </p>
                    )}
                  </div>

                  {/* Tlačítka synchronizace a zálohy */}
                  <div className="space-y-1.5 pt-1">
                    {appState === "scopeInsufficient" ? (
                      <button
                        type="button"
                        onClick={() => {
                          reauthorizeGoogleDrive();
                          setMenuOpen(false);
                        }}
                        disabled={syncStatus === "saving"}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-colors cursor-pointer shadow-sm"
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
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold transition-colors cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === "saving" ? "animate-spin" : ""}`} />
                        <span>Synchronizovat nyní</span>
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          exportBackup();
                          setMenuOpen(false);
                        }}
                        className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium transition-colors cursor-pointer text-[11px]"
                      >
                        <Download className="w-3 h-3 text-slate-500" />
                        <span>Zálohovat JSON</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium transition-colors cursor-pointer text-[11px]"
                      >
                        <Upload className="w-3 h-3 text-slate-500" />
                        <span>Obnovit JSON</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Opravdu se chcete odhlásit z aplikace BikeVault?")) {
                          logout();
                          setMenuOpen(false);
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 font-medium transition-colors cursor-pointer"
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
