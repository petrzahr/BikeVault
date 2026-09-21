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
  Loader2
} from "lucide-react";
import { formatKm, formatMinutes, formatCzk, formatDateCs } from "@/lib/i18n";
import { ServiceScheduleModal } from "@/components/maintenance/ServiceScheduleModal";
import { useVault } from "@/context/VaultContext";
import { useFeedback } from "@/components/common/Feedback";
import { Modal } from "@/components/common/Modal";
import { ConfirmationModal } from "@/components/common/ConfirmationModal";
import { buttonClass, inputClass, labelClass, cn } from "@/lib/ui";

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
    createServiceEvent, 
    getComponentServiceSchedules, 
    getComponentServiceEvents, 
    getGarageBikes,
    deleteComponent
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
  const [serviceName, setServiceName] = useState("");
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [executionType, setExecutionType] = useState<"DIY" | "WORKSHOP">("DIY");
  const [serviceProvider, setServiceProvider] = useState("Svépomocí");
  const [partsCost, setPartsCost] = useState("");
  const [laborCost, setLaborCost] = useState("");
  const [notes, setNotes] = useState("");
  const [recordLoading, setRecordLoading] = useState(false);

  const activeBike = activeInstallation?.bike;

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleDeleteComponent = () => {
    deleteComponent(component.id);
    router.push("/components");
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
    if (item) {
      const sched = item.schedule;
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
    if (!serviceName.trim()) {
      toast("Zadejte název servisního úkonu.", "error");
      return;
    }

    setRecordLoading(true);
    const partsPrice = parseFloat(partsCost || "0");
    const laborPrice = parseFloat(laborCost || "0");
    try {
      const bikeIdToUse = activeBike?.id || allBikes[0]?.id;
      createServiceEvent({
        bikeId: bikeIdToUse,
        componentId: component.id,
        serviceScheduleId: selectedScheduleForRecord?.id || null,
        eventType: "MAINTENANCE",
        serviceDate,
        bikeKm: activeBike ? Number(activeBike.currentKm) : 0,
        bikeMinutes: activeBike ? activeBike.currentMinutes : 0,
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
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
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
                <span className="px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 text-xs font-semibold">
                  Skladem
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {component.manufacturer} {component.model}
            </h1>
            {component.variant && (
              <p className="text-xs text-slate-500 mt-0.5">{component.variant}</p>
            )}
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => handleOpenRecordModal()}
              className={buttonClass("secondary", "md", "flex items-center gap-1.5")}
            >
              <Wrench className="w-3.5 h-3.5 text-brand-600" />
              <span>Zapsat servis</span>
            </button>
            <button
              onClick={handleOpenCreateSchedule}
              className={buttonClass("primary", "md", "flex items-center gap-1.5")}
            >
              <Plus className="w-4 h-4" />
              <span>Přidat plán</span>
            </button>
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="px-3 py-2 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Smazat komponentu"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Smazat</span>
            </button>
          </div>
        </div>

        {/* Specs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold block">Nákupní cena</span>
            <span className="text-base font-bold text-slate-900 tabular-nums">{formatCzk(component.purchasePrice)}</span>
          </div>
          <div>
            <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold block">Datum nákupu</span>
            <span className="text-sm font-semibold text-slate-900">{component.purchaseDate ? formatDateCs(component.purchaseDate) : "-"}</span>
          </div>
          <div>
            <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold block">Sériové číslo</span>
            <span className="text-sm text-slate-700 tabular-nums">{component.serialNumber || "Neuvedeno"}</span>
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
              <Clock className="w-5 h-5 text-brand-600" />
              <span>Servisní plány komponenty ({schedulesWithStatus.length})</span>
            </h2>
            <p className="text-xs text-slate-500">
              Nakonfigurované pravidelné intervaly údržby pro {component.manufacturer} {component.model}
            </p>
          </div>

          <button
            onClick={handleOpenCreateSchedule}
            className={buttonClass("primary", "sm", "flex items-center gap-1.5 self-start sm:self-auto")}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Přidat plán</span>
          </button>
        </div>

        {schedulesWithStatus.length === 0 ? (
          <div className="p-8 bg-white border border-slate-200/80 rounded-2xl text-center space-y-3 shadow-sm">
            <p className="text-xs text-slate-400">
              Pro tuto komponentu zatím není nastaven žádný servisní plán.
            </p>
            <button
              onClick={handleOpenCreateSchedule}
              className="px-4 py-2 bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 text-xs font-semibold rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer"
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
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 shadow-sm ${
                    !sched.isActive
                      ? "bg-slate-50/70 border-slate-200 opacity-80"
                      : isOverdue
                      ? "bg-rose-50/40 border-rose-200"
                      : isDueSoon
                      ? "bg-amber-50/40 border-amber-200"
                      : "bg-white border-slate-200/80 hover:border-slate-300"
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

                      <span className="text-[11px] tabular-nums text-slate-500 font-semibold">
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
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(sched.id)}
                        className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                      >
                        {sched.isActive ? "Pozastavit" : "Aktivovat"}
                      </button>
                      <button
                        onClick={() => handleDeleteSchedule(sched.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                        title="Smazat plán"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditSchedule(sched)}
                        className={buttonClass("secondary", "sm")}
                      >
                        Upravit
                      </button>
                      <button
                        onClick={() => handleOpenRecordModal(item)}
                        className={buttonClass("primary", "sm")}
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
        <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2 border-b border-slate-200 pb-3">
          <Wrench className="w-5 h-5 text-brand-600" />
          <span>Servisní deník komponenty ({serviceEvents.length})</span>
        </h2>

        {serviceEvents.length === 0 ? (
          <div className="p-8 bg-white border border-slate-200/80 rounded-2xl text-center shadow-sm">
            <p className="text-xs text-slate-400">Pro tento komponent zatím nebyl proveden žádný servisní záznam.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold select-none">
                    <th className="py-3 px-4">Datum</th>
                    <th className="py-3 px-4">Popis úkonu</th>
                    <th className="py-3 px-4">Provedl</th>
                    <th className="py-3 px-4">Tachometr kola</th>
                    <th className="py-3 px-4 text-right">Celková cena</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {serviceEvents.map((evt) => (
                    <tr key={evt.id} className="hover:bg-slate-50/80 transition-colors">
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
        <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2 border-b border-slate-200 pb-3">
          <BikeIcon className="w-5 h-5 text-brand-600" />
          <span>Historie osazení na kolech ({installationHistory.length})</span>
        </h2>

        {installationHistory.length === 0 ? (
          <div className="p-8 bg-white border border-slate-200/80 rounded-2xl text-center shadow-sm">
            <p className="text-xs text-slate-400">Tento komponent zatím nebyl osazen na žádném kole.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold select-none">
                    <th className="py-3 px-4">Kolo</th>
                    <th className="py-3 px-4">Nainstalováno</th>
                    <th className="py-3 px-4">Demontováno</th>
                    <th className="py-3 px-4">Nájezd dílu</th>
                    <th className="py-3 px-4 text-right">Stav</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {installationHistory.map((inst) => (
                    <tr key={inst.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{inst.bike?.name || "Kolo"}</td>
                      <td className="py-3 px-4 text-slate-600">{formatDateCs(inst.installedAt)}</td>
                      <td className="py-3 px-4 text-slate-600">{inst.removedAt ? formatDateCs(inst.removedAt) : "Dosud osazeno"}</td>
                      <td className="py-3 px-4 text-slate-700 font-semibold tabular-nums">{formatKm(inst.usageKm || 0)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          inst.removedAt ? "bg-slate-100 text-slate-600 border-slate-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}>
                          {inst.removedAt ? "Ukončeno" : "Aktivní osazení"}
                        </span>
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
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title={selectedScheduleForRecord ? `Zapsat servis: ${selectedScheduleForRecord.name}` : "Zapsat provedení servisu"}
        subtitle="Zaznamenejte provedený servisní úkon do knihy dílu"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveServiceEvent} className="space-y-4">
          <div>
            <label className={labelClass}>
              Název servisního úkonu *
            </label>
            <input
              type="text"
              required
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="např. Výměna těsnění a oleje"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
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
              className={buttonClass("secondary", "lg")}
            >
              Zrušit
            </button>
            <button
              type="submit"
              disabled={recordLoading}
              className={buttonClass("primary", "lg", "flex items-center gap-2")}
            >
              {recordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>Zapsat servis</span>
            </button>
          </div>
        </form>
      </Modal>

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
