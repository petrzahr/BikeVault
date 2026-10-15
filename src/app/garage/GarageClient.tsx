"use client";

import React, { useState } from "react";
import { useVault } from "@/context/VaultContext";
import { Plus, Warehouse, Bike as BikeIcon, Clock, ArrowUpDown, Check, CheckCircle2, AlertTriangle } from "lucide-react";
import { BikeCard } from "@/components/garage/BikeCard";
import { AddBikeModal } from "@/components/garage/AddBikeModal";
import { t, formatKm, formatMinutes, pluralizeCs } from "@/lib/i18n";
import { buttonClass } from "@/lib/ui";
import { getBikeTransactions } from "@/lib/domain/finance";

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
  const [isReordering, setIsReordering] = useState(false);
  const [reorderStatusText, setReorderStatusText] = useState("");

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
        const movedBike = filteredBikes.find((b) => b.id === draggedId);
        setReorderStatusText(`Kolo ${movedBike?.name || ""} přesunuto na pozici ${to + 1} z ${ids.length}`);
      }
    }
    setDraggedId(null);
    setOverId(null);
  };

  // Klávesové řazení kol (WCAG SC 2.1.1 a SC 2.5.7)
  const handleMoveBike = (bikeId: string, direction: "PREV" | "NEXT") => {
    const ids = filteredBikes.map((b) => b.id);
    const index = ids.indexOf(bikeId);
    if (index === -1) return;
    const targetIndex = direction === "PREV" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= ids.length) return;
    const newIds = [...ids];
    const [moved] = newIds.splice(index, 1);
    newIds.splice(targetIndex, 0, moved);
    reorderBikes(newIds);
    const movedBike = filteredBikes.find((b) => b.id === bikeId);
    setReorderStatusText(`Kolo ${movedBike?.name || ""} přesunuto na pozici ${targetIndex + 1} z ${ids.length}`);
  };

  // Calculate Garage totals & Fleet Readiness
  const totalMileage = initialBikes.reduce((acc, b) => acc + Number(b.currentKm || 0), 0);
  const totalMinutes = initialBikes.reduce((acc, b) => acc + (b.currentMinutes || 0), 0);
  const activeBikes = initialBikes.filter((b) => b.status === "ACTIVE");
  const totalBikesCount = activeBikes.length;

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

  const overdueBikesCount = activeBikes.filter((b) => {
    const summary = getBikeServiceSummary(b.id);
    return summary?.urgency === "OVERDUE";
  }).length;

  const dueSoonBikesCount = activeBikes.filter((b) => {
    const summary = getBikeServiceSummary(b.id);
    return summary?.urgency === "DUE_SOON";
  }).length;

  const readyBikesCount = Math.max(0, activeBikes.length - overdueBikesCount);

  // Build net cost per bike
  const getBikeNetCost = (bikeId: string) => {
    const bikeTx = getBikeTransactions(allTransactions, data.componentInstallations, bikeId);
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
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold tabular-nums border border-slate-200">
                {totalBikesCount} {pluralizeCs(totalBikesCount, "kolo", "kola", "kol")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {filteredBikes.length > 1 && (
              <button
                type="button"
                onClick={() => setIsReordering(!isReordering)}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer min-h-[44px] ${
                  isReordering
                    ? "bg-navy-700 text-white border-navy-700 shadow-sm"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                }`}
                title={isReordering ? "Ukončit řazení kol" : "Uspořádat pořadí kol v garáži"}
                aria-pressed={isReordering}
              >
                {isReordering ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Hotovo</span>
                  </>
                ) : (
                  <>
                    <ArrowUpDown className="w-4 h-4 text-slate-500" />
                    <span>Uspořádat</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={() => setIsAddModalOpen(true)}
              className={buttonClass("primary", "md", "self-start sm:self-auto")}
            >
              <Plus className="w-4 h-4" />
              <span>{t("garage.addBike")}</span>
            </button>
          </div>
        </div>

        {/* Přepínač záložek: Aktivní / Prodaná / Archivovaná */}
        <div role="tablist" aria-label="Stav kol v garáži" className="flex gap-1.5 p-1 bg-slate-200/60 rounded-xl max-w-sm">
          <button
            role="tab"
            aria-selected={activeTab === "ACTIVE"}
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
            role="tab"
            aria-selected={activeTab === "SOLD"}
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
            role="tab"
            aria-selected={activeTab === "ARCHIVED"}
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

      {/* KPI Agregáty garáže - Workshop Telemetry Cockpit */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3.5 sm:p-4 grid grid-cols-3 divide-x divide-slate-100 sm:divide-slate-200/60">
        <div className="px-2 sm:px-4 first:pl-1">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <div className="p-1 rounded-md bg-navy-50 text-navy-600 shrink-0 hidden sm:flex">
              <BikeIcon className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">Nájezd garáže</span>
          </div>
          <div className="text-base sm:text-xl font-bold text-slate-900 truncate tabular-nums">
            {formatKm(totalMileage)}
          </div>
          <p className="text-[10px] text-slate-500 hidden md:block truncate mt-0.5 font-medium">
            Zaznamenané kilometry
          </p>
        </div>

        <div className="px-2 sm:px-4">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <div className="p-1 rounded-md bg-navy-50 text-navy-600 shrink-0 hidden sm:flex">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">Čas v sedle</span>
          </div>
          <div className="text-base sm:text-xl font-bold text-slate-900 truncate tabular-nums">
            {formatMinutes(totalMinutes)}
          </div>
          <p className="text-[10px] text-slate-500 hidden md:block truncate mt-0.5 font-medium">
            Provozní hodiny flotily
          </p>
        </div>

        <div className="px-2 sm:px-4 last:pr-1">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <div className="p-1 rounded-md bg-navy-50 text-navy-600 shrink-0 hidden sm:flex">
              <Warehouse className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">Stav flotily</span>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-base sm:text-xl font-bold text-slate-900 truncate tabular-nums">
              {readyBikesCount} / {activeBikes.length}
            </div>
            <span className="text-[11px] font-medium text-slate-500 hidden sm:inline">připraveno</span>
          </div>
          <div className="mt-0.5">
            {overdueBikesCount > 0 ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200/60">
                <AlertTriangle className="w-2.5 h-2.5" />
                <span>{overdueBikesCount} {pluralizeCs(overdueBikesCount, "vyžaduje servis", "vyžadují servis", "vyžaduje servis")}</span>
              </span>
            ) : dueSoonBikesCount > 0 ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
                <Clock className="w-2.5 h-2.5" />
                <span>{dueSoonBikesCount} {pluralizeCs(dueSoonBikesCount, "brzy na servis", "brzy na servis", "brzy na servis")}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                <CheckCircle2 className="w-2.5 h-2.5" />
                <span>100% připraveno k jízdě</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Reorder Announcement Banner */}
      {isReordering && (
        <div className="bg-navy-900 text-white rounded-xl p-3 px-4 flex items-center justify-between text-xs shadow-sm border border-navy-800">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-navy-300 shrink-0" />
            <span><strong>Režim uspořádání aktivní:</strong> Pořadí kol měňte šipkami na kartách nebo přetažením myší.</span>
          </div>
          <button
            type="button"
            onClick={() => setIsReordering(false)}
            className="px-3 py-1 bg-white text-navy-900 hover:bg-slate-100 font-semibold rounded-lg text-xs transition-colors cursor-pointer shrink-0 ml-3"
          >
            Hotovo
          </button>
        </div>
      )}
      <div aria-live="polite" className="sr-only">
        {reorderStatusText}
      </div>

      {/* Seznam kol */}
      {filteredBikes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-sm">
          <p className="text-slate-700 font-medium text-sm">
            {activeTab === "ACTIVE"
              ? "Ve virtuální garáži zatím nemáte žádné aktivní kolo."
              : activeTab === "SOLD"
              ? "Zatím jste neoznačili žádné kolo jako prodané."
              : "V archivu se nenachází žádná archivovaná kola."}
          </p>
          <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
            {activeTab === "ACTIVE"
              ? "Založte si své první kolo a začněte sledovat jeho kompletní servisní historii a komponenty."
              : activeTab === "SOLD"
              ? "Jakmile v detailu kola nastavíte stav „Prodáno“, přesune se do tohoto přehledu včetně prodejní ceny."
              : "Archivovaná kola se nezobrazují v aktivní garáži, jejich data však zůstávají zachována."}
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
          {filteredBikes.map((bike, index) => (
            <div
              key={bike.id}
              className={`bike-card-wrapper relative rounded-2xl transition-all ${
                draggedId === bike.id ? "opacity-40" : ""
              } ${
                overId === bike.id && draggedId !== bike.id
                  ? "ring-2 ring-navy-600 ring-offset-2"
                  : ""
              }`}
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
            >
              <BikeCard
                bike={bike}
                serviceSummary={getBikeServiceSummary(bike.id)}
                netCost={getBikeNetCost(bike.id)}
                isReordering={isReordering}
                onMoveEarlier={() => handleMoveBike(bike.id, "PREV")}
                onMoveLater={() => handleMoveBike(bike.id, "NEXT")}
                canMoveEarlier={index > 0}
                canMoveLater={index < filteredBikes.length - 1}
                dragHandleProps={
                  isReordering
                    ? {
                        draggable: true,
                        onDragStart: (e) => {
                          const card = (e.currentTarget as HTMLElement).closest(".bike-card-wrapper");
                          if (card) e.dataTransfer.setDragImage(card, 24, 24);
                          e.dataTransfer.effectAllowed = "move";
                          setDraggedId(bike.id);
                        },
                        onDragEnd: () => {
                          setDraggedId(null);
                          setOverId(null);
                        },
                      }
                    : undefined
                }
              />
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
