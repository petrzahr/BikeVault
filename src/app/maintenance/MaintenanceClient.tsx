"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Wrench, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Calendar, 
  Bike as BikeIcon, 
  Layers, 
  Plus, 
  Edit3, 
  Power, 
  Trash2, 
  Sparkles,
  Search,
  Filter,
  Sliders,
  Loader2,
  Check
} from "lucide-react";
import { t, formatDateCs, formatCzk, formatKm, formatMinutes } from "@/lib/i18n";
import { ServiceScheduleModal } from "@/components/maintenance/ServiceScheduleModal";
import { RecordServiceEventModal } from "@/components/maintenance/RecordServiceEventModal";
import { useVault } from "@/context/VaultContext";
import { useFeedback } from "@/components/common/Feedback";
import { PageHeader } from "@/components/common/PageHeader";

interface MaintenanceClientProps {
  allSchedules?: any[];
  recentEvents?: any[];
  bikes?: any[];
  components?: any[];
}

export function MaintenanceClient({
  allSchedules: propAllSchedules,
  recentEvents: propRecentEvents,
  bikes: propBikes,
  components: propComponents,
}: MaintenanceClientProps = {}) {
  const { 
    data, 
    toggleServiceScheduleActive, 
    deleteServiceSchedule, 
    getAllConfiguredSchedulesWithStatus, 
    getGarageBikes 
  } = useVault();
  const { toast, confirm } = useFeedback();

  const allSchedules = propAllSchedules ?? getAllConfiguredSchedulesWithStatus();
  const bikes = propBikes ?? getGarageBikes("ACTIVE");
  const components = propComponents ?? data.components;
  const recentEvents = propRecentEvents ?? data.serviceEvents
    .slice()
    .sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime())
    .slice(0, 10)
    .map((event) => ({
      event,
      bike: data.bikes.find((b) => b.id === event.bikeId),
      component: event.componentId ? data.components.find((c) => c.id === event.componentId) : null,
    }));

  // Filters for management table
  const [filterActive, setFilterActive] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any | null>(null);

  // Record service modal
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedScheduleForRecord, setSelectedScheduleForRecord] = useState<any | null>(null);

  // Group active schedules for top priority queues
  const activeSchedules = allSchedules.filter((s) => s.schedule.isActive);
  const overdue = activeSchedules.filter((s) => s.status.urgency === "OVERDUE");
  const dueSoon = activeSchedules.filter((s) => s.status.urgency === "DUE_SOON");
  const upcoming = activeSchedules.filter((s) => s.status.urgency === "OK");

  // Filtered schedules for management area
  const managedSchedules = allSchedules.filter((item) => {
    if (filterActive === "ACTIVE" && !item.schedule.isActive) return false;
    if (filterActive === "INACTIVE" && item.schedule.isActive) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.schedule.name.toLowerCase().includes(q);
      const matchBike = item.bike?.name?.toLowerCase().includes(q);
      const matchComp = item.component ? `${item.component.manufacturer} ${item.component.model}`.toLowerCase().includes(q) : false;
      return matchName || matchBike || matchComp;
    }
    return true;
  });

  const handleOpenCreatePlan = () => {
    setEditingSchedule(null);
    setIsPlanModalOpen(true);
  };

  const handleOpenEditPlan = (sched: any) => {
    setEditingSchedule(sched);
    setIsPlanModalOpen(true);
  };

  const handleToggleActive = (scheduleId: string, _currentActive?: boolean) => {
    try {
      toggleServiceScheduleActive(scheduleId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Chyba při změně stavu plánu.";
      toast(msg, "error");
    }
  };

  const handleDeletePlan = async (scheduleId: string) => {
    if (!(await confirm({ message: "Opravdu chcete tento servisní plán smazat?", confirmText: "Smazat", isDestructive: true }))) return;
    try {
      const res = deleteServiceSchedule(scheduleId);
      if (!res.success) {
        toast(res.message || "Plán nelze smazat.", "error");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Plán nelze smazat.";
      toast(msg, "error");
    }
  };

  const handleOpenRecordModal = (item?: any) => {
    setSelectedScheduleForRecord(item ? item.schedule : null);
    setIsRecordModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Action Bar Header */}
      <PageHeader
        title={t("maintenance.dashboard")}
        badge={
          overdue.length > 0 ? (
            <span className="chip chip-rose">{overdue.length} po termínu</span>
          ) : undefined
        }
        actions={
        <>
          <button
            onClick={() => handleOpenRecordModal()}
            className="btn-secondary"
          >
            <Wrench className="w-4 h-4" />
            <span>Zapsat servis bez plánu</span>
          </button>

          <button
            onClick={handleOpenCreatePlan}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            <span>Přidat servisní plán</span>
          </button>
        </>
        }
      />

      {/* 1. PO TERMÍNU */}
      {overdue.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <h2 className="text-base font-bold text-slate-900">
              {t("maintenance.groups.overdue")} ({overdue.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {overdue.map((item) => (
              <div
                key={item.schedule.id}
                className="card p-4 sm:p-5 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="chip chip-rose">
                      {item.status.summaryTextCs}
                    </span>
                    <span className="text-xs text-slate-600 font-medium">
                      {item.bike?.name}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">
                    {item.schedule.name}
                  </h3>
                  {item.component && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {item.component.manufacturer} {item.component.model}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500 tabular-nums">
                    Interval: {item.schedule.intervalKm ? `${item.schedule.intervalKm} km` : `${item.schedule.intervalHours} h`}
                  </span>
                  <button
                    onClick={() => handleOpenRecordModal(item)}
                    className="btn-primary btn-sm"
                  >
                    Zapsat servis →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. BRZY SERVIS */}
      {dueSoon.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <h2 className="text-base font-bold text-slate-900">
              {t("maintenance.groups.dueSoon")} ({dueSoon.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dueSoon.map((item) => (
              <div
                key={item.schedule.id}
                className="card p-4 sm:p-5 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="chip chip-amber">
                      Zbývá {item.status.summaryTextCs}
                    </span>
                    <span className="text-xs text-slate-600 font-medium">
                      {item.bike?.name}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">
                    {item.schedule.name}
                  </h3>
                  {item.component && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {item.component.manufacturer} {item.component.model}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500 tabular-nums">
                    Interval: {item.schedule.intervalKm ? `${item.schedule.intervalKm} km` : `${item.schedule.intervalHours} h`}
                  </span>
                  <button
                    onClick={() => handleOpenRecordModal(item)}
                    className="btn-primary btn-sm"
                  >
                    Zapsat servis →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. POZDĚJI / V POŘÁDKU */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <h2 className="text-base font-bold text-slate-900">
            {t("maintenance.groups.upcoming")} ({upcoming.length})
          </h2>
        </div>

        {upcoming.length === 0 ? (
          <div className="card empty-state">
            Žádné další plány v této sekci.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming.map((item) => (
              <div
                key={item.schedule.id}
                className="card p-4 flex flex-col justify-between space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="chip chip-emerald">{item.status.summaryTextCs}</span>
                  <span className="text-slate-500 font-medium">{item.bike?.name}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  {item.schedule.name}
                </h3>
                {item.component && (
                  <p className="text-xs text-slate-500">{item.component.manufacturer} {item.component.model}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. MANAGEMENT AREA: SPRÁVA VŠECH SERVISNÍCH PLÁNŮ */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-navy-600" />
              <span>Správa servisních plánů ({allSchedules.length})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Uživatelsky definované intervaly údržby s možností úprav, deaktivace a bezpečného mazání
            </p>
          </div>

          <button
            onClick={handleOpenCreatePlan}
            className="btn-primary self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Přidat plán</span>
          </button>
        </div>

        {/* Filters and search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="segmented inline-flex flex-wrap">
            {[
              { id: "ALL", label: `Všechny (${allSchedules.length})` },
              { id: "ACTIVE", label: `Aktivní (${activeSchedules.length})` },
              { id: "INACTIVE", label: `Deaktivované (${allSchedules.length - activeSchedules.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterActive(tab.id as any)}
                aria-pressed={filterActive === tab.id}
                className="segment"
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Hledat plán, kolo nebo díl..."
              aria-label="Hledat plán, kolo nebo díl"
              className="field pl-9 pr-4"
            />
          </div>
        </div>

        {/* Schedules Table / Cards */}
        {managedSchedules.length === 0 ? (
          <div className="card empty-state">
            Nebyly nalezeny žádné odpovídající servisní plány.
          </div>
        ) : (
          <div className="card overflow-hidden divide-y divide-slate-100">
            {managedSchedules.map((item) => {
              const sched = item.schedule;
              const status = item.status;
              const isOverdue = sched.isActive && status.urgency === "OVERDUE";
              const isDueSoon = sched.isActive && status.urgency === "DUE_SOON";

              return (
                <div key={sched.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs hover:bg-slate-50/50 transition-colors">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`chip ${
                        !sched.isActive
                          ? "chip-neutral"
                          : isOverdue
                          ? "chip-rose"
                          : isDueSoon
                          ? "chip-amber"
                          : "chip-emerald"
                      }`}>
                        {!sched.isActive ? "Deaktivováno" : status.summaryTextCs}
                      </span>

                      <span className="text-sm font-bold text-slate-900">
                        {sched.name}
                      </span>

                      {item.bike && (
                        <span className="text-xs text-navy-700 font-semibold flex items-center gap-1">
                          <BikeIcon className="w-3.5 h-3.5" />
                          <span>{item.bike.name}</span>
                        </span>
                      )}

                      {item.component && (
                        <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5" />
                          <span>{item.component.manufacturer} {item.component.model}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-slate-500">
                      <span className="font-semibold text-slate-700 tabular-nums">
                        Interval: {sched.intervalHours ? `${sched.intervalHours} h` : ""}{sched.intervalHours && sched.intervalKm ? " / " : ""}{sched.intervalKm ? `${sched.intervalKm} km` : ""}{sched.intervalMonths ? ` / ${sched.intervalMonths} měsíců` : ""}
                      </span>
                      {sched.lastServiceDate && (
                        <span className="tabular-nums">Naposledy: {formatDateCs(sched.lastServiceDate)} ({sched.lastServiceBikeHours ? `${sched.lastServiceBikeHours} h` : (sched.lastServiceBikeKm ? `${sched.lastServiceBikeKm} km` : "")})</span>
                      )}
                      {sched.notes && (
                        <span className="italic text-slate-500">"{sched.notes}"</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end md:self-auto">
                    <button
                      onClick={() => handleOpenRecordModal(item)}
                      className="btn-primary btn-sm"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Zapsat servis</span>
                    </button>

                    <button
                      onClick={() => handleOpenEditPlan(sched)}
                      className="btn-secondary btn-sm"
                      title="Upravit plán"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Upravit</span>
                    </button>

                    <button
                      onClick={() => handleToggleActive(sched.id, sched.isActive)}
                      className={`btn-icon ${sched.isActive ? "" : "text-emerald-700"}`}
                      title={sched.isActive ? "Deaktivovat plán" : "Aktivovat plán"}
                      aria-label={sched.isActive ? `Deaktivovat plán ${sched.name}` : `Aktivovat plán ${sched.name}`}
                    >
                      <Power className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeletePlan(sched.id)}
                      className="btn-icon btn-icon-danger"
                      title="Smazat plán (pouze bez servisní historie)"
                      aria-label={`Smazat plán ${sched.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. HISTORIE POSLEDNÍCH ÚKONŮ */}
      <div className="space-y-3 pt-2">
        <h2 className="text-base font-bold text-slate-900">
          {t("maintenance.groups.completed")} (Poslední úkony)
        </h2>

        {recentEvents.length === 0 ? (
          <div className="card empty-state">
            Zatím nebyly zapsány žádné servisní úkony.
          </div>
        ) : (
          <div className="card overflow-hidden divide-y divide-slate-100">
            {recentEvents.map((item) => (
              <div key={item.event.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-slate-900">{item.event.name || item.event.description}</span>
                    {item.bike && (
                      <span className="text-xs text-navy-700 font-medium">({item.bike.name})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 tabular-nums">
                    <span>{formatDateCs(item.event.serviceDate)}</span>
                    <span>•</span>
                    <span>Mechanik: {item.event.shopName || item.event.serviceProvider || "Svépomocí"}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-bold text-slate-900 tabular-nums block">
                    {formatCzk(Number(item.event.totalPrice ?? ((item.event.partsPrice || 0) + (item.event.laborPrice || 0))))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: Přidat / Upravit plán */}
      <ServiceScheduleModal
        isOpen={isPlanModalOpen}
        onClose={() => {
          setIsPlanModalOpen(false);
          setEditingSchedule(null);
        }}
        scheduleToEdit={editingSchedule}
        bikes={bikes}
        components={components}
      />

      {/* MODAL: Zapsat servis */}
      <RecordServiceEventModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        initialSchedule={selectedScheduleForRecord}
        bikes={bikes}
        components={components}
      />
    </div>
  );
}
