"use client";

import React, { use } from "react";
import { useVault } from "@/context/VaultContext";
import { BikeHeader } from "@/components/bike/BikeHeader";
import { DeleteButton } from "@/components/common/DeleteButton";
import { calculateTco } from "@/lib/domain/finance";
import { formatCzk, formatDateCs, t } from "@/lib/i18n";
import { Coins, TrendingDown, TrendingUp, Calendar, Tag } from "lucide-react";
import Link from "next/link";

interface BikeFinancesPageProps {
  params: Promise<{ id: string }>;
}

export default function BikeFinancesPage({ params }: BikeFinancesPageProps) {
  const { id } = use(params);
  const { data, getBike, deleteTransaction } = useVault();
  const bike = getBike(id);

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

  const transactions = data.financialTransactions
    .filter((t) => t.bikeId === id)
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

      <div className="bg-white rounded-2xl p-5 min-h-[5rem] border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {t("finances.title")} kola
          </h2>
        </div>
      </div>

      {/* TCO Summary Cards */}
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
            {formatCzk(tco.totalExpenses)}
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
            {formatCzk(tco.totalIncomes)}
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-navy-700">
              {t("finances.netCost")}
            </span>
            <div className="p-2 rounded-xl bg-navy-50 text-navy-600">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-bold text-navy-700 tabular-nums">
            {formatCzk(tco.netOwnershipCost)}
          </span>
        </div>
      </div>

      {/* Transaction Ledger */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            {t("finances.ledger")} ({transactions.length})
          </h3>
        </div>

        {transactions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Zatím nebyly zaznamenány žádné finanční transakce.
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

                    <div className="flex items-center gap-2 text-xs text-slate-400 tabular-nums">
                      <Calendar className="w-3.5 h-3.5" />
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
    </div>
  );
}
