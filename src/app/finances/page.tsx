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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {t("finances.totalExpenses")}
            </span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-bold text-slate-900 tabular-nums">
            {formatCzk(totalExpenses)}
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {t("finances.totalIncomes")}
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-bold text-emerald-600 tabular-nums">
            {formatCzk(totalIncomes)}
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-navy-700">
              {t("finances.netCost")} (TCO)
            </span>
            <div className="p-2 rounded-xl bg-navy-50 text-navy-600">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-bold text-navy-700 tabular-nums">
            {formatCzk(netTotal)}
          </span>
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

                    <div className="text-slate-400 tabular-nums">
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
