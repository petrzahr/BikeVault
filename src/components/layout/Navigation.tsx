"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Warehouse, 
  Wrench, 
  Layers, 
  Coins, 
  BarChart3, 
  Settings, 
  PlusCircle, 
  ShieldCheck,
  ChevronRight,
  Bike as BikeIcon
} from "lucide-react";
import { t } from "@/lib/i18n";

export function Navigation() {
  const pathname = usePathname();

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

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 text-slate-700 min-h-screen fixed top-0 left-0 bottom-0 z-30">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-100 flex flex-col gap-1">
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
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
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

        {/* Bottom user badge & status */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 text-xs text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-medium text-slate-600">Jediný vlastník</span>
          </div>
          <span className="text-slate-400 font-mono text-[11px]">v0.1.0 MVP</span>
        </div>
      </aside>

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
