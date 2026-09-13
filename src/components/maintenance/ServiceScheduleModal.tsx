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
  HelpCircle,
  Sliders
} from "lucide-react";
import { useVault } from "@/context/VaultContext";
import { PREDEFINED_SERVICE_TEMPLATES, ServiceTemplate } from "@/lib/domain/serviceTemplates";
import { formatKm } from "@/lib/i18n";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl my-8 overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isEditing ? "Upravit servisní plán" : "Přidat servisní plán"}
              </h2>
              <p className="text-xs text-slate-500">
                Pravidelný interval údržby podle hodin, kilometrů nebo času
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold p-1"
          >
            ✕
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Doporučené šablony (pouze při vytváření) */}
          {!isEditing && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Rychlé předvyplnění z doporučené šablony:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PREDEFINED_SERVICE_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl)}
                    className="px-2.5 py-1 bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-slate-700 border border-slate-200 rounded-lg text-xs transition-colors"
                  >
                    {tmpl.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Název plánu */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Název servisního plánu *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="např. Servis spodních nohou vidlice"
              className="w-full bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          {/* Vztahuje se k */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Vztahuje se k *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  appliesTo === "BIKE"
                    ? "bg-blue-50/70 border-blue-500 text-blue-900 font-semibold"
                    : "bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="appliesTo"
                  value="BIKE"
                  checked={appliesTo === "BIKE"}
                  onChange={() => setAppliesTo("BIKE")}
                  className="text-blue-600 focus:ring-0"
                />
                <div className="flex items-center gap-1.5">
                  <BikeIcon className="w-4 h-4 text-blue-600" />
                  <span>Celé kolo</span>
                </div>
              </label>

              <label
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  appliesTo === "COMPONENT"
                    ? "bg-blue-50/70 border-blue-500 text-blue-900 font-semibold"
                    : "bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="appliesTo"
                  value="COMPONENT"
                  checked={appliesTo === "COMPONENT"}
                  onChange={() => setAppliesTo("COMPONENT")}
                  className="text-blue-600 focus:ring-0"
                />
                <div className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>Konkrétní komponenta</span>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Kolo
                </label>
                <select
                  value={bikeId}
                  onChange={(e) => setBikeId(e.target.value)}
                  className="w-full bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
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
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Komponenta
                  </label>
                  <select
                    value={componentId}
                    onChange={(e) => setComponentId(e.target.value)}
                    required={appliesTo === "COMPONENT"}
                    className="w-full bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
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

            {/* Clear summary box if both selected */}
            {appliesTo === "COMPONENT" && selectedComponent && (
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200/60 text-xs text-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Cílový komponent</span>
                  <span className="font-bold text-slate-900">{selectedComponent.manufacturer} {selectedComponent.model}</span>
                </div>
                {selectedBike && (
                  <div className="text-right">
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Osazeno na kole</span>
                    <span className="font-semibold text-blue-700">{selectedBike.name}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Intervaly */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Nastavení servisního intervalu
              </label>
              <span className="text-[11px] text-blue-700 font-semibold bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                Podle toho, co nastane dříve
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Můžete zadat libovolnou kombinaci hodin, kilometrů a kalendářního času.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
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
                    className="w-full bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl pl-3 pr-8 py-2 text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">h</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
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
                    className="w-full bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl pl-3 pr-10 py-2 text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">km</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
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
                    className="w-full bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl pl-3 pr-12 py-2 text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">měsíců</span>
                </div>
              </div>
            </div>

            {/* Upozornění s předstihem (volitelné) */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Upozornit s předstihem (h)
                </label>
                <input
                  type="number"
                  min="1"
                  value={warningHours}
                  onChange={(e) => setWarningHours(e.target.value)}
                  placeholder="např. 10"
                  className="w-full bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-3 py-1.5 text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Upozornit s předstihem (km)
                </label>
                <input
                  type="number"
                  min="1"
                  value={warningKm}
                  onChange={(e) => setWarningKm(e.target.value)}
                  placeholder="např. 100"
                  className="w-full bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-3 py-1.5 text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Výchozí bod (Starting Point) */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Výchozí bod plánu (počátek počítání)
            </label>

            <div className="space-y-2">
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                  startingPointType === "CURRENT_STATE"
                    ? "bg-blue-50/70 border-blue-500 text-blue-900 font-medium"
                    : "bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="startingPoint"
                  value="CURRENT_STATE"
                  checked={startingPointType === "CURRENT_STATE"}
                  onChange={() => setStartingPointType("CURRENT_STATE")}
                  className="text-blue-600 focus:ring-0 mt-0.5"
                />
                <div>
                  <span className="font-bold block text-slate-900">
                    Od aktuálního stavu kola (čerstvý start)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Aktuální stav: <strong>{formatKm(currentKmNum)}</strong> • <strong>{currentHoursNum} h</strong> (dnes)
                  </span>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                  startingPointType === "HISTORICAL"
                    ? "bg-blue-50/70 border-blue-500 text-blue-900 font-medium"
                    : "bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="startingPoint"
                  value="HISTORICAL"
                  checked={startingPointType === "HISTORICAL"}
                  onChange={() => setStartingPointType("HISTORICAL")}
                  className="text-blue-600 focus:ring-0 mt-0.5"
                />
                <div className="w-full">
                  <span className="font-bold block text-slate-900">
                    Zadat datum a stav posledního servisu (historický počátek)
                  </span>
                  <span className="text-[11px] text-slate-500 block mb-2">
                    Pokud byl servis proveden dříve, BikeVault dopočítá zbývající nájezd od této chvíle.
                  </span>

                  {startingPointType === "HISTORICAL" && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 bg-white rounded-lg border border-slate-200 mt-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Datum servisu
                        </label>
                        <input
                          type="date"
                          value={lastServiceDate}
                          onChange={(e) => setLastServiceDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Stav tachometru (km)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={lastServiceKm}
                          onChange={(e) => setLastServiceKm(e.target.value)}
                          placeholder={String(currentKmNum)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Stav hodin (h)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={lastServiceHours}
                          onChange={(e) => setLastServiceHours(e.target.value)}
                          placeholder={String(currentHoursNum)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-600"
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
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Náhled výpočtu intervalu
              </span>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">Od servisu odjeto</span>
                  <span className="font-mono font-bold text-slate-800">
                    {intHoursNum ? `${hoursSince} h` : ""}{intHoursNum && intKmNum ? " / " : ""}{intKmNum ? `${kmSince} km` : ""}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">Zbývá do servisu</span>
                  <span className={`font-mono font-bold ${
                    (remainingHours !== null && remainingHours <= 0) || (remainingKm !== null && remainingKm <= 0)
                      ? "text-rose-600"
                      : "text-emerald-700"
                  }`}>
                    {remainingHours !== null ? `${remainingHours} h` : ""}{remainingHours !== null && remainingKm !== null ? " / " : ""}{remainingKm !== null ? `${remainingKm} km` : ""}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">Příští servis při</span>
                  <span className="font-mono font-bold text-blue-700">
                    {nextTargetHours !== null ? `${nextTargetHours} h` : ""}{nextTargetHours !== null && nextTargetKm !== null ? " / " : ""}{nextTargetKm !== null ? `${nextTargetKm} km` : ""}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Poznámky */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Poznámka k plánu
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instrukce pro mechanika, typ použitého těsnění nebo oleje..."
              className="w-full bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 rounded-xl p-3 text-slate-900 text-xs focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100"
            >
              Zrušit
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
            >
              {loading ? "Ukládám..." : isEditing ? "Uložit změny plánu" : "Vytvořit servisní plán"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
