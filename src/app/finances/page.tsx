"use client";

import React, { useState } from "react";
import { useVault } from "@/context/VaultContext";
import { DeleteButton } from "@/components/common/DeleteButton";
import { 
  Coins, 
  TrendingDown, 
  TrendingUp, 
  Calendar, 
  Bike as BikeIcon, 
  Tag, 
  Layers,
  Plus 
} from "lucide-react";
import { t, formatCzk, formatDateCs } from "@/lib/i18n";
import { PageHeader } from "@/components/common/PageHeader";

import { AddTransactionModal } from "@/components/finances/AddTransactionModal";

export default function GlobalFinancesPage() {
  const { data, deleteTransaction } = useVault();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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
      <PageHeader
        title={t("finances.title")}
        subtitle="Kompletní přehled nákladů, pořízení, spotřebního materiálu a příjmů"
        actions={
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            <span>Přidat položku</span>
          </button>
        }
      />

      {/* KPI Cards - Sjednocený responzivní ribbon */}
      <div className="card p-4 grid grid-cols-3 divide-x divide-slate-100">
        <div className="px-2 sm:px-4 first:pl-0">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown className="w-4 h-4 text-rose-600 shrink-0 hidden sm:block" />
            <span className="section-label truncate">{t("finances.totalExpenses")}</span>
          </div>
          <div className="text-lg sm:text-2xl font-extrabold text-slate-900 truncate tabular-nums">
            {formatCzk(totalExpenses)}
          </div>
          <p className="text-xs text-slate-500 hidden md:block truncate mt-0.5">
            Pořízení a údržba
          </p>
        </div>

        <div className="px-2 sm:px-4">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0 hidden sm:block" />
            <span className="section-label truncate">{t("finances.totalIncomes")}</span>
          </div>
          <div className="text-lg sm:text-2xl font-extrabold text-emerald-700 truncate tabular-nums">
            {formatCzk(totalIncomes)}
          </div>
          <p className="text-xs text-slate-500 hidden md:block truncate mt-0.5">
            Prodej dílů a kol
          </p>
        </div>

        <div className="px-2 sm:px-4 last:pr-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Coins className="w-4 h-4 text-navy-600 shrink-0 hidden sm:block" />
            <span className="section-label truncate">{t("finances.netCost")} (TCO)</span>
          </div>
          <div className="text-lg sm:text-2xl font-extrabold text-navy-700 truncate tabular-nums">
            {formatCzk(netTotal)}
          </div>
          <p className="text-xs text-slate-500 hidden md:block truncate mt-0.5">
            Celková bilance
          </p>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="card p-4 sm:p-5 space-y-4">
        <h2 className="text-sm font-bold text-slate-900">
          Rozložení výdajů podle kategorií
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Object.entries(categoryTotals).map(([catKey, total]) => {
            const percent = totalExpenses > 0 ? Math.round((total / totalExpenses) * 100) : 0;
            return (
              <div key={catKey} className="panel panel-neutral">
                <span className="text-xs text-slate-500 block mb-1 font-medium">
                  {t(`finances.categories.${catKey}`)}
                </span>
                <span className="text-lg font-bold text-slate-900 tabular-nums block">
                  {formatCzk(total)}
                </span>
                <span className="text-xs text-slate-500 font-semibold tabular-nums">
                  {percent} % výdajů
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unified Transaction Table */}
      <div className="card overflow-hidden">
        <div className="card-header">
          <h2 className="text-sm font-bold text-slate-900">
            Všechny finanční položky ({transactions.length})
          </h2>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="btn-secondary btn-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Přidat položku</span>
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="empty-state py-12 space-y-3">
            <p className="text-sm font-semibold text-slate-700">
              Zatím nebyly zaznamenány žádné finanční transakce.
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Zaznamenejte výdaj za dílenský materiál (maziva, tmely), servisní práce, příslušenství nebo nákup kola.
            </p>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="btn-primary mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>Zapsat první položku</span>
            </button>
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
                      <span className={`chip ${isExpense ? "chip-rose" : "chip-emerald"}`}>
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
                      isExpense ? "text-slate-900" : "text-emerald-700"
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

      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
}
