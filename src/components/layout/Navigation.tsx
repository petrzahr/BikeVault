"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Warehouse, 
  Wrench, 
  Layers, 
  Coins, 
  BarChart3, 
  Settings, 
  ChevronRight,
  Bike as BikeIcon,
  Cloud,
  CloudOff,
  RefreshCw,
  Download,
  Upload,
  LogIn,
  LogOut,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { t } from "@/lib/i18n";
import { useVault } from "@/context/VaultContext";

export function Navigation() {
  const pathname = usePathname();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    syncStatus,
    syncError,
    user,
    lastSyncedAt,
    login,
    logout,
    syncNow,
    exportBackup,
    importBackup,
  } = useVault();

  const navItems = [
    { href: "/garage", label: t("nav.garage"), icon: Warehouse },
    { href: "/components", label: t("nav.components"), icon: Layers },
    { href: "/maintenance", label: t("nav.maintenance"), icon: Wrench },
    { href: "/finances", label: t("nav.finances"), icon: Coins },
    { href: "/statistics", label: t("nav.statistics"), icon: BarChart3 },
    { href: "/settings", label: t("nav.settings"), icon: Settings },
  ];

  const isActive = (href: string) => {
    if (href === "/garage") {
      return pathname === "/" || pathname === "/garage" || pathname.startsWith("/bikes");
    }
    return pathname.startsWith(href);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const success = await importBackup(text);
      if (success) {
        alert("Záloha byla úspěšně importována!");
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
      {/* Hidden file input for JSON restore */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFile}
        accept=".json"
        className="hidden"
      />

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 text-slate-700 min-h-screen fixed top-0 left-0 bottom-0 z-30">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex flex-col gap-1">
          <Link href="/garage" className="flex items-center gap-2.5 text-slate-900 font-extrabold text-xl tracking-tight group">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <BikeIcon className="w-5 h-5" />
            </div>
            <span>Bike<span className="text-blue-600">Vault</span></span>
          </Link>
          <span className="text-xs text-slate-500 font-medium pl-0.5 mt-0.5">
            {t("app.tagline")}
          </span>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-blue-50/80 text-blue-700 font-semibold border-l-4 border-blue-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-blue-600" : "text-slate-400"}`} />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight className="w-3.5 h-3.5 text-blue-600/80" />}
              </Link>
            );
          })}
        </nav>

        {/* GOOGLE DRIVE SYNC & BACKUP SECTION */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50/60 space-y-3">
          {/* User & Google Drive Status */}
          {user ? (
            <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {user.photoLink ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.photoLink} alt={user.displayName || "Google"} className="w-6 h-6 rounded-full border border-slate-200" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                      {user.displayName?.charAt(0) || "G"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {user.displayName || "Uživatel"}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {user.emailAddress}
                    </p>
                  </div>
                </div>

                <button
                  onClick={logout}
                  title="Odhlásit z Google účtu"
                  className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Sync status badge */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                <div className="flex items-center gap-1.5 font-medium">
                  {syncStatus === "saving" ? (
                    <>
                      <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
                      <span className="text-blue-600">Ukládám na Disk...</span>
                    </>
                  ) : syncStatus === "synced" ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700">Disk synchronizován</span>
                    </>
                  ) : syncStatus === "error" ? (
                    <>
                      <AlertCircle className="w-3 h-3 text-rose-600" />
                      <span className="text-rose-700" title={syncError || "Chyba"}>Chyba spojení</span>
                    </>
                  ) : (
                    <>
                      <CloudOff className="w-3 h-3 text-slate-400" />
                      <span className="text-slate-500">Offline režim</span>
                    </>
                  )}
                </div>

                <button
                  onClick={syncNow}
                  title="Synchronizovat s Google Diskem"
                  className="text-slate-500 hover:text-blue-600 p-0.5 rounded transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2 text-center">
              <div className="flex items-center justify-center gap-1.5 text-slate-500 text-xs">
                <Cloud className="w-3.5 h-3.5 text-slate-400" />
                <span>Lokální režim (offline)</span>
              </div>
              <button
                onClick={login}
                className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Přihlásit Google Drive</span>
              </button>
            </div>
          )}

          {/* Backup / Restore JSON buttons */}
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <button
              onClick={exportBackup}
              className="py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg flex items-center justify-center gap-1 transition-colors font-medium"
              title="Stáhnout záložní JSON soubor"
            >
              <Download className="w-3 h-3 text-slate-500" />
              <span>Zálohovat</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg flex items-center justify-center gap-1 transition-colors font-medium"
              title="Obnovit data ze záložního JSON souboru"
            >
              <Upload className="w-3 h-3 text-slate-500" />
              <span>Obnovit</span>
            </button>
          </div>
        </div>
      </aside>

      {/* MOBILE TOP BAR (Sync & Profile) */}
      <header className="md:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between sticky top-0 z-30">
        <Link href="/garage" className="flex items-center gap-2 text-slate-900 font-extrabold text-base">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
            <BikeIcon className="w-4 h-4" />
          </div>
          <span>Bike<span className="text-blue-600">Vault</span></span>
        </Link>

        <div className="flex items-center gap-2">
          {user ? (
            <button
              onClick={syncNow}
              className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium"
              title="Synchronizovat"
            >
              {syncStatus === "saving" ? (
                <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              )}
              <span className="text-[11px]">{user.displayName?.split(" ")[0] || "Disk"}</span>
            </button>
          ) : (
            <button
              onClick={login}
              className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold"
            >
              <LogIn className="w-3 h-3" />
              <span>Přihlásit</span>
            </button>
          )}

          <button
            onClick={exportBackup}
            title="Zálohovat JSON"
            className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-lg"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex justify-around items-center z-40">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-medium transition-colors ${
                active ? "text-blue-600 font-semibold" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
