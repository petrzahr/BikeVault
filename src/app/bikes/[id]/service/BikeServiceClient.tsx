"use client";

import React, { useState } from "react";
import { BikeHeader } from "@/components/bike/BikeHeader";
import { 
  Wrench, 
  Plus, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  UserCheck, 
  Store,
  Coins,
  Edit3,
  Power,
  Trash2,
  Layers,
  Bike as BikeIcon,
  HelpCircle
} from "lucide-react";
import { t, formatDateCs, formatKm, formatMinutes, formatCzk } from "@/lib/i18n";
import { 
  createServiceEventAction, 
  toggleServiceScheduleActiveAction, 
  deleteServiceScheduleAction 
} from "@/app/actions/maintenance";
import { ServiceScheduleModal } from "@/components/maintenance/ServiceScheduleModal";
import { useRouter } from "next/navigation";

interface BikeServiceClientProps {
  bike: any;
  schedulesWithStatus: any[];
  serviceEvents: any[];
  installedComponents: any[];
}

export function BikeServiceClient({
  bike,
  schedulesWithStatus,
  serviceEvents,
  installedComponents,
}: BikeServiceClientProps) {
  const router = useRouter();

  // Plan modal state (Create / Edit)
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any | null>(null);

  // Record service modal state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState("");
  const [selectedComponentId, setSelectedComponentId] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [executionType, setExecutionType] = useState<"DIY" | "WORKSHOP">("DIY");
  const [serviceProvider, setServiceProvider] = useState("Svépomocí");
  const [partsCost, setPartsCost] = useState("");
  const [laborCost, setLaborCost] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Available components for modal
  const componentsList = installedComponents.map((item) => item.component);

  const handleOpenCreatePlan = () => {
    setEditingSchedule(null);
    setIsPlanModalOpen(true);
  };

  const handleOpenEditPlan = (sched: any) => {
    setEditingSchedule(sched);
    setIsPlanModalOpen(true);
  };

  const handleToggleActive = async (scheduleId: string, currentActive: boolean) => {
    try {
      await toggleServiceScheduleActiveAction(scheduleId, !currentActive);
      router.refresh();
    } catch (err: any) {
      alert(err?.message || "Chyba při změně stavu plánu.");
    }
  };

  const handleDeletePlan = async (scheduleId: string) => {
    if (!confirm("Opravdu chcete tento servisní plán smazat?")) return;
    try {
      await deleteServiceScheduleAction(scheduleId);
      router.refresh();
    } catch (err: any) {
      alert(err?.message || "Plán nelze smazat.");
    }
  };

  const handleOpenModalWithSchedule = (sched: any) => {
    setSelectedScheduleId(sched.id);
    setServiceName(sched.name);
    if (sched.componentId) {
      setSelectedComponentId(sched.componentId);
    } else {
      setSelectedComponentId("");
    }
    setServiceDate(new Date().toISOString().split("T")[0]);
    setPartsCost("");
    setLaborCost("");
    setNotes("");
    setIsRecordModalOpen(true);
  };

  const handleOpenRecordWithoutPlan = () => {
    setSelectedScheduleId("");
    setSelectedComponentId("");
    setServiceName("");
    setServiceDate(new Date().toISOString().split("T")[0]);
    setPartsCost("");
    setLaborCost("");
    setNotes("");
    setIsRecordModalOpen(true);
  };

  const handleRecordService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim()) return;

    setLoading(true);
    try {
      await createServiceEventAction({
        bikeId: bike.id,
        serviceScheduleId: selectedScheduleId || undefined,
        componentId: selectedComponentId || undefined,
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
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <BikeHeader bike={bike} />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Servisní plány a servisní kniha
          </h2>
          <p className="text-xs text-slate-500">
            Pravidelné intervaly údržby kola i osazených komponent a kompletní servisní historie
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={handleOpenRecordWithoutPlan}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            title="Jednorázový servis mimo pravidelný plán"
          >
            <Wrench className="w-3.5 h-3.5 text-blue-600" />
            <span>Zapsat servis bez plánu</span>
          </button>

          <button
            onClick={handleOpenCreatePlan}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Přidat servisní plán</span>
          </button>
        </div>
      </div>

      {/* SERVICE SCHEDULES (INTERVALY) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">
            Servisní plány ({schedulesWithStatus.length})
          </h3>
          <button
            onClick={handleOpenCreatePlan}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Přidat servisní plán</span>
          </button>
        </div>

        {schedulesWithStatus.length === 0 ? (
          <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-3 shadow-sm">
            <p className="text-xs text-slate-500">
              K tomuto kolu ani jeho komponentům zatím nejsou definovány žádné servisní plány.
            </p>
            <button
              onClick={handleOpenCreatePlan}
              className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-xs font-semibold rounded-xl transition-all inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Vytvořit první servisní plán</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schedulesWithStatus.map((item) => {
              const sched = item.schedule;
              const status = item.status;
              const comp = item.component;

              const isOverdue = sched.isActive && status.urgency === "OVERDUE";
              const isDueSoon = sched.isActive && status.urgency === "DUE_SOON";

              return (
                <div
                  key={sched.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 shadow-sm ${
                    !sched.isActive
                      ? "bg-slate-50/70 border-slate-200 opacity-80"
                      : isOverdue
                      ? "border-rose-200 bg-rose-50/50"
                      : isDueSoon
                      ? "border-amber-200 bg-amber-50/50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="space-y-2">
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

                    <h4 className="text-base font-bold text-slate-900 tracking-tight">
                      {sched.name}
                    </h4>

                    {comp ? (
                      <p className="text-xs text-blue-700 font-medium flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        <span>Komponent: {comp.manufacturer} {comp.model}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <BikeIcon className="w-3 h-3" />
                        <span>Celé kolo ({bike.name})</span>
                      </p>
                    )}

                    {sched.notes && (
                      <p className="text-xs text-slate-500 italic">{sched.notes}</p>
                    )}

                    {/* Progress / metric snapshot */}
                    <div className="pt-1 text-xs text-slate-500 space-y-0.5">
                      {sched.lastServiceDate && (
                        <div>Naposledy: {formatDateCs(sched.lastServiceDate)} ({sched.lastServiceBikeHours ? `${sched.lastServiceBikeHours} h` : (sched.lastServiceBikeKm ? `${sched.lastServiceBikeKm} km` : "")})</div>
                      )}
                      <div>Zbývá: <strong className={isOverdue ? "text-rose-600 font-mono" : "text-slate-900 font-mono"}>{status.summaryTextCs}</strong></div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenModalWithSchedule(sched)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Zapsat servis</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditPlan(sched)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Upravit plán"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

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
                        onClick={() => handleDeletePlan(sched.id)}
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

      {/* SERVICE HISTORY / SERVISNÍ KNIHA */}
      <div className="space-y-3 pt-4 border-t border-slate-200">
        <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">
          Historie servisu — Servisní kniha ({serviceEvents.length})
        </h3>

        {serviceEvents.length === 0 ? (
          <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center text-xs text-slate-500 shadow-sm">
            Zatím nebyl zapsán žádný servisní zásah.
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 shadow-sm">
            {serviceEvents.map((item) => {
              const ev = item.event;
              const totalCost = Number(ev.partsCost || 0) + Number(ev.laborCost || 0) + Number(ev.otherCost || 0);

              return (
                <div key={ev.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base font-bold text-slate-900">
                        {ev.name}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${
                        ev.executionType === "DIY" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-purple-50 text-purple-700 border-purple-200"
                      }`}>
                        {ev.executionType === "DIY" ? "Svépomocí" : "Dílna"}
                      </span>
                      {item.component && (
                        <span className="text-xs text-slate-500 font-medium">
                          ({item.component.manufacturer} {item.component.model})
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDateCs(ev.serviceDate)}</span>
                      </span>
                      <span className="font-mono">
                        při {formatKm(ev.bikeKm)} ({formatMinutes(ev.bikeMinutes)})
                      </span>
                      {ev.serviceProvider && (
                        <span>Mechanik: {ev.serviceProvider}</span>
                      )}
                    </div>

                    {ev.notes && (
                      <p className="text-xs text-slate-600 italic pt-1">
                        "{ev.notes}"
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-base font-bold text-slate-900 font-mono block">
                      {formatCzk(totalCost)}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      díly: {formatCzk(ev.partsCost)} • práce: {formatCzk(ev.laborCost)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: Přidat / Upravit servisní plán */}
      <ServiceScheduleModal
        isOpen={isPlanModalOpen}
        onClose={() => {
          setIsPlanModalOpen(false);
          setEditingSchedule(null);
        }}
        scheduleToEdit={editingSchedule}
        bikes={[bike]}
        components={componentsList}
        preselectedBikeId={bike.id}
      />

      {/* MODAL: Zapsat servis */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {selectedScheduleId ? "Zapsat provedení servisu podle plánu" : "Zapsat servis (jednorázový)"}
                </h3>
              </div>
              <button onClick={() => setIsRecordModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleRecordService} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Název servisního úkonu *
                </label>
                <input
                  type="text"
                  required
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="např. Servis spodních nohou vidlice"
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

              {/* Týká se komponenty */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Vztahuje se ke komponentě (volitelné)
                </label>
                <select
                  value={selectedComponentId}
                  onChange={(e) => setSelectedComponentId(e.target.value)}
                  className="w-full bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-4 py-2 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                >
                  <option value="">-- Pouze celé kolo --</option>
                  {installedComponents.map((item) => (
                    <option key={item.component.id} value={item.component.id}>
                      {item.category.nameCs}: {item.component.manufacturer} {item.component.model}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Propojený servisní plán (resetuje interval)
                </label>
                <select
                  value={selectedScheduleId}
                  onChange={(e) => setSelectedScheduleId(e.target.value)}
                  className="w-full bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-4 py-2 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                >
                  <option value="">-- Bez plánu (jednorázový servis) --</option>
                  {schedulesWithStatus.map((s) => (
                    <option key={s.schedule.id} value={s.schedule.id}>
                      {s.schedule.name}
                    </option>
                  ))}
                </select>
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
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
                >
                  {loading ? t("common.loading") : "Zapsat servis"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
