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
  HelpCircle,
  Loader2,
  Check
} from "lucide-react";
import { t, formatDateCs, formatKm, formatMinutes, formatCzk } from "@/lib/i18n";
import { useVault } from "@/context/VaultContext";
import { useFeedback } from "@/components/common/Feedback";
import { ServiceScheduleModal } from "@/components/maintenance/ServiceScheduleModal";
import { RecordServiceEventModal } from "@/components/maintenance/RecordServiceEventModal";
import { buttonClass, inputClass, labelClass, cn } from "@/lib/ui";

interface BikeServiceClientProps {
  bike: any;
  schedulesWithStatus?: any[];
  serviceEvents?: any[];
  installedComponents?: any[];
}

export function BikeServiceClient({
  bike,
  schedulesWithStatus: propSchedulesWithStatus,
  serviceEvents: propServiceEvents,
  installedComponents: propInstalledComponents,
}: BikeServiceClientProps) {
  const { 
    data,
    toggleServiceScheduleActive, 
    deleteServiceSchedule, 
    getBikeServiceSchedulesWithStatus, 
    getBikeServiceEvents, 
    getBikeInstalledComponents 
  } = useVault();
  const { toast, confirm } = useFeedback();

  const schedulesWithStatus = propSchedulesWithStatus ?? getBikeServiceSchedulesWithStatus(bike.id);
  const serviceEvents = propServiceEvents ?? getBikeServiceEvents(bike.id);
  const installedComponents = propInstalledComponents ?? getBikeInstalledComponents(bike.id);

  // Plan modal state (Create / Edit)
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any | null>(null);

  // Record service modal state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedScheduleForRecord, setSelectedScheduleForRecord] = useState<any | null>(null);

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

  const handleOpenModalWithSchedule = (sched: any) => {
    setSelectedScheduleForRecord(sched);
    setIsRecordModalOpen(true);
  };

  const handleOpenRecordWithoutPlan = () => {
    setSelectedScheduleForRecord(null);
    setIsRecordModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <BikeHeader bike={bike} />

      {/* Header Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Servisní plány a servisní kniha
          </h2>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            onClick={handleOpenRecordWithoutPlan}
            className={buttonClass("secondary", "md")}
            title="Jednorázový servis mimo pravidelný plán"
          >
            <Wrench className="w-3.5 h-3.5 text-navy-600" />
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

      {/* SERVICE SCHEDULES (INTERVALY) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Servisní plány ({schedulesWithStatus.length})
          </h3>
          <button
            onClick={handleOpenCreatePlan}
            className="text-xs font-semibold text-navy-600 hover:text-navy-700 inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Přidat plán</span>
          </button>
        </div>

        {schedulesWithStatus.length === 0 ? (
          <div className="p-8 bg-white border border-slate-200/80 rounded-2xl text-center space-y-3 shadow-sm">
            <p className="text-xs text-slate-500">
              K tomuto kolu ani jeho komponentům zatím nejsou definovány žádné servisní plány.
            </p>
            <button
              onClick={handleOpenCreatePlan}
              className={buttonClass("soft", "md")}
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
                      ? "bg-slate-50/70 border-slate-200/80 opacity-80"
                      : isOverdue
                      ? "border-rose-200/80 bg-rose-50/50"
                      : isDueSoon
                      ? "border-amber-200/80 bg-amber-50/50"
                      : "border-slate-200/80 bg-white hover:border-slate-300"
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

                      <span className="text-[11px] tabular-nums text-slate-500 font-semibold">
                        {sched.intervalHours ? `každých ${sched.intervalHours} h` : ""}
                        {sched.intervalKm ? `každých ${sched.intervalKm} km` : ""}
                        {sched.intervalMonths ? `každých ${sched.intervalMonths} měsíců` : ""}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-slate-900 tracking-tight">
                      {sched.name}
                    </h4>

                    {comp ? (
                      <p className="text-xs text-navy-700 font-medium flex items-center gap-1">
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
                    <div className="pt-1 text-xs text-slate-500 space-y-0.5 tabular-nums">
                      {sched.lastServiceDate && (
                        <div>Naposledy: {formatDateCs(sched.lastServiceDate)} ({sched.lastServiceBikeHours ? `${sched.lastServiceBikeHours} h` : (sched.lastServiceBikeKm ? `${sched.lastServiceBikeKm} km` : "")})</div>
                      )}
                      <div>Zbývá: <strong className={isOverdue ? "text-rose-600 tabular-nums" : "text-slate-900 tabular-nums"}>{status.summaryTextCs}</strong></div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenModalWithSchedule(sched)}
                      className={buttonClass("primary", "md")}
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Zapsat servis</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditPlan(sched)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                        title="Upravit plán"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleToggleActive(sched.id, sched.isActive)}
                        className={`p-1.5 rounded-xl transition-colors ${
                          sched.isActive
                            ? "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                            : "text-emerald-600 hover:bg-emerald-50"
                        }`}
                        title={sched.isActive ? "Deaktivovat plán" : "Aktivovat plán"}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeletePlan(sched.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
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
        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
          Historie servisu — Servisní kniha ({serviceEvents.length})
        </h3>

        {serviceEvents.length === 0 ? (
          <div className="p-8 bg-white border border-slate-200/80 rounded-2xl text-center text-xs text-slate-500 shadow-sm">
            Zatím nebyl zapsán žádný servisní zásah.
          </div>
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden divide-y divide-slate-100 shadow-sm">
            {serviceEvents.map((item) => {
              const ev = item.event;
              const totalCost = Number(ev.partsCost || 0) + Number(ev.laborCost || 0) + Number(ev.otherCost || 0);

              return (
                <div key={ev.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-bold text-slate-900">
                        {ev.name || ev.description}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                        ev.executionType === "DIY" || ev.performedBy === "SELF" ? "bg-navy-50 text-navy-700 border-navy-200/80" : "bg-purple-50 text-purple-700 border-purple-200/80"
                      }`}>
                        {ev.executionType === "DIY" || ev.performedBy === "SELF" ? "Svépomocí" : "Dílna"}
                      </span>
                      {item.component && (
                        <span className="text-xs text-slate-500 font-medium">
                          ({item.component.manufacturer} {item.component.model})
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 tabular-nums">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{formatDateCs(ev.serviceDate)}</span>
                      </span>
                      <span>
                        při {formatKm(ev.bikeKm)} ({formatMinutes(ev.bikeMinutes)})
                      </span>
                      {(ev.shopName || ev.serviceProvider) && (
                        <span>Mechanik: {ev.shopName || ev.serviceProvider}</span>
                      )}
                    </div>

                    {ev.notes && (
                      <p className="text-xs text-slate-600 italic pt-1">
                        "{ev.notes}"
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-slate-900 tabular-nums block">
                      {formatCzk(totalCost)}
                    </span>
                    <span className="text-[11px] text-slate-500 tabular-nums">
                      díly: {formatCzk(ev.partsCost || 0)} • práce: {formatCzk(ev.laborCost || 0)}
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
      <RecordServiceEventModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        fixedBikeId={bike.id}
        initialSchedule={selectedScheduleForRecord}
        bikes={[bike]}
        components={componentsList}
      />
    </div>
  );
}
