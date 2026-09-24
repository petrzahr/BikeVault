"use client";

import React, { useState } from "react";
import { useVault } from "@/context/VaultContext";
import { useFeedback } from "@/components/common/Feedback";
import { BikeHeader } from "@/components/bike/BikeHeader";
import { 
  Gauge, 
  Save, 
  Camera, 
  Check, 
  Plus, 
  Minus, 
  History, 
  HelpCircle,
  Clock,
  Sliders
} from "lucide-react";
import { t, formatDateCs, formatPsi, formatBar } from "@/lib/i18n";
import { formatClicksFromClosed, formatTireLabel, formatTireBadge } from "@/lib/domain/setup";
import { Modal } from "@/components/common/Modal";
import { DeleteButton } from "@/components/common/DeleteButton";
import { buttonClass, inputClass, labelClass, cn } from "@/lib/ui";

interface SetupClientProps {
  bike: any;
  initialSetup?: any;
  snapshots?: any[];
  forkComp?: any;
  shockComp?: any;
  frontTireComp?: any;
  rearTireComp?: any;
  forkTravelSpec?: number | null;
  frameTravelSpec?: number | null;
}

export function SetupClient({
  bike,
  initialSetup: propSetup,
  snapshots: propSnapshots,
  forkComp,
  shockComp,
  frontTireComp,
  rearTireComp,
  forkTravelSpec,
  frameTravelSpec,
}: SetupClientProps) {
  const { saveSetup, saveSetupSnapshot, deleteSetupSnapshot, getBikeSetup, getBikeSnapshots } = useVault();
  const { toast } = useFeedback();
  const initialSetup = propSetup ?? getBikeSetup(bike.id);
  const snapshots = propSnapshots ?? getBikeSnapshots(bike.id);

  /** Chybějící hodnota (null/undefined) = prázdné pole, žádné vymyšlené výchozí hodnoty. */
  const numField = (value: number | null | undefined): string =>
    value !== null && value !== undefined ? String(value) : "";
  const textField = (value: string | null | undefined): string =>
    value !== null && value !== undefined ? value : "";

  // Vidlice
  const [forkPressure, setForkPressure] = useState(numField(initialSetup?.forkPressurePsi));
  const [forkSag, setForkSag] = useState(numField(initialSetup?.forkSagPercent));
  const [forkLsc, setForkLsc] = useState(numField(initialSetup?.forkLscClicks));
  const [forkHsc, setForkHsc] = useState(numField(initialSetup?.forkHscClicks));
  const [forkLsr, setForkLsr] = useState(numField(initialSetup?.forkLsrClicks));
  const [forkHsr, setForkHsr] = useState(numField(initialSetup?.forkHsrClicks));
  const [forkTokens, setForkTokens] = useState(numField(initialSetup?.forkVolumeSpacers));
  const [forkTravel, setForkTravel] = useState(
    forkTravelSpec ? String(forkTravelSpec) : initialSetup?.forkTravelMm ? String(initialSetup.forkTravelMm) : ""
  );
  const [forkNotes, setForkNotes] = useState(initialSetup?.forkNotes || "");

  // Tlumič
  const [shockPressure, setShockPressure] = useState(numField(initialSetup?.shockPressurePsi));
  const [shockSag, setShockSag] = useState(numField(initialSetup?.shockSagPercent));
  const [shockLsc, setShockLsc] = useState(numField(initialSetup?.shockLscClicks));
  const [shockHsc, setShockHsc] = useState(numField(initialSetup?.shockHscClicks));
  const [shockLsr, setShockLsr] = useState(numField(initialSetup?.shockLsrClicks));
  const [shockHsr, setShockHsr] = useState(numField(initialSetup?.shockHsrClicks));
  const [shockTokens, setShockTokens] = useState(numField(initialSetup?.shockVolumeSpacers));
  const [shockNotes, setShockNotes] = useState(initialSetup?.shockNotes || "");

  // Pláště
  const [frontPressure, setFrontPressure] = useState(numField(initialSetup?.frontTirePressureBar));
  const [frontInsert, setFrontInsert] = useState(textField(initialSetup?.frontTireInsert));
  const [frontNotes, setFrontNotes] = useState(initialSetup?.frontTireNotes || "");

  const [rearPressure, setRearPressure] = useState(numField(initialSetup?.rearTirePressureBar));
  const [rearInsert, setRearInsert] = useState(textField(initialSetup?.rearTireInsert));
  const [rearNotes, setRearNotes] = useState(initialSetup?.rearTireNotes || "");

  // Obecná poznámka
  const [generalNotes, setGeneralNotes] = useState(initialSetup?.generalNotes || "");

  // UI state
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Snapshot modal
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [snapshotName, setSnapshotName] = useState("");
  const [snapshotNote, setSnapshotNote] = useState("");

  const handleSaveSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg(null);

    try {
      saveSetup(bike.id, {
        forkPressurePsi: forkPressure ? parseFloat(forkPressure) : null,
        forkSagPercent: forkSag ? parseInt(forkSag, 10) : null,
        forkLscClicks: forkLsc ? parseInt(forkLsc, 10) : null,
        forkHscClicks: forkHsc ? parseInt(forkHsc, 10) : null,
        forkLsrClicks: forkLsr ? parseInt(forkLsr, 10) : null,
        forkHsrClicks: forkHsr ? parseInt(forkHsr, 10) : null,
        forkVolumeSpacers: forkTokens ? parseInt(forkTokens, 10) : null,
        forkTravelMm: forkTravel ? parseInt(forkTravel, 10) : null,
        forkNotes: forkNotes.trim() || null,

        shockPressurePsi: shockPressure ? parseFloat(shockPressure) : null,
        shockSagPercent: shockSag ? parseInt(shockSag, 10) : null,
        shockLscClicks: shockLsc ? parseInt(shockLsc, 10) : null,
        shockHscClicks: shockHsc ? parseInt(shockHsc, 10) : null,
        shockLsrClicks: shockLsr ? parseInt(shockLsr, 10) : null,
        shockHsrClicks: shockHsr ? parseInt(shockHsr, 10) : null,
        shockVolumeSpacers: shockTokens ? parseInt(shockTokens, 10) : null,
        shockNotes: shockNotes.trim() || null,

        frontTirePressureBar: frontPressure ? parseFloat(frontPressure) : null,
        frontTireInsert: frontInsert.trim() || null,
        frontTireNotes: frontNotes.trim() || null,

        rearTirePressureBar: rearPressure ? parseFloat(rearPressure) : null,
        rearTireInsert: rearInsert.trim() || null,
        rearTireNotes: rearNotes.trim() || null,

        generalNotes: generalNotes.trim() || null,
      });

      setSuccessMsg("Nastavení kola bylo úspěšně uloženo.");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Došlo k chybě při ukládání nastavení.";
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!snapshotName.trim()) return;

    try {
      const snapshotData = {
        forkPressurePsi: forkPressure ? parseFloat(forkPressure) : null,
        forkSagPercent: forkSag ? parseInt(forkSag, 10) : null,
        forkLscClicks: forkLsc ? parseInt(forkLsc, 10) : null,
        forkHscClicks: forkHsc ? parseInt(forkHsc, 10) : null,
        forkLsrClicks: forkLsr ? parseInt(forkLsr, 10) : null,
        forkHsrClicks: forkHsr ? parseInt(forkHsr, 10) : null,
        forkVolumeSpacers: forkTokens ? parseInt(forkTokens, 10) : null,
        forkTravelMm: forkTravel ? parseInt(forkTravel, 10) : null,
        forkNotes: forkNotes.trim() || null,
        shockPressurePsi: shockPressure ? parseFloat(shockPressure) : null,
        shockSagPercent: shockSag ? parseInt(shockSag, 10) : null,
        shockLscClicks: shockLsc ? parseInt(shockLsc, 10) : null,
        shockHscClicks: shockHsc ? parseInt(shockHsc, 10) : null,
        shockLsrClicks: shockLsr ? parseInt(shockLsr, 10) : null,
        shockHsrClicks: shockHsr ? parseInt(shockHsr, 10) : null,
        shockVolumeSpacers: shockTokens ? parseInt(shockTokens, 10) : null,
        shockNotes: shockNotes.trim() || null,
        frontTirePressureBar: frontPressure ? parseFloat(frontPressure) : null,
        frontTireInsert: frontInsert.trim() || null,
        frontTireNotes: frontNotes.trim() || null,
        rearTirePressureBar: rearPressure ? parseFloat(rearPressure) : null,
        rearTireInsert: rearInsert.trim() || null,
        rearTireNotes: rearNotes.trim() || null,
        generalNotes: generalNotes.trim() || null,
      };

      saveSetupSnapshot(bike.id, snapshotName.trim(), snapshotData, snapshotNote.trim() || undefined);
      setIsSnapshotModalOpen(false);
      setSnapshotName("");
      setSnapshotNote("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Nepodařilo se vytvořit snímek nastavení.";
      toast(msg, "error");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <BikeHeader bike={bike} />

      {/* Title & Actions Bar */}
      <div className="bg-white rounded-2xl p-5 min-h-[5rem] border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {t("setup.title")}
          </h2>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsSnapshotModalOpen(true)}
            className={buttonClass("secondary", "md")}
          >
            <Camera className="w-4 h-4 text-navy-600" />
            <span>{t("setup.saveSnapshot")}</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-sm">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Setup Form */}
      <form onSubmit={handleSaveSetup} className="space-y-6">
        {/* Odpružení Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* VIDLICE */}
          {bike.suspensionType !== "RIGID" && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-navy-50 text-navy-700 border border-navy-200/60 flex items-center justify-center font-bold text-xs">
                    V
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      {t("setup.fork.title")}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {forkComp ? `${forkComp.manufacturer} ${forkComp.model}` : "Nenamontována"}
                    </p>
                  </div>
                </div>

                {forkTravel && (
                  <span className="text-[11px] text-navy-700 tabular-nums bg-navy-50 px-2.5 py-1 rounded-full border border-navy-200/80 font-semibold">
                    {forkTravel} mm
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelClass}>
                    {t("setup.fork.pressure")} (psi)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={forkPressure}
                    onChange={(e) => setForkPressure(e.target.value)}
                    className={cn(inputClass, "tabular-nums")}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    {t("setup.fork.sag")}
                  </label>
                  <input
                    type="number"
                    value={forkSag}
                    onChange={(e) => setForkSag(e.target.value)}
                    className={cn(inputClass, "tabular-nums")}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    {t("setup.fork.lsc")}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={forkLsc}
                      onChange={(e) => setForkLsc(e.target.value)}
                      className={cn(inputClass, "tabular-nums")}
                    />
                    <span className="absolute right-3 top-2.5 text-[10px] text-slate-400">od zavřeno</span>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>
                    {t("setup.fork.hsc")}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={forkHsc}
                      onChange={(e) => setForkHsc(e.target.value)}
                      className={cn(inputClass, "tabular-nums")}
                    />
                    <span className="absolute right-3 top-2.5 text-[10px] text-slate-400">od zavřeno</span>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>
                    {t("setup.fork.lsr")}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={forkLsr}
                      onChange={(e) => setForkLsr(e.target.value)}
                      className={cn(inputClass, "tabular-nums")}
                    />
                    <span className="absolute right-3 top-2.5 text-[10px] text-slate-400">od zavřeno</span>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>
                    {t("setup.fork.hsr")}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={forkHsr}
                      onChange={(e) => setForkHsr(e.target.value)}
                      className={cn(inputClass, "tabular-nums")}
                    />
                    <span className="absolute right-3 top-2.5 text-[10px] text-slate-400">od zavřeno</span>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>
                    {t("setup.fork.tokens")}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={forkTokens}
                    onChange={(e) => setForkTokens(e.target.value)}
                    className={cn(inputClass, "tabular-nums")}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  {t("setup.fork.notes")}
                </label>
                <input
                  type="text"
                  value={forkNotes}
                  onChange={(e) => setForkNotes(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {/* TLUMIČ */}
          {bike.suspensionType === "FULL_SUSPENSION" && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-navy-50 text-navy-700 border border-navy-200/60 flex items-center justify-center font-bold text-xs">
                    T
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      {t("setup.shock.title")}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {shockComp ? `${shockComp.manufacturer} ${shockComp.model}` : "Nenamontován"}
                    </p>
                  </div>
                </div>

                {frameTravelSpec && (
                  <span className="text-[11px] text-navy-700 tabular-nums bg-navy-50 px-2.5 py-1 rounded-full border border-navy-200/80 font-semibold">
                    {frameTravelSpec} mm
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelClass}>
                    {t("setup.shock.pressure")} (psi)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={shockPressure}
                    onChange={(e) => setShockPressure(e.target.value)}
                    className={cn(inputClass, "tabular-nums")}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    {t("setup.shock.sag")}
                  </label>
                  <input
                    type="number"
                    value={shockSag}
                    onChange={(e) => setShockSag(e.target.value)}
                    className={cn(inputClass, "tabular-nums")}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    {t("setup.shock.lsc")}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={shockLsc}
                      onChange={(e) => setShockLsc(e.target.value)}
                      className={cn(inputClass, "tabular-nums")}
                    />
                    <span className="absolute right-3 top-2.5 text-[10px] text-slate-400">od zavřeno</span>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>
                    {t("setup.shock.hsc")}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={shockHsc}
                      onChange={(e) => setShockHsc(e.target.value)}
                      className={cn(inputClass, "tabular-nums")}
                    />
                    <span className="absolute right-3 top-2.5 text-[10px] text-slate-400">od zavřeno</span>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>
                    {t("setup.shock.lsr")}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={shockLsr}
                      onChange={(e) => setShockLsr(e.target.value)}
                      className={cn(inputClass, "tabular-nums")}
                    />
                    <span className="absolute right-3 top-2.5 text-[10px] text-slate-400">od zavřeno</span>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>
                    {t("setup.shock.hsr")}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={shockHsr}
                      onChange={(e) => setShockHsr(e.target.value)}
                      className={cn(inputClass, "tabular-nums")}
                    />
                    <span className="absolute right-3 top-2.5 text-[10px] text-slate-400">od zavřeno</span>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>
                    {t("setup.shock.tokens")}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={shockTokens}
                    onChange={(e) => setShockTokens(e.target.value)}
                    className={cn(inputClass, "tabular-nums")}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  {t("setup.shock.notes")}
                </label>
                <input
                  type="text"
                  value={shockNotes}
                  onChange={(e) => setShockNotes(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          )}
        </div>

        {/* PLÁŠTĚ GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Přední plášť */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 border border-slate-200/80 flex items-center justify-center font-bold text-xs">
                  P
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    {t("setup.tires.front")}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {frontTireComp ? formatTireLabel(frontTireComp) : "Neosazeno"}
                  </p>
                </div>
              </div>

              {frontTireComp && formatTireBadge(frontTireComp) && (
                <span className="text-[11px] text-slate-600 tabular-nums bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200/80 font-medium">
                  {formatTireBadge(frontTireComp)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className={labelClass}>
                  Tlak (bar)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={frontPressure}
                  onChange={(e) => setFrontPressure(e.target.value)}
                  className={cn(inputClass, "tabular-nums")}
                />
              </div>

              <div>
                <label className={labelClass}>
                  {t("setup.tires.insert")}
                </label>
                <input
                  type="text"
                  value={frontInsert}
                  onChange={(e) => setFrontInsert(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>
                {t("setup.tires.notes")}
              </label>
              <input
                type="text"
                value={frontNotes}
                onChange={(e) => setFrontNotes(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Zadní plášť */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 border border-slate-200/80 flex items-center justify-center font-bold text-xs">
                  Z
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    {t("setup.tires.rear")}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {rearTireComp ? formatTireLabel(rearTireComp) : "Neosazeno"}
                  </p>
                </div>
              </div>

              {rearTireComp && formatTireBadge(rearTireComp) && (
                <span className="text-[11px] text-slate-600 tabular-nums bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200/80 font-medium">
                  {formatTireBadge(rearTireComp)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className={labelClass}>
                  Tlak (bar)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={rearPressure}
                  onChange={(e) => setRearPressure(e.target.value)}
                  className={cn(inputClass, "tabular-nums")}
                />
              </div>

              <div>
                <label className={labelClass}>
                  {t("setup.tires.insert")}
                </label>
                <input
                  type="text"
                  value={rearInsert}
                  onChange={(e) => setRearInsert(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>
                {t("setup.tires.notes")}
              </label>
              <input
                type="text"
                value={rearNotes}
                onChange={(e) => setRearNotes(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Celková poznámka k nastavení */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-sm">
          <label className={labelClass}>
            {t("setup.generalNotes")}
          </label>
          <textarea
            rows={3}
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className={buttonClass("primary", "md")}
          >
            <Save className="w-4 h-4" />
            <span>{loading ? t("common.loading") : t("setup.save")}</span>
          </button>
        </div>
      </form>

      {/* HISTORIE SNÍMKŮ / PROFILY NASTAVENÍ */}
      {snapshots.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <History className="w-4 h-4 text-navy-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Uložené profily a snímky nastavení ({snapshots.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {snapshots.map((snap) => (
              <div
                key={snap.id}
                className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/60 space-y-2.5 text-xs hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-navy-700">
                    {snap.profileName || "Snímek nastavení"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 tabular-nums">
                      {formatDateCs(snap.createdAt)}
                    </span>
                    <DeleteButton
                      onConfirm={() => deleteSetupSnapshot(snap.id)}
                      title="Smazat snímek nastavení"
                      message={`Opravdu chcete smazat snímek nastavení „${snap.profileName || "Snímek nastavení"}“? Tuto akci nelze vrátit zpět.`}
                    />
                  </div>
                </div>

                {snap.notes && (
                  <p className="text-slate-600 italic">
                    "{snap.notes}"
                  </p>
                )}

                <div className="pt-2 border-t border-slate-200/60 text-slate-500 space-y-1 tabular-nums">
                  <div>Vidlice: <span className="text-slate-800 font-medium">{snap.snapshotData?.forkPressurePsi ? formatPsi(snap.snapshotData.forkPressurePsi) : "-"}</span></div>
                  <div>Tlumič: <span className="text-slate-800 font-medium">{snap.snapshotData?.shockPressurePsi ? formatPsi(snap.snapshotData.shockPressurePsi) : "-"}</span></div>
                  <div>Pláště: <span className="text-slate-800 font-medium">{formatBar(snap.snapshotData?.frontTirePressureBar)} / {formatBar(snap.snapshotData?.rearTirePressureBar)}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Uložit jako snímek / profil */}
      <Modal
        isOpen={isSnapshotModalOpen}
        onClose={() => setIsSnapshotModalOpen(false)}
        title={t("setup.snapshotTitle")}
        subtitle="Uložení aktuálního nastavení do historie pro snadné obnovení"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveSnapshot} className="space-y-4">
          <div>
            <label className={labelClass}>
              {t("setup.profileName")} *
            </label>
            <input
              type="text"
              required
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Poznámka k profilu
            </label>
            <textarea
              rows={2}
              value={snapshotNote}
              onChange={(e) => setSnapshotNote(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsSnapshotModalOpen(false)}
              className={buttonClass("ghost", "md")}
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className={buttonClass("primary", "md")}
            >
              Uložit profil
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
