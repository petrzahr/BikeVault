"use client";

import React from "react";
import { useVault } from "@/context/VaultContext";
import { 
  BarChart3, 
  TrendingUp, 
  Bike as BikeIcon, 
  Layers, 
  ShieldCheck,
  Compass,
  Gauge
} from "lucide-react";
import { formatKm, formatMinutes, formatCzk, t } from "@/lib/i18n";
import { PageHeader } from "@/components/common/PageHeader";
import { getBikeTransactions } from "@/lib/domain/finance";

export default function StatisticsPage() {
  const { data } = useVault();
  const bikes = data.bikes;
  const components = data.components;
  const transactions = data.financialTransactions;

  const totalKm = bikes.reduce((sum, b) => sum + Number(b.currentKm || 0), 0);
  const totalMinutes = bikes.reduce((sum, b) => sum + (b.currentMinutes || 0), 0);

  // Costs per bike
  const bikeCosts = bikes.map((b) => {
    const bikeTxs = getBikeTransactions(transactions, data.componentInstallations, b.id);
    let expenses = 0;
    let incomes = 0;
    for (const t of bikeTxs) {
      if (t.type === "EXPENSE") expenses += Number(t.amount || 0);
      else if (t.type === "INCOME") incomes += Number(t.amount || 0);
    }
    return {
      bike: b,
      netCost: expenses - incomes,
      costPerKm: Number(b.currentKm) > 0 ? (expenses - incomes) / Number(b.currentKm) : 0,
    };
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader title={t("nav.statistics")} />

      {/* High-level stats - Sjednocený responzivní ribbon */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3 sm:p-4 grid grid-cols-3 divide-x divide-slate-100 sm:divide-slate-200/60">
        <div className="px-2 sm:px-4 first:pl-1">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <div className="p-1 rounded-md bg-navy-50 text-navy-600 shrink-0 hidden sm:flex">
              <Compass className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] sm:text-xs font-semibold truncate">Celkový nájezd</span>
          </div>
          <div className="text-base sm:text-xl font-bold text-slate-900 truncate tabular-nums">
            {formatKm(totalKm)}
          </div>
          <p className="text-[10px] text-slate-500 hidden md:block truncate mt-0.5">
            Všechna kola v garáži
          </p>
        </div>

        <div className="px-2 sm:px-4">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <div className="p-1 rounded-md bg-navy-50 text-navy-600 shrink-0 hidden sm:flex">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] sm:text-xs font-semibold truncate">Čas v sedle</span>
          </div>
          <div className="text-base sm:text-xl font-bold text-slate-900 truncate tabular-nums">
            {formatMinutes(totalMinutes)}
          </div>
          <p className="text-[10px] text-slate-500 hidden md:block truncate mt-0.5">
            Doba provozu
          </p>
        </div>

        <div className="px-2 sm:px-4 last:pr-1">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <div className="p-1 rounded-md bg-navy-50 text-navy-600 shrink-0 hidden sm:flex">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] sm:text-xs font-semibold truncate">Komponenty</span>
          </div>
          <div className="text-base sm:text-xl font-bold text-slate-900 truncate tabular-nums">
            {components.length}
          </div>
          <p className="text-[10px] text-slate-500 hidden md:block truncate mt-0.5">
            Evidované díly
          </p>
        </div>
      </div>

      {/* Srovnání kol podle nákladů na km */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Srovnání kol — Náklady a efektivita na km
        </h3>

        <div className="space-y-3">
          {bikeCosts.map((item) => (
            <div
              key={item.bike.id}
              className="p-4 bg-slate-50/80 border border-slate-200/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div>
                <span className="text-sm font-bold text-slate-900 block">
                  {item.bike.name}
                </span>
                <span className="text-slate-500 tabular-nums">
                  {formatKm(item.bike.currentKm)} • {formatMinutes(item.bike.currentMinutes)}
                </span>
              </div>

              <div className="flex items-center gap-6 sm:text-right">
                <div>
                  <span className="text-slate-500 uppercase tracking-wider block text-[10px] font-semibold">
                    Čisté náklady
                  </span>
                  <span className="text-sm font-bold text-slate-900 tabular-nums">
                    {formatCzk(item.netCost)}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 uppercase tracking-wider block text-[10px] font-semibold">
                    Cena za km
                  </span>
                  <span className="text-sm font-bold text-navy-700 tabular-nums">
                    {item.costPerKm.toFixed(2)} Kč/km
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Odhadované průměrné životnosti opotřebitelných dílů */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl space-y-2 shadow-sm hover:border-slate-300 transition-all">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Průměrná životnost řetězu
          </span>
          <span className="text-2xl font-bold text-slate-900 tabular-nums">
            1 500 km
          </span>
          <p className="text-xs text-slate-500">
            Doporučený limit měrky 0,5% pro 12-rychlostní sady Eagle / Shimano.
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl space-y-2 shadow-sm hover:border-slate-300 transition-all">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Průměrná životnost plášťů
          </span>
          <span className="text-2xl font-bold text-slate-900 tabular-nums">
            1 200 – 1 800 km
          </span>
          <p className="text-xs text-slate-500">
            V závislosti na směsi běhounu (MaxxGrip vs. MaxxTerra) a terénu.
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl space-y-2 shadow-sm hover:border-slate-300 transition-all">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Servisní interval odpružení
          </span>
          <span className="text-2xl font-bold text-slate-900 tabular-nums">
            50 h / 200 h
          </span>
          <p className="text-xs text-slate-500">
            50 h malý servis spodních nohou, 200 h kompletní repase tlumiče a damperu.
          </p>
        </div>
      </div>
    </div>
  );
}
