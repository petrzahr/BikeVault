"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useVault } from "@/context/VaultContext";
import { useFeedback } from "@/components/common/Feedback";
import {
  Menu,
  RefreshCw,
  LogOut
} from "lucide-react";
import { GoogleIcon } from "@/components/common/GoogleIcon";
import { SyncStatusIcon, SyncStatusLabel } from "@/components/common/SyncStatusIndicator";
import { SYNC_LABELS, getSyncDisplayState, getSyncTone } from "@/lib/syncStatus";
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
  const syncState = getSyncDisplayState(syncStatus, appState);
  const hasSyncProblem = getSyncTone(syncState) === "problem";

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
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
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-white/70 hover:bg-white/10 md:hidden shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <h1 className="text-base font-bold text-white leading-tight truncate">
              {getScreenTitle()}
            </h1>
            <p className="text-[11px] text-white/70 font-medium hidden sm:block truncate">
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
                title={`Google Disk: ${SYNC_LABELS[syncState]} – klikněte pro podrobnosti a synchronizaci`}
                aria-label={`Google Disk: ${SYNC_LABELS[syncState]}`}
                className={buttonClass(
                  "outlineDark",
                  "sm",
                  hasSyncProblem ? "border-rose-400/60 bg-rose-500/10 hover:bg-rose-500/20" : undefined
                )}
              >
                <GoogleIcon className="w-3.5 h-3.5 shrink-0" />
                <SyncStatusIcon state={syncState} onDark />
                {/* Problém je vidět i na mobilu, ostatní stavy jen na širších displejích */}
                {hasSyncProblem && (
                  <span className="sm:hidden">
                    {syncState === "scopeInsufficient" ? "Oprávnění" : "Chyba"}
                  </span>
                )}
                <span className="hidden sm:inline">{SYNC_LABELS[syncState]}</span>
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
                      <SyncStatusLabel state={syncState} iconClassName="w-3 h-3" />
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
                        setMenuOpen(false);
                        const ok = await confirm({
                          title: "Odpojit Google Disk?",
                          message:
                            syncStatus === "synced"
                              ? "Aplikace se odhlásí a vrátí na přihlašovací obrazovku. Vaše data zůstávají na Google Disku a po novém přihlášení se znovu načtou."
                              : "Některé změny ještě nemusí být uložené na Google Disku. Doporučujeme nejdřív počkat na dokončení synchronizace. Aplikace se odhlásí a vrátí na přihlašovací obrazovku.",
                          confirmText: "Odpojit a odhlásit",
                          isDestructive: true,
                        });
                        if (ok) {
                          logout();
                        }
                      }}
                      className={buttonClass("secondary", "md", "w-full hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200")}
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
