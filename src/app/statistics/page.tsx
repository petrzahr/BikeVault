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

export default function StatisticsPage() {
  const { data } = useVault();
  const bikes = data.bikes;
  const components = data.components;
  const transactions = data.financialTransactions;

  const totalKm = bikes.reduce((sum, b) => sum + Number(b.currentKm || 0), 0);
  const totalMinutes = bikes.reduce((sum, b) => sum + (b.currentMinutes || 0), 0);

  // Costs per bike
  const bikeCosts = bikes.map((b) => {
    const bikeTxs = transactions.filter((t) => t.bikeId === b.id);
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
      <PageHeader title={t("nav.statistics")} subtitle="Analytika nájezdu, životnosti komponentů a finančních metrik" />

      {/* High-level stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Celkem najeto na všech kolech
            </span>
            <div className="p-2 rounded-xl bg-brand-50 text-brand-600">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-bold text-slate-900 tabular-nums">
            {formatKm(totalKm)}
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Celkový čas v sedle
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-bold text-slate-900 tabular-nums">
            {formatMinutes(totalMinutes)}
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Celkem evidovaných komponentů
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-bold text-slate-900 tabular-nums">
            {components.length}
          </span>
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
                  <span className="text-sm font-bold text-brand-700 tabular-nums">
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
