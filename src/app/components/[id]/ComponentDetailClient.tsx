"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Layers, 
  ArrowLeft, 
  Wrench, 
  Plus, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  Bike as BikeIcon, 
  Coins, 
  Edit3, 
  Power, 
  Trash2, 
  ExternalLink,
  ShieldAlert
} from "lucide-react";
import { formatKm, formatMinutes, formatCzk, formatDateCs } from "@/lib/i18n";
import { ServiceScheduleModal } from "@/components/maintenance/ServiceScheduleModal";
import { 
  toggleServiceScheduleActiveAction, 
  deleteServiceScheduleAction, 
  createServiceEventAction 
} from "@/app/actions/maintenance";

interface ComponentDetailClientProps {
  componentData: {
    component: any;
    category: any;
    activeInstallation: any | null;
    installationHistory: any[];
  };
  schedulesWithStatus: any[];
  serviceEvents: any[];
  allBikes: any[];
}

export function ComponentDetailClient({
  componentData,
  schedulesWithStatus,
  serviceEvents,
  allBikes,
}: ComponentDetailClientProps) {
  const router = useRouter();
  const { component, category, activeInstallation, installationHistory } = componentData;

  // Modals state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any | null>(null);

  // Record service modal state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedScheduleForRecord, setSelectedScheduleForRecord] = useState<any | null>(null);
  const [serviceName, setServiceName] = useState("");
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [executionType, setExecutionType] = useState<"DIY" | "WORKSHOP">("DIY");
  const [serviceProvider, setServiceProvider] = useState("Svépomocí");
  const [partsCost, setPartsCost] = useState("");
  const [laborCost, setLaborCost] = useState("");
  const [notes, setNotes] = useState("");
  const [recordLoading, setRecordLoading] = useState(false);

  const activeBike = activeInstallation?.bike || null;

  const handleOpenCreateSchedule = () => {
    setEditingSchedule(null);
    setIsScheduleModalOpen(true);
  };

  const handleOpenEditSchedule = (sched: any) => {
    setEditingSchedule(sched);
    setIsScheduleModalOpen(true);
  };

  const handleToggleActive = async (scheduleId: string, currentActive: boolean) => {
    try {
      await toggleServiceScheduleActiveAction(scheduleId, !currentActive);
      router.refresh();
    } catch (err: any) {
      alert(err?.message || "Chyba při změně stavu plánu.");
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm("Opravdu chcete tento servisní plán smazat?")) return;
    try {
      await deleteServiceScheduleAction(scheduleId);
      router.refresh();
    } catch (err: any) {
      alert(err?.message || "Plán nelze smazat.");
    }
  };

  const handleOpenRecordModal = (sched?: any) => {
    if (sched) {
      setSelectedScheduleForRecord(sched);
      setServiceName(sched.name);
    } else {
      setSelectedScheduleForRecord(null);
      setServiceName("");
    }
    setServiceDate(new Date().toISOString().split("T")[0]);
    setPartsCost("");
    setLaborCost("");
    setNotes("");
    setIsRecordModalOpen(true);
  };

  const handleSaveServiceEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim()) return;
    if (!activeBike && allBikes.length === 0) {
      alert("Pro zápis servisu je vyžadováno alespoň jedno aktivní kolo v garáži.");
      return;
    }

    setRecordLoading(true);
    try {
      const bikeIdToUse = activeBike?.id || allBikes[0]?.id;
      await createServiceEventAction({
        bikeId: bikeIdToUse,
        componentId: component.id,
        serviceScheduleId: selectedScheduleForRecord?.id || undefined,
        name: serviceName.trim(),
        serviceDate,
        executionType,
        serviceProvider: serviceProvider.trim() || undefined,
        partsCost: parseFloat(partsCost || "0"),
        laborCost: parseFloat(laborCost || "0"),
        notes: notes.trim() || undefined,
      });

      setIsRecordModalOpen(false);
      router.refresh();
    } catch (err: any) {
      alert(err?.message || "Chyba při zápisu servisu.");
    } finally {
      setRecordLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Back link */}
      <div>
        <Link
          href="/components"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Zpět do Centrálního skladu</span>
        </Link>
      </div>

      {/* Component Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                {category?.nameCs || "Komponent"}
              </span>
              {component.status === "INSTALLED" && activeBike ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1">
                  <BikeIcon className="w-3 h-3" />
                  <span>Osazeno na: {activeBike.name}</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                  Skladem
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {component.manufacturer} {component.model}
            </h1>
            {component.variant && (
              <p className="text-sm text-slate-500">{component.variant}</p>
            )}
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => handleOpenRecordModal()}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <Wrench className="w-3.5 h-3.5 text-blue-600" />
              <span>Zapsat servis</span>
            </button>
            <button
              onClick={handleOpenCreateSchedule}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Přidat servisní plán</span>
            </button>
          </div>
        </div>

        {/* Specs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold block">Nákupní cena</span>
            <span className="text-base font-bold text-slate-900 font-mono">{formatCzk(component.purchasePrice)}</span>
          </div>
          <div>
            <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold block">Datum nákupu</span>
            <span className="text-sm font-semibold text-slate-900">{component.purchaseDate ? formatDateCs(component.purchaseDate) : "-"}</span>
          </div>
          <div>
            <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold block">Sériové číslo</span>
            <span className="text-sm font-mono text-slate-700">{component.serialNumber || "Neuvedeno"}</span>
          </div>
          <div>
            <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold block">Specifikace pláště / kola</span>
            <span className="text-sm font-medium text-slate-700">
              {component.tireCasing ? `${component.tireCasing} • ${component.tireCompound || ""}` : (component.wheelDiameter || "-")}
            </span>
          </div>
        </div>
      </div>

      {/* SERVISNÍ PLÁNY SEKCE */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span>Servisní plány komponenty ({schedulesWithStatus.length})</span>
            </h2>
            <p className="text-xs text-slate-500">
              Nakonfigurované pravidelné intervaly údržby pro {component.manufacturer} {component.model}
            </p>
          </div>

          <button
            onClick={handleOpenCreateSchedule}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Přidat servisní plán</span>
          </button>
        </div>

        {schedulesWithStatus.length === 0 ? (
          <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-3 shadow-sm">
            <p className="text-xs text-slate-500">
              Pro tuto komponentu zatím není nastaven žádný servisní plán.
            </p>
            <button
              onClick={handleOpenCreateSchedule}
              className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-xs font-semibold rounded-xl transition-all inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Vytvořit první servisní plán</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {schedulesWithStatus.map((item) => {
              const sched = item.schedule;
              const status = item.status;
              const isOverdue = sched.isActive && status.urgency === "OVERDUE";
              const isDueSoon = sched.isActive && status.urgency === "DUE_SOON";

              return (
                <div
                  key={sched.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 shadow-sm ${
                    !sched.isActive
                      ? "bg-slate-50/70 border-slate-200 opacity-80"
                      : isOverdue
                      ? "bg-rose-50/40 border-rose-200"
                      : isDueSoon
                      ? "bg-amber-50/40 border-amber-200"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold flex items-center gap-1.5 ${
                          !sched.isActive
                            ? "bg-slate-100 text-slate-500 border-slate-200"
                            : isOverdue
                            ? "bg-rose-100 text-rose-800 border-rose-200"
                            : isDueSoon
                            ? "bg-amber-100 text-amber-900 border-amber-200"
                            : "bg-emerald-100 text-emerald-800 border-emerald-200"
                        }`}
                      >
                        {!sched.isActive ? (
                          <span>Deaktivováno</span>
                        ) : isOverdue ? (
                          <>
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            <span>{status.summaryTextCs}</span>
                          </>
                        ) : isDueSoon ? (
                          <>
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>{status.summaryTextCs}</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>{status.summaryTextCs}</span>
                          </>
                        )}
                      </span>

                      <span className="text-[11px] font-mono text-slate-500 font-semibold">
                        {sched.intervalHours ? `každých ${sched.intervalHours} h` : ""}
                        {sched.intervalKm ? `každých ${sched.intervalKm} km` : ""}
                        {sched.intervalMonths ? `každých ${sched.intervalMonths} měsíců` : ""}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      {sched.name}
                    </h3>

                    {sched.notes && (
                      <p className="text-xs text-slate-500 italic">{sched.notes}</p>
                    )}

                    {/* Metric comparison box */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Poslední servis</span>
                        <span className="font-mono text-slate-700">
                          {sched.lastServiceBikeHours ? `${sched.lastServiceBikeHours} h` : (sched.lastServiceBikeKm ? `${sched.lastServiceBikeKm} km` : "-")}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Aktuálně</span>
                        <span className="font-mono text-slate-800 font-bold">
                          {sched.intervalHours ? `${Math.round((activeBike ? activeBike.currentMinutes / 60 : 0) * 10) / 10} h` : `${formatKm(activeBike ? activeBike.currentKm : 0)}`}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Zbývá</span>
                        <span className={`font-mono font-bold ${
                          (status.remainingHours !== null && status.remainingHours <= 0) || (status.remainingKm !== null && status.remainingKm <= 0)
                            ? "text-rose-600"
                            : "text-emerald-700"
                        }`}>
                          {status.remainingHours !== null ? `${status.remainingHours} h` : (status.remainingKm !== null ? `${status.remainingKm} km` : `${status.remainingDays} dní`)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions bar */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenRecordModal(sched)}
                        className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-1 transition-colors shadow-sm"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Zapsat servis</span>
                      </button>

                      <button
                        onClick={() => handleOpenEditSchedule(sched)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium flex items-center gap-1 transition-colors"
                        title="Upravit plán"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Upravit</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleActive(sched.id, sched.isActive)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          sched.isActive
                            ? "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            : "text-emerald-600 hover:bg-emerald-50"
                        }`}
                        title={sched.isActive ? "Deaktivovat plán" : "Aktivovat plán"}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteSchedule(sched.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Smazat plán"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SERVISNÍ HISTORIE KOMPONENTY */}
      <div className="space-y-3 pt-4 border-t border-slate-200">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          Servisní historie komponenty ({serviceEvents.length})
        </h2>

        {serviceEvents.length === 0 ? (
          <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center text-xs text-slate-500 shadow-sm">
            Zatím nebyl pro tuto komponentu zaznamenán žádný servisní úkon.
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 shadow-sm">
            {serviceEvents.map((item) => {
              const ev = item.event;
              const totalCost = Number(ev.partsCost || 0) + Number(ev.laborCost || 0);

              return (
                <div key={ev.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{ev.name}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase border ${
                        ev.executionType === "DIY" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-purple-50 text-purple-700 border-purple-200"
                      }`}>
                        {ev.executionType === "DIY" ? "Svépomocí" : "Dílna"}
                      </span>
                      {item.bike && (
                        <span className="text-xs text-slate-500 font-medium">
                          na kole {item.bike.name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-slate-400 font-mono">
                      <span>{formatDateCs(ev.serviceDate)}</span>
                      <span>při {formatKm(ev.bikeKm)}</span>
                      {ev.serviceProvider && <span>({ev.serviceProvider})</span>}
                    </div>

                    {ev.notes && <p className="text-slate-600 italic">"{ev.notes}"</p>}
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-base font-bold text-slate-900 font-mono block">
                      {formatCzk(totalCost)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      díly: {formatCzk(ev.partsCost)} • práce: {formatCzk(ev.laborCost)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: Přidat / Upravit plán */}
      <ServiceScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setEditingSchedule(null);
        }}
        scheduleToEdit={editingSchedule}
        bikes={allBikes}
        components={[component]}
        preselectedBikeId={activeBike?.id}
        preselectedComponentId={component.id}
      />

      {/* MODAL: Zapsat servis */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {selectedScheduleForRecord ? `Zapsat servis: ${selectedScheduleForRecord.name}` : "Zapsat provedení servisu"}
                </h3>
              </div>
              <button onClick={() => setIsRecordModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveServiceEvent} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Název servisního úkonu *
                </label>
                <input
                  type="text"
                  required
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="např. Výměna těsnění a oleje"
                  className="w-full bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-4 py-2 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Datum provedení
                  </label>
                  <input
                    type="date"
                    required
                    value={serviceDate}
                    onChange={(e) => setServiceDate(e.target.value)}
                    className="w-full bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-4 py-2 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
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
                    className="w-full bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-3 py-2 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  >
                    <option value="DIY">Svépomocí</option>
                    <option value="WORKSHOP">Odborný servis / Dílna</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Mechanik / Název servisu
                </label>
                <input
                  type="text"
                  value={serviceProvider}
                  onChange={(e) => setServiceProvider(e.target.value)}
                  placeholder="např. Svépomocí, Bikeclinic, Kolofix"
                  className="w-full bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-4 py-2 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Cena dílů (Kč)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={partsCost}
                    onChange={(e) => setPartsCost(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-4 py-2 text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Cena práce (Kč)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={laborCost}
                    onChange={(e) => setLaborCost(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-4 py-2 text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Poznámka k servisu
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Popis provedených prací, použitých těsnění a olejů..."
                  className="w-full bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 rounded-xl p-3 text-slate-900 text-xs focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={recordLoading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
                >
                  {recordLoading ? "Ukládám..." : "Zapsat servis"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
