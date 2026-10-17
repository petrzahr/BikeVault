"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useVault } from "@/context/VaultContext";
import { useFeedback } from "@/components/common/Feedback";
import {
  RefreshCw,
  LogOut
} from "lucide-react";
import { GoogleIcon } from "@/components/common/GoogleIcon";
import { SyncStatusIcon, SyncStatusLabel } from "@/components/common/SyncStatusIndicator";
import { SYNC_LABELS, getSyncDisplayState, getSyncTone } from "@/lib/syncStatus";
import { cn } from "@/lib/ui";
import { StravaStatusBadge } from "@/components/layout/StravaStatusBadge";
import { NAV_ITEMS, isNavItemActive } from "@/components/layout/navItems";

interface HeaderProps {
  activeScreenTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
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
    // Same label as the active navigation item, so header and menu never disagree
    return NAV_ITEMS.find((item) => isNavItemActive(pathname, item.href))?.label ?? "BikeVault";
  };

  return (
    <>
      {/* Content row stays 64px; the top inset (notch, landscape) grows the bar instead of covering the title */}
      <header className="box-content h-16 min-h-16 shrink-0 bg-slate-900 border-b border-white/10 sticky top-0 z-30 pt-[env(safe-area-inset-top)] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:pl-[max(1.5rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))] flex items-center justify-between gap-2 select-none">
        {/* Levá strana: název sekce (mobilní menu je ve spodní liště) */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="min-w-0">
            <p className="text-base font-bold text-white leading-tight truncate">
              {getScreenTitle()}
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
              className="btn-shell btn-sm"
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
                className={cn("btn-shell btn-sm", hasSyncProblem ? "border-rose-400/60 bg-rose-500/10 hover:bg-rose-500/20" : undefined)}
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
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-slate-200 shadow-lg p-3.5 z-50 space-y-3 text-xs animate-scale-in">
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
                      <p className="text-xs text-slate-500 truncate">
                        {user?.emailAddress || "Propojeno s Google Drive"}
                      </p>
                    </div>
                  </div>

                  {/* Informace o synchronizaci */}
                  <div className="p-2.5 bg-slate-50 rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Stav:</span>
                      <SyncStatusLabel state={syncState} iconClassName="w-3.5 h-3.5" />
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
                      <p className="text-xs text-rose-700 pt-1.5 border-t border-slate-100 mt-1.5">
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
                        className="btn-primary w-full"
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
                        className="btn-secondary w-full"
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
                        if (!ok) return;
                        const result = await logout();
                        if (result.ok) return;
                        const force = await confirm({
                          title: "Uložení na Google Disk selhalo",
                          message: `Poslední změny se nepodařilo uložit na Google Disk (${result.error}). Pokud se odhlásíte, tyto změny budou ztraceny.`,
                          confirmText: "Odhlásit i tak",
                          isDestructive: true,
                        });
                        if (force) {
                          await logout({ force: true });
                        }
                      }}
                      className="btn-secondary btn-secondary-danger w-full"
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
