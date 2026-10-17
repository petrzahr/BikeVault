"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useVault } from "@/context/VaultContext";
import {
  Plus,
  X,
  Bike as BikeIcon
} from "lucide-react";
import { formatKm, formatCzk } from "@/lib/i18n";
import { NAV_ITEMS, isNavItemActive, countOverdueSchedules } from "./navItems";


export type NavScreen = "garage" | "components" | "maintenance" | "finances" | "statistics" | "settings";

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenAddBikeModal: () => void;
  onOpenAddComponentModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mobileOpen,
  onCloseMobile,
  onOpenAddBikeModal,
  onOpenAddComponentModal,
}) => {
  const pathname = usePathname();
  const { data, getServiceScheduleStatuses } = useVault();

  const isActive = (href: string) => isNavItemActive(pathname, href);

  // Quick stats
  const activeBikesCount = data.bikes.filter((b) => b.status === "ACTIVE").length;
  const totalKm = data.bikes.reduce((acc, b) => acc + Number(b.currentKm || 0), 0);
  const installedComponentsCount = data.components.filter((c) => c.status === "INSTALLED").length;
  const overdueCount = countOverdueSchedules(getServiceScheduleStatuses());

  const totalInvestment = 
    data.bikes.reduce((acc, b) => acc + Number(b.purchasePrice || 0), 0) +
    data.components.reduce((acc, c) => acc + Number(c.purchasePrice || 0), 0);

  return (
    <>
      {/* Mobilní backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        id="app-drawer"
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-900 flex flex-col justify-between max-md:pt-[env(safe-area-inset-top)] max-md:pb-[env(safe-area-inset-bottom)] max-md:pl-[env(safe-area-inset-left)] transition-transform duration-200 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
          {/* Logo a záhlaví */}
          <div className="flex items-center justify-between">
            <Link href="/garage" onClick={onCloseMobile} className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 shrink-0 rounded-lg bg-signal-500 text-slate-900 flex items-center justify-center">
                <BikeIcon className="w-5 h-5" strokeWidth={2.25} />
              </div>
              <div className="min-w-0">
                <span className="text-base font-extrabold uppercase tracking-[0.06em] [font-stretch:85%] text-white block leading-none">
                  BikeVault
                </span>
                <span className="text-xs leading-4 text-white/60 font-medium block mt-1">
                  Vaše kola pod absolutní kontrolou
                </span>
              </div>
            </Link>

            <button
              onClick={onCloseMobile}
              aria-label="Zavřít menu"
              className="btn-icon text-white/70 hover:text-white hover:bg-white/10 md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Rychlé tlačítka přidání */}
          <div className="space-y-2">
            <button
              onClick={() => {
                onOpenAddBikeModal();
                onCloseMobile();
              }}
              className="btn-primary w-full"
            >
              <Plus className="w-4 h-4" />
              <span>Přidat nové kolo</span>
            </button>
            <button
              onClick={() => {
                onOpenAddComponentModal();
                onCloseMobile();
              }}
              className="btn-shell w-full"
            >
              <Plus className="w-4 h-4" />
              <span>Přidat komponentu</span>
            </button>
          </div>

          {/* Navigační položky */}
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onCloseMobile}
                  aria-current={active ? "page" : undefined}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className={active ? "text-signal-400" : "text-white/60"}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <span>{item.label}</span>
                  {/* Active marker: a small amber square, like a set indicator on a dial */}
                  {active && <span aria-hidden="true" className="ml-auto w-1.5 h-1.5 bg-signal-400" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Spodní rychlý přehled stavu k dnešnímu dni */}
        <div className="p-3.5 mx-4 mb-4 shrink-0 bg-slate-800 border border-white/10 rounded-lg space-y-2 text-xs">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-white/70">
              <span className="truncate pr-2" title="Aktivní kola">Kola v garáži</span>
              <span className="shrink-0 font-mono font-medium text-white/90">
                {activeBikesCount} {activeBikesCount === 1 ? "kolo" : activeBikesCount >= 2 && activeBikesCount <= 4 ? "kola" : "kol"}
              </span>
            </div>

            <div className="flex items-center justify-between text-white/70">
              <span className="truncate pr-2" title="Celkový nájezd">Celkový nájezd</span>
              <span className="shrink-0 font-mono font-medium text-white/90">
                {formatKm(totalKm)}
              </span>
            </div>

            <div className="flex items-center justify-between text-white/70">
              <span className="truncate pr-2" title="Aktivní komponenty">Aktivní díly</span>
              <span className="shrink-0 font-mono font-medium text-white/90">
                {installedComponentsCount} ks
              </span>
            </div>

            <div className="flex items-center justify-between text-white/70">
              <span className="truncate pr-2" title="Vyžaduje servis">Vyžaduje servis</span>
              <span className={`shrink-0 font-mono font-medium ${overdueCount > 0 ? "text-rose-300 font-bold" : "text-emerald-400"}`}>
                {overdueCount > 0 ? `${overdueCount} po termínu` : "V pořádku"}
              </span>
            </div>
          </div>

          <div className="border-t border-white/10 pt-2 flex items-center justify-between">
            <span className="font-bold text-white/80 truncate pr-2" title="Hodnota garáže a dílů">
              Investice do kol
            </span>
            <span className="shrink-0 font-mono font-bold text-sm text-white">
              {formatCzk(totalInvestment)}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
