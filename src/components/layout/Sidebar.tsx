"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useVault } from "@/context/VaultContext";
import { 
  Warehouse, 
  Layers, 
  Wrench, 
  Coins, 
  BarChart3, 
  Settings, 
  Plus, 
  X, 
  Bike as BikeIcon 
} from "lucide-react";
import { t, formatKm, formatCzk } from "@/lib/i18n";

export type NavScreen = "garage" | "components" | "maintenance" | "finances" | "statistics" | "settings";

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenAddBikeModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mobileOpen,
  onCloseMobile,
  onOpenAddBikeModal,
}) => {
  const pathname = usePathname();
  const { data, getServiceScheduleStatuses } = useVault();

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

  // Quick stats
  const activeBikesCount = data.bikes.filter((b) => b.status === "ACTIVE").length;
  const totalKm = data.bikes.reduce((acc, b) => acc + Number(b.currentKm || 0), 0);
  const installedComponentsCount = data.components.filter((c) => c.status === "INSTALLED").length;
  const serviceStatuses = getServiceScheduleStatuses();
  const overdueCount = serviceStatuses.filter(
    (s: { schedule?: { isActive: boolean }; status?: { urgency: string } }) =>
      s.schedule?.isActive && s.status?.urgency === "OVERDUE"
  ).length;

  const totalInvestment = 
    data.bikes.reduce((acc, b) => acc + Number(b.purchasePrice || 0), 0) +
    data.components.reduce((acc, c) => acc + Number(c.purchasePrice || 0), 0);

  return (
    <>
      {/* Mobilní backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-5 space-y-6">
          {/* Logo a záhlaví */}
          <div className="flex items-center justify-between">
            <Link href="/garage" onClick={onCloseMobile} className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center shadow-md shadow-slate-900/15">
                <BikeIcon className="w-5 h-5" />
              </div>
              <div>
                <span className="text-base font-extrabold tracking-tight text-slate-900 block leading-none">
                  BikeVault
                </span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wide block mt-0.5 uppercase">
                  Garáž & servis kol
                </span>
              </div>
            </Link>

            <button
              onClick={onCloseMobile}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Rychlé tlačítko přidání */}
          <button
            onClick={() => {
              onOpenAddBikeModal();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-sky-300 transition-all hover:shadow-md hover:shadow-sky-400/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Přidat nové kolo</span>
          </button>

          {/* Navigační položky */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onCloseMobile}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    active
                      ? "bg-sky-50 text-sky-700 shadow-xs"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span className={active ? "text-sky-600" : "text-slate-400"}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Spodní rychlý přehled stavu k dnešnímu dni */}
        <div className="p-3.5 m-3 bg-slate-50 border border-slate-200/70 rounded-2xl space-y-2 text-xs">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-600">
              <span className="truncate pr-2" title="Aktivní kola">Kola v garáži</span>
              <span className="shrink-0 font-medium tabular-nums text-slate-800">
                {activeBikesCount} {activeBikesCount === 1 ? "kolo" : activeBikesCount >= 2 && activeBikesCount <= 4 ? "kola" : "kol"}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span className="truncate pr-2" title="Celkový nájezd">Celkový nájezd</span>
              <span className="shrink-0 font-medium tabular-nums text-slate-800">
                {formatKm(totalKm)}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span className="truncate pr-2" title="Aktivní komponenty">Aktivní díly</span>
              <span className="shrink-0 font-medium tabular-nums text-slate-800">
                {installedComponentsCount} ks
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span className="truncate pr-2" title="Vyžaduje servis">Vyžaduje servis</span>
              <span className={`shrink-0 font-medium tabular-nums ${overdueCount > 0 ? "text-red-600 font-bold" : "text-emerald-700"}`}>
                {overdueCount > 0 ? `${overdueCount} po termínu` : "V pořádku"}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-200/80 pt-2 flex items-center justify-between">
            <span className="font-bold text-slate-700 truncate pr-2" title="Hodnota garáže a dílů">
              Investice do kol
            </span>
            <span className="shrink-0 font-extrabold text-sm tabular-nums text-slate-900">
              {formatCzk(totalInvestment)}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
