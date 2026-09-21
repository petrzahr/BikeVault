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
  Sliders
} from "lucide-react";
import { t, formatDateCs, formatCzk, formatKm, formatMinutes } from "@/lib/i18n";
import { ServiceScheduleModal } from "@/components/maintenance/ServiceScheduleModal";
import { Modal } from "@/components/common/Modal";
import { useVault } from "@/context/VaultContext";
import { useFeedback } from "@/components/common/Feedback";
import { buttonClass, inputClass, labelClass, cn } from "@/lib/ui";

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
    createServiceEvent, 
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
  const [serviceName, setServiceName] = useState("");
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedBikeId, setSelectedBikeId] = useState("");
  const [selectedCompId, setSelectedCompId] = useState("");
  const [executionType, setExecutionType] = useState<"DIY" | "WORKSHOP">("DIY");
  const [serviceProvider, setServiceProvider] = useState("Svépomocí");
  const [partsCost, setPartsCost] = useState("");
  const [laborCost, setLaborCost] = useState("");
  const [notes, setNotes] = useState("");
  const [recordLoading, setRecordLoading] = useState(false);

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
    if (item) {
      const sched = item.schedule;
      setSelectedScheduleForRecord(sched);
      setServiceName(sched.name);
      setSelectedBikeId(item.bike?.id || (bikes[0]?.id || ""));
      setSelectedCompId(item.component?.id || "");
    } else {
      setSelectedScheduleForRecord(null);
      setServiceName("");
      setSelectedBikeId(bikes[0]?.id || "");
      setSelectedCompId("");
    }
    setServiceDate(new Date().toISOString().split("T")[0]);
    setPartsCost("");
    setLaborCost("");
    setNotes("");
    setIsRecordModalOpen(true);
  };

  const handleSaveServiceEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim() || !selectedBikeId) return;

    setRecordLoading(true);
    const partsPrice = parseFloat(partsCost || "0");
    const laborPrice = parseFloat(laborCost || "0");
    try {
      const bike = data.bikes.find((b) => b.id === selectedBikeId);
      createServiceEvent({
        bikeId: selectedBikeId,
        componentId: selectedCompId || null,
        serviceScheduleId: selectedScheduleForRecord?.id || null,
        eventType: "MAINTENANCE",
        serviceDate,
        bikeKm: bike ? Number(bike.currentKm) : 0,
        bikeMinutes: bike ? bike.currentMinutes : 0,
        performedBy: executionType === "DIY" ? "SELF" : "SHOP",
        shopName: executionType === "WORKSHOP" ? serviceProvider.trim() : null,
        description: serviceName.trim(),
        partsPrice,
        laborPrice,
        totalPrice: partsPrice + laborPrice,
        currency: "CZK",
        notes: notes.trim() || null,
      });

      setIsRecordModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Chyba při zápisu servisu.";
      toast(msg, "error");
    } finally {
      setRecordLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Action Bar Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {t("maintenance.dashboard")}
            </h1>
            {overdue.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold">
                {overdue.length} po termínu
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => handleOpenRecordModal()}
            className={buttonClass("secondary", "md")}
          >
            <Wrench className="w-4 h-4 text-navy-600" />
            <span>Zapsat servis bez plánu</span>
          </button>

          <button
            onClick={handleOpenCreatePlan}
            className={buttonClass("primary", "md")}
          >
            <Plus className="w-4 h-4" />
            <span>Přidat servisní plán</span>
          </button>
        </div>
      </div>

      {/* 1. PO TERMÍNU */}
      {overdue.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <h2 className="text-xs font-bold text-rose-600 uppercase tracking-wider">
              {t("maintenance.groups.overdue")} ({overdue.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {overdue.map((item) => (
              <div
                key={item.schedule.id}
                className="bg-rose-50/50 border border-rose-200/80 p-5 rounded-2xl flex flex-col justify-between space-y-4 shadow-sm hover:border-rose-300 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 text-[11px] font-bold tracking-wide">
                      {item.status.summaryTextCs}
                    </span>
                    <span className="text-xs text-slate-600 font-medium">
                      {item.bike?.name}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    {item.schedule.name}
                  </h3>
                  {item.component && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {item.component.manufacturer} {item.component.model}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-rose-200/60 flex items-center justify-between">
                  <span className="text-xs text-slate-500 tabular-nums">
                    Interval: {item.schedule.intervalKm ? `${item.schedule.intervalKm} km` : `${item.schedule.intervalHours} h`}
                  </span>
                  <button
                    onClick={() => handleOpenRecordModal(item)}
                    className={buttonClass("danger", "sm")}
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
            <h2 className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              {t("maintenance.groups.dueSoon")} ({dueSoon.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dueSoon.map((item) => (
              <div
                key={item.schedule.id}
                className="bg-amber-50/50 border border-amber-200/80 p-5 rounded-2xl flex flex-col justify-between space-y-4 shadow-sm hover:border-amber-300 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-bold tracking-wide">
                      Zbývá {item.status.summaryTextCs}
                    </span>
                    <span className="text-xs text-slate-600 font-medium">
                      {item.bike?.name}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    {item.schedule.name}
                  </h3>
                  {item.component && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {item.component.manufacturer} {item.component.model}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-amber-200/60 flex items-center justify-between">
                  <span className="text-xs text-slate-500 tabular-nums">
                    Interval: {item.schedule.intervalKm ? `${item.schedule.intervalKm} km` : `${item.schedule.intervalHours} h`}
                  </span>
                  <button
                    onClick={() => handleOpenRecordModal(item)}
                    className={buttonClass("warning", "md")}
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
          <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            {t("maintenance.groups.upcoming")} ({upcoming.length})
          </h2>
        </div>

        {upcoming.length === 0 ? (
          <div className="p-6 bg-white border border-slate-200/80 rounded-2xl text-center text-xs text-slate-500 shadow-sm">
            Žádné další plány v této sekci.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming.map((item) => (
              <div
                key={item.schedule.id}
                className="bg-white border border-slate-200/80 hover:border-slate-300 p-4 rounded-2xl flex flex-col justify-between space-y-2 shadow-sm transition-all"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-700 font-semibold">{item.status.summaryTextCs}</span>
                  <span className="text-slate-500 font-medium">{item.bike?.name}</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">
                  {item.schedule.name}
                </h4>
                {item.component && (
                  <p className="text-[11px] text-slate-500">{item.component.manufacturer} {item.component.model}</p>
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
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Sliders className="w-4 h-4 text-navy-600" />
              <span>Správa servisních plánů ({allSchedules.length})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Uživatelsky definované intervaly údržby s možností úprav, deaktivace a bezpečného mazání
            </p>
          </div>

          <button
            onClick={handleOpenCreatePlan}
            className={buttonClass("primary", "md", "self-start sm:self-auto")}
          >
            <Plus className="w-4 h-4" />
            <span>Přidat plán</span>
          </button>
        </div>

        {/* Filters and search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="inline-flex p-1 bg-slate-200/60 rounded-xl">
            {[
              { id: "ALL", label: `Všechny (${allSchedules.length})` },
              { id: "ACTIVE", label: `Aktivní (${activeSchedules.length})` },
              { id: "INACTIVE", label: `Deaktivované (${allSchedules.length - activeSchedules.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterActive(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterActive === tab.id
                    ? "bg-navy-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Hledat plán, kolo nebo díl..."
              className={cn(inputClass, "pl-9 pr-4")}
            />
          </div>
        </div>

        {/* Schedules Table / Cards */}
        {managedSchedules.length === 0 ? (
          <div className="p-8 bg-white border border-slate-200/80 rounded-2xl text-center text-xs text-slate-500 shadow-sm">
            Nebyly nalezeny žádné odpovídající servisní plány.
          </div>
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden divide-y divide-slate-100 shadow-sm">
            {managedSchedules.map((item) => {
              const sched = item.schedule;
              const status = item.status;
              const isOverdue = sched.isActive && status.urgency === "OVERDUE";
              const isDueSoon = sched.isActive && status.urgency === "DUE_SOON";

              return (
                <div key={sched.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs hover:bg-slate-50/50 transition-colors">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-semibold ${
                        !sched.isActive
                          ? "bg-slate-100 text-slate-500 border-slate-200"
                          : isOverdue
                          ? "bg-rose-100 text-rose-800 border-rose-200"
                          : isDueSoon
                          ? "bg-amber-100 text-amber-900 border-amber-200"
                          : "bg-emerald-100 text-emerald-800 border-emerald-200"
                      }`}>
                        {!sched.isActive ? "Deaktivováno" : status.summaryTextCs}
                      </span>

                      <span className="text-sm font-bold text-slate-900">
                        {sched.name}
                      </span>

                      {item.bike && (
                        <span className="text-xs text-navy-700 font-semibold flex items-center gap-1">
                          <BikeIcon className="w-3 h-3" />
                          <span>{item.bike.name}</span>
                        </span>
                      )}

                      {item.component && (
                        <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                          <Layers className="w-3 h-3" />
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
                        <span className="italic text-slate-400">"{sched.notes}"</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end md:self-auto">
                    <button
                      onClick={() => handleOpenRecordModal(item)}
                      className={buttonClass("primary", "md")}
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Zapsat servis</span>
                    </button>

                    <button
                      onClick={() => handleOpenEditPlan(sched)}
                      className={buttonClass("secondary", "sm")}
                      title="Upravit plán"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Upravit</span>
                    </button>

                    <button
                      onClick={() => handleToggleActive(sched.id, sched.isActive)}
                      className={`p-1.5 rounded-xl transition-colors ${
                        sched.isActive
                          ? "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                          : "text-emerald-600 hover:bg-emerald-50"
                      }`}
                      title={sched.isActive ? "Deaktivovat plán" : "Aktivovat plán"}
                    >
                      <Power className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeletePlan(sched.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      title="Smazat plán (pouze bez servisní historie)"
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
        <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
          {t("maintenance.groups.completed")} (Poslední úkony)
        </h2>

        {recentEvents.length === 0 ? (
          <div className="p-6 bg-white border border-slate-200/80 rounded-2xl text-center text-xs text-slate-500 shadow-sm">
            Zatím nebyly zapsány žádné servisní úkony.
          </div>
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden divide-y divide-slate-100 shadow-sm">
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
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title={selectedScheduleForRecord ? `Zapsat servis: ${selectedScheduleForRecord.name}` : "Zapsat servis (jednorázový)"}
        subtitle="Záznam o údržbě do digitální servisní knihy kola"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveServiceEvent} className="space-y-4">
          <div>
            <label className={labelClass}>
              Kolo *
            </label>
            <select
              required
              value={selectedBikeId}
              onChange={(e) => setSelectedBikeId(e.target.value)}
              className={inputClass}
            >
              <option value="">-- Vyberte kolo --</option>
              {bikes.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.category})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>
              Název servisního úkonu *
            </label>
            <input
              type="text"
              required
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="např. Výměna ložisek v náboji"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>
                Datum provedení
              </label>
              <input
                type="date"
                required
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Provedení
              </label>
              <select
                value={executionType}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setExecutionType(val);
                  if (val === "DIY") setServiceProvider("Svépomocí");
                  else setServiceProvider("");
                }}
                className={inputClass}
              >
                <option value="DIY">Svépomocí</option>
                <option value="WORKSHOP">Odborný servis / Dílna</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>
              Mechanik / Název servisu
            </label>
            <input
              type="text"
              value={serviceProvider}
              onChange={(e) => setServiceProvider(e.target.value)}
              placeholder="např. Svépomocí, Bikeclinic, Kolofix"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>
                Cena dílů (Kč)
              </label>
              <input
                type="number"
                min="0"
                value={partsCost}
                onChange={(e) => setPartsCost(e.target.value)}
                placeholder="0"
                className={cn(inputClass, "tabular-nums")}
              />
            </div>

            <div>
              <label className={labelClass}>
                Cena práce (Kč)
              </label>
              <input
                type="number"
                min="0"
                value={laborCost}
                onChange={(e) => setLaborCost(e.target.value)}
                placeholder="0"
                className={cn(inputClass, "tabular-nums")}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>
              Poznámka k servisu
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Popis provedených prací, použitých těsnění a olejů..."
              className={inputClass}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRecordModalOpen(false)}
              className={buttonClass("secondary", "md")}
            >
              Zrušit
            </button>
            <button
              type="submit"
              disabled={recordLoading}
              className={buttonClass("primary", "md")}
            >
              {recordLoading ? "Ukládám..." : "Zapsat servis"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
