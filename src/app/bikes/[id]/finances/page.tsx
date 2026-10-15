"use client";

import React, { use, useState } from "react";
import { useVault } from "@/context/VaultContext";
import { BikeHeader } from "@/components/bike/BikeHeader";
import { DeleteButton } from "@/components/common/DeleteButton";
import { AddTransactionModal } from "@/components/finances/AddTransactionModal";
import { calculateTco, getBikeTransactions } from "@/lib/domain/finance";
import { formatCzk, formatDateCs, t } from "@/lib/i18n";
import { Coins, TrendingDown, TrendingUp, Calendar, Tag, Plus } from "lucide-react";
import { buttonClass } from "@/lib/ui";
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
      <div className="p-12 text-center text-slate-500 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
        <h2 className="text-base font-bold text-slate-800 mb-2">Kolo nenalezeno</h2>
        <Link href="/garage" className="text-navy-600 hover:underline text-xs font-semibold">
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
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3 sm:p-4 grid grid-cols-3 divide-x divide-slate-100 sm:divide-slate-200/60">
        <div className="px-2 sm:px-4 first:pl-1">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <div className="p-1 rounded-md bg-rose-50 text-rose-600 shrink-0 hidden sm:flex">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] sm:text-xs font-semibold truncate">{t("finances.totalExpenses")}</span>
          </div>
          <div className="text-base sm:text-xl font-bold text-slate-900 truncate tabular-nums">
            {formatCzk(tco.totalExpenses)}
          </div>
          <p className="text-[10px] text-slate-500 hidden md:block truncate mt-0.5">
            Nákup kola a servis
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
            {formatCzk(tco.totalIncomes)}
          </div>
          <p className="text-[10px] text-slate-500 hidden md:block truncate mt-0.5">
            Prodej komponent
          </p>
        </div>

        <div className="px-2 sm:px-4 last:pr-1">
          <div className="flex items-center gap-1.5 text-navy-700 mb-1">
            <div className="p-1 rounded-md bg-navy-50 text-navy-600 shrink-0 hidden sm:flex">
              <Coins className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold truncate">{t("finances.netCost")}</span>
          </div>
          <div className="text-base sm:text-xl font-bold text-navy-700 truncate tabular-nums">
            {formatCzk(tco.netOwnershipCost)}
          </div>
          <p className="text-[10px] text-slate-500 hidden md:block truncate mt-0.5">
            Celkové čisté náklady (TCO)
          </p>
        </div>
      </div>

      {/* Transaction Ledger */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            {t("finances.ledger")} ({transactions.length})
          </h3>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className={buttonClass("primary", "sm")}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Přidat položku</span>
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 space-y-3">
            <p>Zatím nebyly zaznamenány žádné finanční transakce.</p>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className={buttonClass("secondary", "sm")}
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
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        isExpense ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}>
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

      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        defaultBikeId={bike.id}
      />
    </div>
  );
}
