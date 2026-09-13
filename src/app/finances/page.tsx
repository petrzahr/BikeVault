"use client";

import React from "react";
import { useVault } from "@/context/VaultContext";
import { 
  Coins, 
  TrendingDown, 
  TrendingUp, 
  Calendar, 
  Bike as BikeIcon, 
  Tag, 
  Layers 
} from "lucide-react";
import { t, formatCzk, formatDateCs } from "@/lib/i18n";

export default function GlobalFinancesPage() {
  const { data } = useVault();
  const transactions = data.financialTransactions
    .slice()
    .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())
    .map((tx) => ({
      tx,
      bike: tx.bikeId ? data.bikes.find((b) => b.id === tx.bikeId) : null,
      component: tx.componentId ? data.components.find((c) => c.id === tx.componentId) : null,
    }));

  let totalExpenses = 0;
  let totalIncomes = 0;

  const categoryTotals: Record<string, number> = {};

  for (const item of transactions) {
    const amt = Number(item.tx.amount || 0);
    if (item.tx.type === "EXPENSE") {
      totalExpenses += amt;
      categoryTotals[item.tx.category] = (categoryTotals[item.tx.category] || 0) + amt;
    } else if (item.tx.type === "INCOME") {
      totalIncomes += amt;
    }
  }

  const netTotal = totalExpenses - totalIncomes;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {t("finances.title")}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Globální kniha výdajů a příjmů spojených s koly, komponenty a servisem
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {t("finances.totalExpenses")}
            </span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <span className="text-2xl font-bold text-slate-900 font-mono">
            {formatCzk(totalExpenses)}
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {t("finances.totalIncomes")}
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-bold text-emerald-600 font-mono">
            {formatCzk(totalIncomes)}
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">
              {t("finances.netCost")} (TCO)
            </span>
            <Coins className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-2xl font-bold text-blue-700 font-mono">
            {formatCzk(netTotal)}
          </span>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Rozložení výdajů podle kategorií
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Object.entries(categoryTotals).map(([catKey, total]) => {
            const percent = totalExpenses > 0 ? Math.round((total / totalExpenses) * 100) : 0;
            return (
              <div key={catKey} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 block mb-1">
                  {t(`finances.categories.${catKey}`)}
                </span>
                <span className="text-lg font-bold text-slate-900 font-mono block">
                  {formatCzk(total)}
                </span>
                <span className="text-[11px] text-blue-700 font-semibold">
                  {percent} % výdajů
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unified Transaction Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Všechny finanční položky ({transactions.length})
          </h3>
        </div>

        <div className="divide-y divide-slate-100">
          {transactions.map((item) => {
            const tx = item.tx;
            const isExpense = tx.type === "EXPENSE";
            const categoryKey = `finances.categories.${tx.category}`;

            return (
              <div key={tx.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                      isExpense ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}>
                      {t(categoryKey)}
                    </span>
                    {item.bike && (
                      <span className="text-xs text-blue-700 font-semibold">
                        [{item.bike.name}]
                      </span>
                    )}
                    <span className="text-sm font-bold text-slate-900">
                      {tx.notes || t(categoryKey)}
                    </span>
                  </div>

                  <div className="text-slate-400 font-mono">
                    {formatDateCs(tx.transactionDate)}
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-base font-bold font-mono ${
                    isExpense ? "text-slate-900" : "text-emerald-600"
                  }`}>
                    {isExpense ? "-" : "+"}{formatCzk(tx.amount)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
