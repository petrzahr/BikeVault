"use client";

import React, { useState } from "react";
import { Plus, Warehouse, Bike as BikeIcon, History, Archive } from "lucide-react";
import { BikeCard } from "@/components/garage/BikeCard";
import { AddBikeModal } from "@/components/garage/AddBikeModal";
import { t, formatKm, formatMinutes, formatCzk } from "@/lib/i18n";
import { useRouter } from "next/navigation";

interface GarageClientProps {
  initialBikes: any[];
  allTransactions: any[];
  serviceSchedulesWithStatus: any[];
}

export function GarageClient({
  initialBikes,
  allTransactions,
  serviceSchedulesWithStatus,
}: GarageClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "SOLD" | "ARCHIVED">("ACTIVE");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Filter bikes by tab
  const filteredBikes = initialBikes.filter((b) => {
    if (activeTab === "ACTIVE") return b.status === "ACTIVE";
    if (activeTab === "SOLD") return b.status === "SOLD";
    return b.status === "ARCHIVED" || b.status === "INACTIVE";
  });

  // Calculate Garage totals
  const totalMileage = initialBikes.reduce((acc, b) => acc + Number(b.currentKm || 0), 0);
  const totalMinutes = initialBikes.reduce((acc, b) => acc + (b.currentMinutes || 0), 0);
  const totalBikesCount = initialBikes.filter((b) => b.status === "ACTIVE").length;

  // Build service summary map per bike
  const getBikeServiceSummary = (bikeId: string) => {
    const bikeSchedules = serviceSchedulesWithStatus.filter((s) => s.schedule.bikeId === bikeId);
    if (bikeSchedules.length === 0) return undefined;

    // Pick most urgent
    const overdue = bikeSchedules.find((s) => s.status.urgency === "OVERDUE");
    if (overdue) {
      return {
        urgency: "OVERDUE" as const,
        text: `${overdue.schedule.name}: ${overdue.status.summaryTextCs}`,
      };
    }
    const dueSoon = bikeSchedules.find((s) => s.status.urgency === "DUE_SOON");
    if (dueSoon) {
      return {
        urgency: "DUE_SOON" as const,
        text: `${dueSoon.schedule.name} ${dueSoon.status.summaryTextCs}`,
      };
    }
    return {
      urgency: "OK" as const,
      text: t("maintenance.statuses.ok"),
    };
  };

  // Build net cost per bike
  const getBikeNetCost = (bikeId: string) => {
    const bikeTx = allTransactions.filter((tx) => tx.bikeId === bikeId);
    let expenses = 0;
    let incomes = 0;
    for (const tx of bikeTx) {
      const amt = Number(tx.amount || 0);
      if (tx.type === "EXPENSE") expenses += amt;
      else if (tx.type === "INCOME") incomes += amt;
    }
    return Math.max(0, expenses - incomes);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {t("garage.title")}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-mono text-xs font-semibold">
              {totalBikesCount} {totalBikesCount === 1 ? "kolo" : totalBikesCount >= 2 && totalBikesCount <= 4 ? "kola" : "kol"}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {t("garage.subtitle")}
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{t("garage.addBike")}</span>
        </button>
      </div>

      {/* Garage Aggregates Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
            <BikeIcon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">
              Celkový nájezd garáže
            </span>
            <span className="text-2xl font-extrabold text-slate-900 font-mono">
              {formatKm(totalMileage)}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center">
            <Warehouse className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">
              Odjeto celkem
            </span>
            <span className="text-2xl font-extrabold text-slate-900 font-mono">
              {formatMinutes(totalMinutes)}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
            <History className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">
              Aktivní kola
            </span>
            <span className="text-2xl font-extrabold text-slate-900 font-mono">
              {totalBikesCount}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("ACTIVE")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "ACTIVE"
              ? "bg-white text-slate-900 border border-slate-200 shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          {t("garage.tabs.active")} ({initialBikes.filter((b) => b.status === "ACTIVE").length})
        </button>
        <button
          onClick={() => setActiveTab("SOLD")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "SOLD"
              ? "bg-white text-slate-900 border border-slate-200 shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          {t("garage.tabs.sold")} ({initialBikes.filter((b) => b.status === "SOLD").length})
        </button>
        <button
          onClick={() => setActiveTab("ARCHIVED")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "ARCHIVED"
              ? "bg-white text-slate-900 border border-slate-200 shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          {t("garage.tabs.history")} ({initialBikes.filter((b) => b.status === "ARCHIVED" || b.status === "INACTIVE").length})
        </button>
      </div>

      {/* Bikes Grid or Empty State */}
      {filteredBikes.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-lg mx-auto my-12 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-4">
            <Warehouse className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">
            {t("garage.emptyTitle")}
          </h3>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            {t("garage.emptyDesc")}
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{t("garage.addBike")}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBikes.map((bike) => (
            <BikeCard
              key={bike.id}
              bike={bike}
              serviceSummary={getBikeServiceSummary(bike.id)}
              netCost={getBikeNetCost(bike.id)}
            />
          ))}
        </div>
      )}

      <AddBikeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
