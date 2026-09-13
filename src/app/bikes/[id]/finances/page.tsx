import React from "react";
import { notFound } from "next/navigation";
import { getBikeById } from "@/app/actions/bikes";
import { BikeHeader } from "@/components/bike/BikeHeader";
import { db, schema } from "@/db";
import { eq, sql } from "drizzle-orm";
import { calculateTco } from "@/lib/domain/finance";
import { formatCzk, formatDateCs, t } from "@/lib/i18n";
import { Coins, TrendingDown, TrendingUp, Calendar, Tag } from "lucide-react";

interface BikeFinancesPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function BikeFinancesPage({ params }: BikeFinancesPageProps) {
  const { id } = await params;
  const bike = await getBikeById(id);
  if (!bike) notFound();

  const transactions = await db
    .select()
    .from(schema.financialTransactions)
    .where(eq(schema.financialTransactions.bikeId, id))
    .orderBy(sql`${schema.financialTransactions.transactionDate} DESC`);

  const tco = calculateTco({
    transactions: transactions.map((t) => ({ type: t.type as any, amount: Number(t.amount) })),
    currentKm: Number(bike.currentKm),
    currentMinutes: bike.currentMinutes,
    purchaseDate: bike.purchaseDate,
    soldDate: bike.soldDate,
  });

  return (
    <div className="space-y-8 animate-fade-in">
      <BikeHeader bike={bike} />

      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {t("finances.title")} kola
          </h2>
          <p className="text-xs text-slate-500">
            Kompletní finanční ledger všech výdajů a příjmů spojených s tímto kolem
          </p>
        </div>
      </div>

      {/* TCO Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {t("finances.totalExpenses")}
            </span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <span className="text-2xl font-bold text-slate-900 font-mono">
            {formatCzk(tco.totalExpenses)}
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
            {formatCzk(tco.totalIncomes)}
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">
              {t("finances.netCost")}
            </span>
            <Coins className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-2xl font-bold text-blue-700 font-mono">
            {formatCzk(tco.netOwnershipCost)}
          </span>
        </div>
      </div>

      {/* Transaction Ledger */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
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
                <div key={tx.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                        isExpense ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}>
                        {t(categoryKey)}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        {tx.notes || t(categoryKey)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDateCs(tx.transactionDate)}</span>
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
        )}
      </div>
    </div>
  );
}
