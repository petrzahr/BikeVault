"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Wrench,
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Bike as BikeIcon,
  Coins,
  Trash2,
  Check,
  Loader2,
  Pencil
} from "lucide-react";
import { formatKm, formatMinutes, formatCzk, formatDateCs } from "@/lib/i18n";
import { getCategorySpecFields, LEGACY_COMPONENT_SPEC_KEYS } from "@/lib/bikeLists";
import { ServiceScheduleModal } from "@/components/maintenance/ServiceScheduleModal";
import { AddComponentModal } from "@/components/garage/AddComponentModal";
import { useVault } from "@/context/VaultContext";
import { useFeedback } from "@/components/common/Feedback";
import { RecordServiceEventModal } from "@/components/maintenance/RecordServiceEventModal";
import { ConfirmationModal } from "@/components/common/ConfirmationModal";


interface ComponentDetailClientProps {
  componentData: {
    component: any;
    category: any;
    activeInstallation?: any | null;
    installationHistory: any[];
  };
  schedulesWithStatus?: any[];
  serviceEvents?: any[];
  allBikes?: any[];
}

export function ComponentDetailClient({
  componentData,
  schedulesWithStatus: propSchedulesWithStatus,
  serviceEvents: propServiceEvents,
  allBikes: propAllBikes,
}: ComponentDetailClientProps) {
  const { 
    toggleServiceScheduleActive, 
    deleteServiceSchedule, 
    getComponentServiceSchedules, 
    getComponentServiceEvents, 
    getGarageBikes,
    deleteComponent,
    deleteInstallation
  } = useVault();
  const { toast, confirm } = useFeedback();
  const router = useRouter();

  const { component, category, activeInstallation, installationHistory } = componentData;
  const schedulesWithStatus = propSchedulesWithStatus ?? getComponentServiceSchedules(component.id);
  const serviceEvents = propServiceEvents ?? getComponentServiceEvents(component.id);
  const allBikes = propAllBikes ?? getGarageBikes();

  // Modals state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any | null>(null);

  // Record service modal state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedScheduleForRecord, setSelectedScheduleForRecord] = useState<any | null>(null);

  const activeBike = activeInstallation?.bike;
  const specFields = getCategorySpecFields(category);
  const getSpecValue = (key: string): string | null => {
    const value = (LEGACY_COMPONENT_SPEC_KEYS as readonly string[]).includes(key)
      ? component[key]
      : component.customFields?.[key];
    return value || null;
  };

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleDeleteComponent = () => {
    deleteComponent(component.id);
    router.push("/components");
  };

  const handleDeleteInstallation = async (inst: any, bike: any) => {
    const message = inst.removedAt
      ? `Smazat záznam o montáži na kolo ${bike?.name || ""}? Použijte jen pro opravu chybně zadané montáže.`
      : `Smazat záznam o montáži na kolo ${bike?.name || ""}? Komponenta se vrátí do skladu. Použijte pouze pro opravu chybně zadané montáže; pro běžné sundání z kola použijte Demontovat.`;
    if (!(await confirm({ message, confirmText: "Smazat montáž", isDestructive: true }))) return;
    deleteInstallation(inst.id);
    toast("Záznam o montáži byl smazán.", "success");
  };

  const handleOpenCreateSchedule = () => {
    setEditingSchedule(null);
    setIsScheduleModalOpen(true);
  };

  const handleOpenEditSchedule = (sched: any) => {
    setEditingSchedule(sched);
    setIsScheduleModalOpen(true);
  };

  const handleToggleActive = (scheduleId: string) => {
    try {
      toggleServiceScheduleActive(scheduleId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Chyba při změně stavu plánu.";
      toast(msg, "error");
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
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
    <div className="space-y-5 pb-12">
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
      <div className="card p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="chip chip-neutral">
                {category?.nameCs || "Komponent"}
              </span>
              {component.status === "INSTALLED" && activeBike ? (
                <span className="chip chip-emerald">
                  <BikeIcon className="w-3.5 h-3.5" />
                  <span>Osazeno na: {activeBike.name}</span>
                </span>
              ) : (
                <span className="chip chip-neutral">
                  Skladem
                </span>
              )}
            </div>

            <h1 className="text-xl font-bold text-slate-900">
              {component.manufacturer} {component.model}
            </h1>
            {component.variant && (
              <p className="text-xs text-slate-500 mt-0.5">{component.variant}</p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            <button
              onClick={() => handleOpenRecordModal()}
              className="btn-secondary"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Zapsat servis</span>
            </button>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="btn-secondary"
              title="Upravit komponentu"
              aria-label="Upravit komponentu"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Upravit</span>
            </button>
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="btn-secondary btn-secondary-danger"
              title="Smazat komponentu"
              aria-label="Smazat komponentu"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Smazat</span>
            </button>
          </div>
        </div>

        {/* Specs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="section-label block">Nákupní cena</span>
            <span className="text-base font-bold text-slate-900 tabular-nums">{formatCzk(component.purchasePrice)}</span>
          </div>
          <div>
            <span className="section-label block">Datum nákupu</span>
            <span className="text-sm font-semibold text-slate-900">{component.purchaseDate ? formatDateCs(component.purchaseDate) : "-"}</span>
          </div>
          <div>
            <span className="section-label block">Sériové číslo</span>
            <span className="text-sm text-slate-700 tabular-nums">{component.serialNumber || "Neuvedeno"}</span>
          </div>
          {specFields.map((field) => (
            <div key={field.key}>
              <span className="section-label block">{field.label}</span>
              <span className="text-sm font-medium text-slate-700">{getSpecValue(field.key) || "-"}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SERVISNÍ PLÁNY SEKCE */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-navy-600" />
              <span>Servisní plány komponenty ({schedulesWithStatus.length})</span>
            </h2>
          </div>

          <button
            onClick={handleOpenCreateSchedule}
            className="btn-primary self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Přidat plán</span>
          </button>
        </div>

        {schedulesWithStatus.length === 0 ? (
          <div className="card empty-state space-y-3">
            <p>
              Pro tuto komponentu zatím není nastaven žádný servisní plán.
            </p>
            <button
              onClick={handleOpenCreateSchedule}
              className="btn-secondary"
            >
              <Plus className="w-4 h-4" />
              <span>Vytvořit první plán</span>
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
                  className={`card p-4 sm:p-5 flex flex-col justify-between space-y-4 ${
                    !sched.isActive ? "bg-slate-50" : ""
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`chip ${
                          !sched.isActive
                            ? "chip-neutral"
                            : isOverdue
                            ? "chip-rose"
                            : isDueSoon
                            ? "chip-amber"
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

                    <h3 className="text-sm font-bold text-slate-900">
                      {sched.name}
                    </h3>

                    {sched.notes && (
                      <p className="text-xs text-slate-500 italic">{sched.notes}</p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(sched.id)}
                        className="btn-text text-slate-600 hover:text-slate-900"
                      >
                        {sched.isActive ? "Pozastavit" : "Aktivovat"}
                      </button>
                      <button
                        onClick={() => handleDeleteSchedule(sched.id)}
                        className="btn-icon btn-icon-danger"
                        title="Smazat plán"
                        aria-label={`Smazat plán ${sched.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditSchedule(sched)}
                        className="btn-secondary btn-sm"
                      >
                        Upravit
                      </button>
                      <button
                        onClick={() => handleOpenRecordModal(item)}
                        className="btn-primary btn-sm"
                      >
                        Zapsat servis
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* HISTORIE SERVISU SEKCE */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-navy-600" />
          <span>Servisní deník komponenty ({serviceEvents.length})</span>
        </h2>

        {serviceEvents.length === 0 ? (
          <div className="card empty-state">
            <p>Pro tento komponent zatím nebyl proveden žádný servisní záznam.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold select-none">
                    <th className="py-3 px-4">Datum</th>
                    <th className="py-3 px-4">Popis úkonu</th>
                    <th className="py-3 px-4">Provedl</th>
                    <th className="py-3 px-4">Tachometr kola</th>
                    <th className="py-3 px-4 text-right">Celková cena</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {serviceEvents.map((evt) => (
                    <tr key={evt.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-700">{formatDateCs(evt.serviceDate)}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{evt.description}</td>
                      <td className="py-3 px-4 text-slate-600">{evt.shopName || (evt.performedBy === "SELF" ? "Svépomocí" : "Servis")}</td>
                      <td className="py-3 px-4 text-slate-600 tabular-nums">{formatKm(evt.bikeKm)}</td>
                      <td className="py-3 px-4 text-right font-bold tabular-nums text-slate-900">{formatCzk(evt.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* HISTORIE INSTALACÍ SEKCE */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <BikeIcon className="w-4 h-4 text-navy-600" />
          <span>Historie osazení na kolech ({installationHistory.length})</span>
        </h2>

        {installationHistory.length === 0 ? (
          <div className="card empty-state">
            <p>Tento komponent zatím nebyl osazen na žádném kole.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold select-none">
                    <th className="py-3 px-4">Kolo</th>
                    <th className="py-3 px-4">Nainstalováno</th>
                    <th className="py-3 px-4">Demontováno</th>
                    <th className="py-3 px-4">Nájezd dílu</th>
                    <th className="py-3 px-4 text-right">Stav</th>
                    <th className="py-3 px-4 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {installationHistory.map(({ installation: inst, bike }) => (
                    <tr key={inst.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{bike?.name || "Kolo"}</td>
                      <td className="py-3 px-4 text-slate-600">{formatDateCs(inst.installedAt)}</td>
                      <td className="py-3 px-4 text-slate-600">{inst.removedAt ? formatDateCs(inst.removedAt) : "Dosud osazeno"}</td>
                      <td className="py-3 px-4 text-slate-700 font-semibold tabular-nums">
                        {formatKm(Math.max(0, Number(inst.removedBikeKm ?? bike?.currentKm ?? 0) - Number(inst.installedBikeKm || 0)))}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`chip ${inst.removedAt ? "chip-neutral" : "chip-emerald"}`}>
                          {inst.removedAt ? "Ukončeno" : "Aktivní osazení"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteInstallation(inst, bike)}
                          title="Smazat chybný záznam o montáži"
                          aria-label="Smazat montáž"
                          className="btn-icon btn-icon-danger"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Record Service Modal */}
      <RecordServiceEventModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        fixedComponentId={component.id}
        fixedBikeId={activeBike?.id}
        initialSchedule={selectedScheduleForRecord}
        bikes={allBikes}
        components={[component]}
      />

      {/* Edit Component Modal */}
      <AddComponentModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        componentToEdit={component}
      />

      {/* Edit / Create Schedule Modal */}
      <ServiceScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        scheduleToEdit={editingSchedule}
        bikes={allBikes}
        components={[component]}
        preselectedBikeId={activeBike?.id}
        preselectedComponentId={component.id}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteComponent}
        title="Smazat komponentu"
        message={`Opravdu chcete smazat komponentu ${component.manufacturer} ${component.model}? Smaže se i historie jejích montáží, servisní plány a nákupní či prodejní záznamy. Servisní události na kole zůstanou. Tuto akci nelze vrátit zpět.`}
        confirmText="Smazat komponentu"
        isDestructive
      />
    </div>
  );
}

export default ComponentDetailClient;
