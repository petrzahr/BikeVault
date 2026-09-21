"use client";

import React, { useState } from "react";
import { useVault } from "@/context/VaultContext";
import { Plus, Warehouse, Bike as BikeIcon, Clock, GripVertical } from "lucide-react";
import { BikeCard } from "@/components/garage/BikeCard";
import { AddBikeModal } from "@/components/garage/AddBikeModal";
import { t, formatKm, formatMinutes } from "@/lib/i18n";
import { buttonClass } from "@/lib/ui";

interface GarageClientProps {
  initialBikes?: any[];
  allTransactions?: any[];
  serviceSchedulesWithStatus?: any[];
}

export function GarageClient({
  initialBikes: propBikes,
  allTransactions: propTransactions,
  serviceSchedulesWithStatus: propServiceSchedules,
}: GarageClientProps = {}) {
  const { data, getServiceScheduleStatuses, reorderBikes } = useVault();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "SOLD" | "ARCHIVED">("ACTIVE");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const initialBikes = propBikes ?? data.bikes;
  const allTransactions = propTransactions ?? data.financialTransactions;
  const serviceSchedulesWithStatus = propServiceSchedules ?? getServiceScheduleStatuses();

  // Filter bikes by tab
  const filteredBikes = initialBikes.filter((b) => {
    if (activeTab === "ACTIVE") return b.status === "ACTIVE";
    if (activeTab === "SOLD") return b.status === "SOLD";
    return b.status === "ARCHIVED" || b.status === "INACTIVE";
  });

  // Řazení kol přetažením: kolo se vloží na pozici cílové karty
  const handleDrop = (targetId: string) => {
    if (draggedId && draggedId !== targetId) {
      const ids = filteredBikes.map((b) => b.id);
      const from = ids.indexOf(draggedId);
      const to = ids.indexOf(targetId);
      if (from !== -1 && to !== -1) {
        ids.splice(to, 0, ids.splice(from, 1)[0]);
        reorderBikes(ids);
      }
    }
    setDraggedId(null);
    setOverId(null);
  };

  // Calculate Garage totals
  const totalMileage = initialBikes.reduce((acc, b) => acc + Number(b.currentKm || 0), 0);
  const totalMinutes = initialBikes.reduce((acc, b) => acc + (b.currentMinutes || 0), 0);
  const totalBikesCount = initialBikes.filter((b) => b.status === "ACTIVE").length;

  // Build service summary map per bike
  const getBikeServiceSummary = (bikeId: string) => {
    const bikeSchedules = serviceSchedulesWithStatus.filter(
      (s: { schedule?: { bikeId?: string | null }; status?: { urgency: string } }) =>
        s.schedule?.bikeId === bikeId
    );
    if (bikeSchedules.length === 0) return undefined;

    const overdue = bikeSchedules.find(
      (s: { status?: { urgency: string } }) => s.status?.urgency === "OVERDUE"
    );
    if (overdue) {
      return {
        urgency: "OVERDUE" as const,
        text: `${overdue.schedule.name}: ${overdue.status.summaryTextCs}`,
      };
    }
    const dueSoon = bikeSchedules.find(
      (s: { status?: { urgency: string } }) => s.status?.urgency === "DUE_SOON"
    );
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
    <div className="space-y-5 pb-12">
      {/* Horní akční lišta */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-slate-900">{t("garage.title")}</h2>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold tabular-nums border border-slate-200">
                {totalBikesCount} {totalBikesCount === 1 ? "kolo" : totalBikesCount >= 2 && totalBikesCount <= 4 ? "kola" : "kol"}
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className={buttonClass("primary", "md", "self-start sm:self-auto")}
          >
            <Plus className="w-4 h-4" />
            <span>{t("garage.addBike")}</span>
          </button>
        </div>

        {/* Přepínač záložek: Aktivní / Prodaná / Archivovaná */}
        <div className="flex gap-1.5 p-1 bg-slate-200/60 rounded-xl max-w-sm pt-1">
          <button
            onClick={() => setActiveTab("ACTIVE")}
            className={`flex-1 flex items-center justify-center px-3 py-1.5 text-xs font-semibold whitespace-nowrap rounded-lg transition-all cursor-pointer ${
              activeTab === "ACTIVE"
                ? "bg-navy-600 text-white shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>{t("garage.tabs.active")} ({initialBikes.filter((b) => b.status === "ACTIVE").length})</span>
          </button>
          <button
            onClick={() => setActiveTab("SOLD")}
            className={`flex-1 flex items-center justify-center px-3 py-1.5 text-xs font-semibold whitespace-nowrap rounded-lg transition-all cursor-pointer ${
              activeTab === "SOLD"
                ? "bg-navy-600 text-white shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>{t("garage.tabs.sold")} ({initialBikes.filter((b) => b.status === "SOLD").length})</span>
          </button>
          <button
            onClick={() => setActiveTab("ARCHIVED")}
            className={`flex-1 flex items-center justify-center px-3 py-1.5 text-xs font-semibold whitespace-nowrap rounded-lg transition-all cursor-pointer ${
              activeTab === "ARCHIVED"
                ? "bg-navy-600 text-white shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>{t("garage.tabs.archived")} ({initialBikes.filter((b) => b.status === "ARCHIVED" || b.status === "INACTIVE").length})</span>
          </button>
        </div>
      </div>

      {/* KPI Karty agregátů garáže */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Celkový nájezd garáže</span>
            <div className="p-1.5 rounded-lg bg-navy-50 text-navy-600">
              <BikeIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 truncate tabular-nums">
            {formatKm(totalMileage)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            Součet všech zaznamenaných kilometrů
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Odjeto celkem</span>
            <div className="p-1.5 rounded-lg bg-navy-50 text-navy-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 truncate tabular-nums">
            {formatMinutes(totalMinutes)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            Provozní doba v sedle na všech kolech
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Kola v provozu</span>
            <div className="p-1.5 rounded-lg bg-navy-50 text-navy-600">
              <Warehouse className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 truncate tabular-nums">
            {totalBikesCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            Aktivní kola připravená k jízdě
          </p>
        </div>
      </div>

      {/* Seznam kol */}
      {filteredBikes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-sm">
          <p className="text-slate-400 text-sm">
            {activeTab === "ACTIVE"
              ? "Ve virtuální garáži zatím nemáte žádná aktivní kola."
              : "V této kategorii nejsou žádná kola."}
          </p>
          {activeTab === "ACTIVE" && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className={buttonClass("primary", "md", "mt-4")}
            >
              <Plus className="w-4 h-4" />
              <span>Přidat první kolo</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBikes.map((bike) => (
            <div
              key={bike.id}
              onDragOver={(e) => {
                if (!draggedId) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (overId !== bike.id) setOverId(bike.id);
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(bike.id);
              }}
              onDragEnd={() => {
                setDraggedId(null);
                setOverId(null);
              }}
              className={`relative rounded-2xl transition-all ${
                draggedId === bike.id ? "opacity-40" : ""
              } ${
                overId === bike.id && draggedId !== bike.id
                  ? "ring-2 ring-navy-600 ring-offset-2"
                  : ""
              }`}
            >
              <BikeCard
                bike={bike}
                serviceSummary={getBikeServiceSummary(bike.id)}
                netCost={getBikeNetCost(bike.id)}
              />
              <div
                draggable
                title="Přetažením změníte pořadí"
                onDragStart={(e) => {
                  const card = e.currentTarget.parentElement;
                  if (card) e.dataTransfer.setDragImage(card, 24, 24);
                  e.dataTransfer.effectAllowed = "move";
                  setDraggedId(bike.id);
                }}
                onDragEnd={() => {
                  setDraggedId(null);
                  setOverId(null);
                }}
                className="absolute top-3 left-2.5 z-10 h-[26px] w-5 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors cursor-grab active:cursor-grabbing"
              >
                <GripVertical className="w-4 h-4 drop-shadow-[0_0_2px_rgba(255,255,255,0.9)]" />
              </div>
            </div>
          ))}
        </div>
      )}

      <AddBikeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
}

export default GarageClient;
