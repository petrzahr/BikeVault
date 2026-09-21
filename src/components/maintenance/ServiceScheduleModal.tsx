"use client";

import React, { useState, useEffect } from "react";
import { 
  Wrench, 
  Clock, 
  Calendar, 
  Layers, 
  Bike as BikeIcon, 
  Sparkles, 
  Check, 
  AlertCircle,
  Loader2
} from "lucide-react";
import { useVault } from "@/context/VaultContext";
import { PREDEFINED_SERVICE_TEMPLATES, ServiceTemplate } from "@/lib/domain/serviceTemplates";
import { formatKm } from "@/lib/i18n";
import { Modal } from "@/components/common/Modal";
import { buttonClass, inputClass, labelClass, cn } from "@/lib/ui";

interface ServiceScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheduleToEdit?: any | null;
  bikes: any[];
  components: any[];
  preselectedBikeId?: string;
  preselectedComponentId?: string;
}

export function ServiceScheduleModal({
  isOpen,
  onClose,
  scheduleToEdit,
  bikes,
  components,
  preselectedBikeId,
  preselectedComponentId,
}: ServiceScheduleModalProps) {
  const { createServiceSchedule, updateServiceSchedule } = useVault();
  const isEditing = Boolean(scheduleToEdit);

  // Form states
  const [name, setName] = useState("");
  const [appliesTo, setAppliesTo] = useState<"BIKE" | "COMPONENT">("BIKE");
  const [bikeId, setBikeId] = useState<string>("");
  const [componentId, setComponentId] = useState<string>("");

  // Intervals
  const [intervalHours, setIntervalHours] = useState<string>("");
  const [intervalKm, setIntervalKm] = useState<string>("");
  const [intervalMonths, setIntervalMonths] = useState<string>("");
  const [warningHours, setWarningHours] = useState<string>("");
  const [warningKm, setWarningKm] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Starting point (Baseline)
  const [startingPointType, setStartingPointType] = useState<"CURRENT_STATE" | "HISTORICAL">("CURRENT_STATE");
  const [lastServiceDate, setLastServiceDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [lastServiceKm, setLastServiceKm] = useState<string>("");
  const [lastServiceHours, setLastServiceHours] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form on open / edit
  useEffect(() => {
    if (!isOpen) return;

    if (scheduleToEdit) {
      setName(scheduleToEdit.name || "");
      if (scheduleToEdit.componentId) {
        setAppliesTo("COMPONENT");
        setComponentId(scheduleToEdit.componentId);
      } else {
        setAppliesTo("BIKE");
      }
      setBikeId(scheduleToEdit.bikeId || preselectedBikeId || (bikes[0]?.id || ""));
      setIntervalHours(scheduleToEdit.intervalHours ? String(scheduleToEdit.intervalHours) : "");
      setIntervalKm(scheduleToEdit.intervalKm ? String(scheduleToEdit.intervalKm) : "");
      setIntervalMonths(scheduleToEdit.intervalMonths ? String(scheduleToEdit.intervalMonths) : "");
      setWarningHours(scheduleToEdit.warningThresholdHours ? String(scheduleToEdit.warningThresholdHours) : "");
      setWarningKm(scheduleToEdit.warningThresholdKm ? String(scheduleToEdit.warningThresholdKm) : "");
      setNotes(scheduleToEdit.notes || "");

      if (scheduleToEdit.lastServiceDate) {
        setStartingPointType("HISTORICAL");
        setLastServiceDate(scheduleToEdit.lastServiceDate);
        setLastServiceKm(scheduleToEdit.lastServiceBikeKm ? String(scheduleToEdit.lastServiceBikeKm) : "");
        setLastServiceHours(scheduleToEdit.lastServiceBikeHours ? String(scheduleToEdit.lastServiceBikeHours) : "");
      } else {
        setStartingPointType("CURRENT_STATE");
      }
    } else {
      // New schedule defaults
      setName("");
      const targetBike = preselectedBikeId || (bikes[0]?.id || "");
      setBikeId(targetBike);

      if (preselectedComponentId) {
        setAppliesTo("COMPONENT");
        setComponentId(preselectedComponentId);
      } else {
        setAppliesTo("BIKE");
        setComponentId("");
      }

      setIntervalHours("");
      setIntervalKm("");
      setIntervalMonths("");
      setWarningHours("");
      setWarningKm("");
      setNotes("");
      setStartingPointType("CURRENT_STATE");

      const selectedBikeObj = bikes.find((b) => b.id === targetBike);
      if (selectedBikeObj) {
        setLastServiceKm(String(selectedBikeObj.currentKm));
        setLastServiceHours(String(Math.round((selectedBikeObj.currentMinutes / 60) * 10) / 10));
      }
    }
    setError(null);
  }, [isOpen, scheduleToEdit, preselectedBikeId, preselectedComponentId, bikes]);

  if (!isOpen) return null;

  // Find selected bike & component objects
  const selectedBike = bikes.find((b) => b.id === bikeId) || bikes[0];
  const selectedComponent = components.find((c) => c.id === componentId);

  // When user selects a template
  const handleApplyTemplate = (tmpl: ServiceTemplate) => {
    setName(tmpl.name);
    if (tmpl.intervalHours) setIntervalHours(String(tmpl.intervalHours));
    else setIntervalHours("");

    if (tmpl.intervalKm) setIntervalKm(String(tmpl.intervalKm));
    else setIntervalKm("");

    if (tmpl.intervalMonths) setIntervalMonths(String(tmpl.intervalMonths));
    else setIntervalMonths("");

    if (tmpl.warningThresholdHours) setWarningHours(String(tmpl.warningThresholdHours));
    if (tmpl.warningThresholdKm) setWarningKm(String(tmpl.warningThresholdKm));

    if (tmpl.description) setNotes(tmpl.description);
  };

  // Real-time calculation preview
  const currentKmNum = selectedBike ? Number(selectedBike.currentKm) : 0;
  const currentHoursNum = selectedBike ? Math.round((selectedBike.currentMinutes / 60) * 10) / 10 : 0;

  const baselineKm = startingPointType === "CURRENT_STATE"
    ? currentKmNum
    : (lastServiceKm ? parseFloat(lastServiceKm) : 0);

  const baselineHours = startingPointType === "CURRENT_STATE"
    ? currentHoursNum
    : (lastServiceHours ? parseFloat(lastServiceHours) : 0);

  const intHoursNum = intervalHours ? parseFloat(intervalHours) : null;
  const intKmNum = intervalKm ? parseFloat(intervalKm) : null;
  const intMonthsNum = intervalMonths ? parseInt(intervalMonths, 10) : null;

  const hoursSince = Math.max(0, Math.round((currentHoursNum - baselineHours) * 10) / 10);
  const kmSince = Math.max(0, Math.round((currentKmNum - baselineKm) * 10) / 10);

  const remainingHours = intHoursNum ? Math.round((intHoursNum - hoursSince) * 10) / 10 : null;
  const remainingKm = intKmNum ? Math.round((intKmNum - kmSince) * 10) / 10 : null;
  const nextTargetHours = intHoursNum ? Math.round((baselineHours + intHoursNum) * 10) / 10 : null;
  const nextTargetKm = intKmNum ? Math.round((baselineKm + intKmNum) * 10) / 10 : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Zadejte prosím název servisního plánu.");
      return;
    }

    if (!intHoursNum && !intKmNum && !intMonthsNum) {
      setError("Nastavte alespoň jeden typ intervalu (hodiny, kilometry nebo měsíce).");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEditing) {
        updateServiceSchedule(scheduleToEdit.id, {
          name: name.trim(),
          bikeId: bikeId || null,
          componentId: appliesTo === "COMPONENT" ? componentId || null : null,
          intervalHours: intHoursNum,
          intervalKm: intKmNum,
          intervalMonths: intMonthsNum,
          conditionType: "WHICHEVER_FIRST",
          warningThresholdHours: warningHours ? parseFloat(warningHours) : null,
          warningThresholdKm: warningKm ? parseFloat(warningKm) : null,
          notes: notes.trim() || null,
          lastServiceDate: startingPointType === "HISTORICAL" ? lastServiceDate : undefined,
          lastServiceBikeKm: startingPointType === "HISTORICAL" && lastServiceKm ? parseFloat(lastServiceKm) : undefined,
          lastServiceBikeHours: startingPointType === "HISTORICAL" && lastServiceHours ? parseFloat(lastServiceHours) : undefined,
        });
      } else {
        createServiceSchedule({
          name: name.trim(),
          bikeId: bikeId || null,
          componentId: appliesTo === "COMPONENT" ? componentId || null : null,
          componentCategoryId: selectedComponent?.categoryId || null,
          intervalHours: intHoursNum,
          intervalKm: intKmNum,
          intervalMonths: intMonthsNum,
          conditionType: "WHICHEVER_FIRST",
          warningThresholdHours: warningHours ? parseFloat(warningHours) : null,
          warningThresholdKm: warningKm ? parseFloat(warningKm) : null,
          notes: notes.trim() || null,
          isActive: true,
          lastServiceDate: startingPointType === "HISTORICAL" ? lastServiceDate : null,
          lastServiceBikeKm: startingPointType === "HISTORICAL" && lastServiceKm ? parseFloat(lastServiceKm) : null,
          lastServiceBikeHours: startingPointType === "HISTORICAL" && lastServiceHours ? parseFloat(lastServiceHours) : null,
        });
      }

      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Došlo k chybě při ukládání servisního plánu.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Upravit servisní plán" : "Přidat servisní plán"}
      subtitle="Pravidelný interval údržby podle hodin, kilometrů nebo času"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Doporučené šablony (pouze při vytváření) */}
        {!isEditing && (
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              <span>Rychlé předvyplnění z doporučené šablony:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PREDEFINED_SERVICE_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => handleApplyTemplate(tmpl)}
                  className={buttonClass("secondary", "sm")}
                >
                  {tmpl.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Název plánu */}
        <div>
          <label className={labelClass}>
            Název servisního plánu *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="např. Servis spodních nohou vidlice"
            className={inputClass}
          />
        </div>

        {/* Vztahuje se k */}
        <div className="space-y-2">
          <label className={labelClass}>
            Vztahuje se k *
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label
              className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                appliesTo === "BIKE"
                  ? "bg-brand-50/70 border-brand-500 text-brand-900 font-semibold"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <input
                type="radio"
                name="appliesTo"
                value="BIKE"
                checked={appliesTo === "BIKE"}
                onChange={() => setAppliesTo("BIKE")}
                className="text-brand-600 focus:ring-brand-500"
              />
              <div className="flex items-center gap-1.5">
                <BikeIcon className="w-4 h-4 text-brand-600" />
                <span>Celé kolo</span>
              </div>
            </label>

            <label
              className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                appliesTo === "COMPONENT"
                  ? "bg-brand-50/70 border-brand-500 text-brand-900 font-semibold"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <input
                type="radio"
                name="appliesTo"
                value="COMPONENT"
                checked={appliesTo === "COMPONENT"}
                onChange={() => setAppliesTo("COMPONENT")}
                className="text-brand-600 focus:ring-brand-500"
              />
              <div className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-brand-600" />
                <span>Konkrétní komponenta</span>
              </div>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className={labelClass}>
                Kolo
              </label>
              <select
                value={bikeId}
                onChange={(e) => setBikeId(e.target.value)}
                className={inputClass}
              >
                <option value="">-- Bez vazby na konkrétní kolo --</option>
                {bikes.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.category})
                  </option>
                ))}
              </select>
            </div>

            {appliesTo === "COMPONENT" && (
              <div>
                <label className={labelClass}>
                  Komponenta
                </label>
                <select
                  value={componentId}
                  onChange={(e) => setComponentId(e.target.value)}
                  required={appliesTo === "COMPONENT"}
                  className={inputClass}
                >
                  <option value="">-- Vyberte komponentu --</option>
                  {components.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.manufacturer} {c.model} {c.variant ? `(${c.variant})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Intervaly */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className={labelClass}>
              Nastavení servisního intervalu
            </label>
            <span className="text-[11px] text-brand-700 font-semibold bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
              Podle toho, co nastane dříve
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>
                Podle hodin
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={intervalHours}
                  onChange={(e) => setIntervalHours(e.target.value)}
                  placeholder="např. 50"
                  className={cn(inputClass, "pl-3 pr-8 tabular-nums")}
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 pointer-events-none">h</span>
              </div>
            </div>

            <div>
              <label className={labelClass}>
                Podle kilometrů
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="10"
                  min="1"
                  value={intervalKm}
                  onChange={(e) => setIntervalKm(e.target.value)}
                  placeholder="např. 1000"
                  className={cn(inputClass, "pl-3 pr-10 tabular-nums")}
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 pointer-events-none">km</span>
              </div>
            </div>

            <div>
              <label className={labelClass}>
                Podle času
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={intervalMonths}
                  onChange={(e) => setIntervalMonths(e.target.value)}
                  placeholder="např. 12"
                  className={cn(inputClass, "pl-3 pr-12 tabular-nums")}
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 pointer-events-none">měs.</span>
              </div>
            </div>
          </div>

          {/* Upozornění s předstihem */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className={labelClass}>
                Upozornit s předstihem (h)
              </label>
              <input
                type="number"
                min="1"
                value={warningHours}
                onChange={(e) => setWarningHours(e.target.value)}
                placeholder="např. 10"
                className={cn(inputClass, "tabular-nums")}
              />
            </div>

            <div>
              <label className={labelClass}>
                Upozornit s předstihem (km)
              </label>
              <input
                type="number"
                min="1"
                value={warningKm}
                onChange={(e) => setWarningKm(e.target.value)}
                placeholder="např. 100"
                className={cn(inputClass, "tabular-nums")}
              />
            </div>
          </div>
        </div>

        {/* Výchozí bod */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <label className={labelClass}>
            Výchozí bod plánu
          </label>

          <div className="space-y-2">
            <label
              className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                startingPointType === "CURRENT_STATE"
                  ? "bg-brand-50/70 border-brand-500 text-brand-950 font-medium"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <input
                type="radio"
                name="startingPoint"
                value="CURRENT_STATE"
                checked={startingPointType === "CURRENT_STATE"}
                onChange={() => setStartingPointType("CURRENT_STATE")}
                className="text-brand-600 focus:ring-brand-500 mt-0.5"
              />
              <div>
                <span className="font-bold block text-slate-900">
                  Od aktuálního stavu kola (čerstvý start)
                </span>
                <span className="text-[11px] text-slate-500 tabular-nums">
                  Aktuální stav: <strong>{formatKm(currentKmNum)}</strong> • <strong>{currentHoursNum} h</strong> (dnes)
                </span>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                startingPointType === "HISTORICAL"
                  ? "bg-brand-50/70 border-brand-500 text-brand-950 font-medium"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <input
                type="radio"
                name="startingPoint"
                value="HISTORICAL"
                checked={startingPointType === "HISTORICAL"}
                onChange={() => setStartingPointType("HISTORICAL")}
                className="text-brand-600 focus:ring-brand-500 mt-0.5"
              />
              <div className="w-full">
                <span className="font-bold block text-slate-900">
                  Zadat datum a stav posledního servisu (historický počátek)
                </span>
                <span className="text-[11px] text-slate-500 block mb-2">
                  Pokud byl servis proveden dříve, BikeVault dopočítá zbývající nájezd od této chvíle.
                </span>

                {startingPointType === "HISTORICAL" && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 bg-white rounded-xl border border-slate-200 mt-2">
                    <div>
                      <label className={labelClass}>
                        Datum servisu
                      </label>
                      <input
                        type="date"
                        value={lastServiceDate}
                        onChange={(e) => setLastServiceDate(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>
                        Stav tachometru (km)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={lastServiceKm}
                        onChange={(e) => setLastServiceKm(e.target.value)}
                        placeholder={String(currentKmNum)}
                        className={cn(inputClass, "tabular-nums")}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>
                        Stav hodin (h)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={lastServiceHours}
                        onChange={(e) => setLastServiceHours(e.target.value)}
                        placeholder={String(currentHoursNum)}
                        className={cn(inputClass, "tabular-nums")}
                      />
                    </div>
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>

        {/* Živý náhled kalkulace */}
        {(intHoursNum || intKmNum) && (
          <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-3.5 space-y-2">
            <span className="text-xs font-semibold text-slate-700 block">
              Náhled výpočtu intervalu
            </span>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Od servisu odjeto</span>
                <span className="tabular-nums font-bold text-slate-900">
                  {intHoursNum ? `${hoursSince} h` : ""}{intHoursNum && intKmNum ? " / " : ""}{intKmNum ? `${kmSince} km` : ""}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Zbývá do servisu</span>
                <span className={`tabular-nums font-bold ${
                  (remainingHours !== null && remainingHours <= 0) || (remainingKm !== null && remainingKm <= 0)
                    ? "text-rose-600"
                    : "text-emerald-700"
                }`}>
                  {remainingHours !== null ? `${remainingHours} h` : ""}{remainingHours !== null && remainingKm !== null ? " / " : ""}{remainingKm !== null ? `${remainingKm} km` : ""}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Příští servis při</span>
                <span className="tabular-nums font-bold text-brand-700">
                  {nextTargetHours !== null ? `${nextTargetHours} h` : ""}{nextTargetHours !== null && nextTargetKm !== null ? " / " : ""}{nextTargetKm !== null ? `${nextTargetKm} km` : ""}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Poznámky */}
        <div>
          <label className={labelClass}>
            Poznámka k plánu
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Instrukce pro mechanika, typ použitého těsnění nebo oleje..."
            className={inputClass}
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className={buttonClass("secondary", "md")}
          >
            Zrušit
          </button>
          <button
            type="submit"
            disabled={loading}
            className={buttonClass("primary", "md")}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>{isEditing ? "Uložit změny plánu" : "Vytvořit servisní plán"}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default ServiceScheduleModal;
