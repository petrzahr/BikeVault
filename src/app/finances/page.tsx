"use client";

import React from "react";
import { useVault } from "@/context/VaultContext";
import { DeleteButton } from "@/components/common/DeleteButton";
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
import { PageHeader } from "@/components/common/PageHeader";

export default function GlobalFinancesPage() {
  const { data, deleteTransaction } = useVault();
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader title={t("finances.title")} />

      {/* KPI Cards - Sjednocený responzivní ribbon */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3 sm:p-4 grid grid-cols-3 divide-x divide-slate-100 sm:divide-slate-200/60">
        <div className="px-2 sm:px-4 first:pl-1">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <div className="p-1 rounded-md bg-rose-50 text-rose-600 shrink-0 hidden sm:flex">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] sm:text-xs font-semibold truncate">{t("finances.totalExpenses")}</span>
          </div>
          <div className="text-base sm:text-xl font-bold text-slate-900 truncate tabular-nums">
            {formatCzk(totalExpenses)}
          </div>
          <p className="text-[10px] text-slate-500 hidden md:block truncate mt-0.5">
            Pořízení a údržba
          </p>
        </div>

        <div className="px-2 sm:px-4">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <div className="p-1 rounded-md bg-emerald-50 text-emerald-600 shrink-0 hidden sm:flex">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] sm:text-xs font-semibold truncate">{t("finances.totalIncomes")}</span>
          </div>
          <div className="text-base sm:text-xl font-bold text-emerald-600 truncate tabular-nums">
            {formatCzk(totalIncomes)}
          </div>
          <p className="text-[10px] text-slate-500 hidden md:block truncate mt-0.5">
            Prodej dílů a kol
          </p>
        </div>

        <div className="px-2 sm:px-4 last:pr-1">
          <div className="flex items-center gap-1.5 text-navy-700 mb-1">
            <div className="p-1 rounded-md bg-navy-50 text-navy-600 shrink-0 hidden sm:flex">
              <Coins className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold truncate">{t("finances.netCost")} (TCO)</span>
          </div>
          <div className="text-base sm:text-xl font-bold text-navy-700 truncate tabular-nums">
            {formatCzk(netTotal)}
          </div>
          <p className="text-[10px] text-slate-500 hidden md:block truncate mt-0.5">
            Celková bilance
          </p>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Rozložení výdajů podle kategorií
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Object.entries(categoryTotals).map(([catKey, total]) => {
            const percent = totalExpenses > 0 ? Math.round((total / totalExpenses) * 100) : 0;
            return (
              <div key={catKey} className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/60">
                <span className="text-xs text-slate-500 block mb-1 font-medium">
                  {t(`finances.categories.${catKey}`)}
                </span>
                <span className="text-lg font-bold text-slate-900 tabular-nums block">
                  {formatCzk(total)}
                </span>
                <span className="text-[11px] text-navy-700 font-semibold tabular-nums">
                  {percent} % výdajů
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unified Transaction Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Všechny finanční položky ({transactions.length})
          </h3>
        </div>

        {transactions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Zatím nebyly zaznamenány žádné finanční transakce.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.map((item) => {
              const tx = item.tx;
              const isExpense = tx.type === "EXPENSE";
              const categoryKey = `finances.categories.${tx.category}`;

              return (
                <div key={tx.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/50 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        isExpense ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}>
                        {t(categoryKey)}
                      </span>
                      {item.bike && (
                        <span className="text-xs text-navy-700 font-semibold">
                          [{item.bike.name}]
                        </span>
                      )}
                      <span className="text-sm font-semibold text-slate-900">
                        {tx.notes || t(categoryKey)}
                      </span>
                    </div>

                    <div className="text-slate-500 text-xs tabular-nums">
                      {formatDateCs(tx.transactionDate)}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <span className={`text-base font-bold tabular-nums ${
                      isExpense ? "text-slate-900" : "text-emerald-600"
                    }`}>
                      {isExpense ? "-" : "+"}{formatCzk(tx.amount)}
                    </span>
                    <DeleteButton
                      onConfirm={() => deleteTransaction(tx.id)}
                      title="Smazat transakci"
                      message={`Opravdu chcete smazat transakci „${tx.notes || t(categoryKey)}“ (${formatCzk(tx.amount)})? Tuto akci nelze vrátit zpět.`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
