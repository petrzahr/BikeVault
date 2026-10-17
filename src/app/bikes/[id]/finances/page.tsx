"use client";

import React, { use, useState } from "react";
import { useVault } from "@/context/VaultContext";
import { BikeHeader } from "@/components/bike/BikeHeader";
import { DeleteButton } from "@/components/common/DeleteButton";
import { AddTransactionModal } from "@/components/finances/AddTransactionModal";
import { calculateTco, getBikeTransactions } from "@/lib/domain/finance";
import { formatCzk, formatDateCs, t } from "@/lib/i18n";
import { Coins, TrendingDown, TrendingUp, Calendar, Tag, Plus } from "lucide-react";

import Link from "next/link";

interface BikeFinancesPageProps {
  params: Promise<{ id: string }>;
}

export default function BikeFinancesPage({ params }: BikeFinancesPageProps) {
  const { id } = use(params);
  const { data, getBike, deleteTransaction } = useVault();
  const bike = getBike(id);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  if (!bike) {
    return (
      <div className="card empty-state py-12">
        <h2 className="text-base font-bold text-slate-800 mb-2">Kolo nenalezeno</h2>
        <Link href="/garage" className="text-signal-600 hover:underline text-xs font-semibold">
          Zpět do Garáže
        </Link>
      </div>
    );
  }

  const transactions = getBikeTransactions(data.financialTransactions, data.componentInstallations, id)
    .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());

  const tco = calculateTco({
    transactions: transactions.map((t) => ({ type: t.type, amount: Number(t.amount) })),
    currentKm: Number(bike.currentKm),
    currentMinutes: bike.currentMinutes,
    purchaseDate: bike.purchaseDate,
    soldDate: bike.soldDate,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <BikeHeader bike={bike} />

      {/* TCO Summary Cards - Sjednocený responzivní ribbon */}
      <div className="card p-4 grid grid-cols-3 divide-x divide-slate-100">
        <div className="min-w-0 px-2 sm:px-4 first:pl-0">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown className="w-4 h-4 text-rose-600 shrink-0 hidden sm:block" />
            <span className="section-label truncate">{t("finances.totalExpenses")}</span>
          </div>
          <div className="text-lg sm:text-2xl readout text-slate-900 truncate">
            {formatCzk(tco.totalExpenses)}
          </div>
          <p className="text-xs text-slate-500 hidden md:block truncate mt-0.5">
            Nákup kola a servis
          </p>
        </div>

        <div className="min-w-0 px-2 sm:px-4">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0 hidden sm:block" />
            <span className="section-label truncate">{t("finances.totalIncomes")}</span>
          </div>
          <div className="text-lg sm:text-2xl readout text-emerald-700 truncate">
            {formatCzk(tco.totalIncomes)}
          </div>
          <p className="text-xs text-slate-500 hidden md:block truncate mt-0.5">
            Prodej komponent
          </p>
        </div>

        <div className="min-w-0 px-2 sm:px-4 last:pr-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Coins className="w-4 h-4 text-signal-600 shrink-0 hidden sm:block" />
            <span className="section-label truncate">{t("finances.netCost")}</span>
          </div>
          <div className="text-lg sm:text-2xl readout text-signal-700 truncate">
            {formatCzk(tco.netOwnershipCost)}
          </div>
          <p className="text-xs text-slate-500 hidden md:block truncate mt-0.5">
            Celkové čisté náklady (TCO)
          </p>
        </div>
      </div>

      {/* Transaction Ledger */}
      <div className="card overflow-hidden">
        <div className="card-header">
          <h2 className="text-sm font-bold text-slate-900">
            {t("finances.ledger")} ({transactions.length})
          </h2>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary btn-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Přidat položku</span>
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="empty-state space-y-3">
            <p>Zatím nebyly zaznamenány žádné finanční transakce.</p>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="btn-secondary btn-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Zaznamenat první výdaj / příjem</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.map((tx) => {
              const isExpense = tx.type === "EXPENSE";
              const categoryKey = `finances.categories.${tx.category}`;

              return (
                <div key={tx.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className={`chip ${isExpense ? "chip-rose" : "chip-emerald"}`}>
                        {t(categoryKey)}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        {tx.notes || t(categoryKey)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 tabular-nums">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{formatDateCs(tx.transactionDate)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
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
        defaultBikeId={bike.id}
      />
    </div>
  );
}
