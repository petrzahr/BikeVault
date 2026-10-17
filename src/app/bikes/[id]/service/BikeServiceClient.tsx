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
import { toServiceHistoryRows } from "@/lib/domain/serviceHistory";


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
  const serviceHistoryRows = toServiceHistoryRows(serviceEvents, data.components);

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
      <div className="card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Servisní plány a servisní kniha
          </h2>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            onClick={handleOpenRecordWithoutPlan}
            className="btn-secondary"
            title="Jednorázový servis mimo pravidelný plán"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Zapsat servis bez plánu</span>
          </button>

          <button
            onClick={handleOpenCreatePlan}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            <span>Přidat servisní plán</span>
          </button>
        </div>
      </div>

      {/* SERVICE SCHEDULES (INTERVALY) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            Servisní plány ({schedulesWithStatus.length})
          </h3>
          <button
            onClick={handleOpenCreatePlan}
            className="btn-text"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Přidat plán</span>
          </button>
        </div>

        {schedulesWithStatus.length === 0 ? (
          <div className="card empty-state space-y-3">
            <p>
              K tomuto kolu ani jeho komponentům zatím nejsou definovány žádné servisní plány.
            </p>
            <button
              onClick={handleOpenCreatePlan}
              className="btn-secondary"
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
                  className={`card p-4 sm:p-5 flex flex-col justify-between space-y-4 ${
                    !sched.isActive ? "bg-slate-50" : ""
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`chip ${
                          !sched.isActive
                            ? "chip-neutral"
                            : isOverdue
                            ? "chip-rose"
                            : isDueSoon
                            ? "chip-steel"
                            : "chip-emerald"
                        }`}
                      >
                        {!sched.isActive ? (
                          <span>Deaktivováno</span>
                        ) : isOverdue ? (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>{status.summaryTextCs}</span>
                          </>
                        ) : isDueSoon ? (
                          <>
                            <Clock className="w-3.5 h-3.5" />
                            <span>{status.summaryTextCs}</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{status.summaryTextCs}</span>
                          </>
                        )}
                      </span>

                      <span className="text-xs tabular-nums text-slate-500 font-semibold">
                        {sched.intervalHours ? `každých ${sched.intervalHours} h` : ""}
                        {sched.intervalKm ? `každých ${sched.intervalKm} km` : ""}
                        {sched.intervalMonths ? `každých ${sched.intervalMonths} měsíců` : ""}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">
                      {sched.name}
                    </h4>

                    {comp ? (
                      <p className="text-xs text-slate-600 font-medium flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5" />
                        <span>Komponent: {comp.manufacturer} {comp.model}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <BikeIcon className="w-3.5 h-3.5" />
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
                      <div>Zbývá: <strong className={isOverdue ? "text-rose-700" : "text-slate-900"}>{status.summaryTextCs}</strong></div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenModalWithSchedule(sched)}
                      className="btn-primary btn-sm"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Zapsat servis</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditPlan(sched)}
                        className="btn-icon"
                        title="Upravit plán"
                        aria-label={`Upravit plán ${sched.name}`}
                      >
                        <Edit3 className="w-4 h-4" />
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
                        title="Smazat plán"
                        aria-label={`Smazat plán ${sched.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
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
      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-900">
          Historie servisu — Servisní kniha ({serviceEvents.length})
        </h3>

        {serviceEvents.length === 0 ? (
          <div className="card empty-state">
            Zatím nebyl zapsán žádný servisní zásah.
          </div>
        ) : (
          <div className="card overflow-hidden divide-y divide-slate-100">
            {serviceHistoryRows.map((item) => {
              const ev: any = item.event;

              return (
                <div key={ev.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-bold text-slate-900">
                        {ev.name || ev.description}
                      </span>
                      <span className={`chip ${
                        ev.executionType === "DIY" || ev.performedBy === "SELF" ? "chip-neutral" : "chip-signal"
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
                      {formatCzk(item.totalPrice)}
                    </span>
                    <span className="text-xs text-slate-500 tabular-nums">
                      díly: {formatCzk(item.partsPrice)} • práce: {formatCzk(item.laborPrice)}
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
