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
  Sliders,
  Loader2
} from "lucide-react";
import { t, formatDateCs, formatPsi, formatBar } from "@/lib/i18n";
import { formatClicksFromClosed, formatTireLabel, formatTireBadge } from "@/lib/domain/setup";
import { Modal, ModalFooter } from "@/components/common/Modal";
import { DeleteButton } from "@/components/common/DeleteButton";

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
      <div className="card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            {t("setup.title")}
          </h2>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsSnapshotModalOpen(true)}
            className="btn-secondary"
          >
            <Camera className="w-4 h-4" />
            <span>{t("setup.saveSnapshot")}</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="panel panel-success font-semibold flex items-center gap-2 animate-fade-in">
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
            <div className="card p-4 sm:p-5 space-y-4 ">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-navy-50 text-navy-700 flex items-center justify-center font-bold text-xs">
                    V
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {t("setup.fork.title")}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {forkComp ? `${forkComp.manufacturer} ${forkComp.model}` : "Nenamontována"}
                    </p>
                  </div>
                </div>

                {forkTravel && (
                  <span className="chip chip-navy tabular-nums">
                    {forkTravel} mm
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="field-label">
                    {t("setup.fork.pressure")} (psi)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={forkPressure}
                    onChange={(e) => setForkPressure(e.target.value)}
                    className="field"
                  />
                </div>

                <div>
                  <label className="field-label">
                    {t("setup.fork.sag")}
                  </label>
                  <input
                    type="number"
                    value={forkSag}
                    onChange={(e) => setForkSag(e.target.value)}
                    className="field"
                  />
                </div>

                <div>
                  <label className="field-label">
                    {t("setup.fork.lsc")}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={forkLsc}
                      onChange={(e) => setForkLsc(e.target.value)}
                      className="field"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium pointer-events-none">od zavřeno</span>
                  </div>
                </div>

                <div>
                  <label className="field-label">
                    {t("setup.fork.hsc")}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={forkHsc}
                      onChange={(e) => setForkHsc(e.target.value)}
                      className="field"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium pointer-events-none">od zavřeno</span>
                  </div>
                </div>

                <div>
                  <label className="field-label">
                    {t("setup.fork.lsr")}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={forkLsr}
                      onChange={(e) => setForkLsr(e.target.value)}
                      className="field"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium pointer-events-none">od zavřeno</span>
                  </div>
                </div>

                <div>
                  <label className="field-label">
                    {t("setup.fork.hsr")}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={forkHsr}
                      onChange={(e) => setForkHsr(e.target.value)}
                      className="field"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium pointer-events-none">od zavřeno</span>
                  </div>
                </div>

                <div>
                  <label className="field-label">
                    {t("setup.fork.tokens")}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={forkTokens}
                    onChange={(e) => setForkTokens(e.target.value)}
                    className="field"
                  />
                </div>
              </div>

              <div>
                <label className="field-label">
                  {t("setup.fork.notes")}
                </label>
                <input
                  type="text"
                  value={forkNotes}
                  onChange={(e) => setForkNotes(e.target.value)}
                  className="field"
                />
              </div>
            </div>
          )}

          {/* TLUMIČ */}
          {bike.suspensionType === "FULL_SUSPENSION" && (
            <div className="card p-4 sm:p-5 space-y-4 ">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-navy-50 text-navy-700 flex items-center justify-center font-bold text-xs">
                    T
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {t("setup.shock.title")}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {shockComp ? `${shockComp.manufacturer} ${shockComp.model}` : "Nenamontován"}
                    </p>
                  </div>
                </div>

                {frameTravelSpec && (
                  <span className="chip chip-navy tabular-nums">
                    {frameTravelSpec} mm
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="field-label">
                    {t("setup.shock.pressure")} (psi)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={shockPressure}
                    onChange={(e) => setShockPressure(e.target.value)}
                    className="field"
                  />
                </div>

                <div>
                  <label className="field-label">
                    {t("setup.shock.sag")}
                  </label>
                  <input
                    type="number"
                    value={shockSag}
                    onChange={(e) => setShockSag(e.target.value)}
                    className="field"
                  />
                </div>

                <div>
                  <label className="field-label">
                    {t("setup.shock.lsc")}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={shockLsc}
                      onChange={(e) => setShockLsc(e.target.value)}
                      className="field"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium pointer-events-none">od zavřeno</span>
                  </div>
                </div>

                <div>
                  <label className="field-label">
                    {t("setup.shock.hsc")}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={shockHsc}
                      onChange={(e) => setShockHsc(e.target.value)}
                      className="field"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium pointer-events-none">od zavřeno</span>
                  </div>
                </div>

                <div>
                  <label className="field-label">
                    {t("setup.shock.lsr")}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={shockLsr}
                      onChange={(e) => setShockLsr(e.target.value)}
                      className="field"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium pointer-events-none">od zavřeno</span>
                  </div>
                </div>

                <div>
                  <label className="field-label">
                    {t("setup.shock.hsr")}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={shockHsr}
                      onChange={(e) => setShockHsr(e.target.value)}
                      className="field"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium pointer-events-none">od zavřeno</span>
                  </div>
                </div>

                <div>
                  <label className="field-label">
                    {t("setup.shock.tokens")}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={shockTokens}
                    onChange={(e) => setShockTokens(e.target.value)}
                    className="field"
                  />
                </div>
              </div>

              <div>
                <label className="field-label">
                  {t("setup.shock.notes")}
                </label>
                <input
                  type="text"
                  value={shockNotes}
                  onChange={(e) => setShockNotes(e.target.value)}
                  className="field"
                />
              </div>
            </div>
          )}
        </div>

        {/* PLÁŠTĚ GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Přední plášť */}
          <div className="card p-4 sm:p-5 space-y-3.5 ">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                  P
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {t("setup.tires.front")}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {frontTireComp ? formatTireLabel(frontTireComp) : "Neosazeno"}
                  </p>
                </div>
              </div>

              {frontTireComp && formatTireBadge(frontTireComp) && (
                <span className="chip chip-neutral tabular-nums">
                  {formatTireBadge(frontTireComp)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="field-label">
                  Tlak (bar)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={frontPressure}
                  onChange={(e) => setFrontPressure(e.target.value)}
                  className="field"
                />
              </div>

              <div>
                <label className="field-label">
                  {t("setup.tires.insert")}
                </label>
                <input
                  type="text"
                  value={frontInsert}
                  onChange={(e) => setFrontInsert(e.target.value)}
                  className="field"
                />
              </div>
            </div>

            <div>
              <label className="field-label">
                {t("setup.tires.notes")}
              </label>
              <input
                type="text"
                value={frontNotes}
                onChange={(e) => setFrontNotes(e.target.value)}
                className="field"
              />
            </div>
          </div>

          {/* Zadní plášť */}
          <div className="card p-4 sm:p-5 space-y-3.5 ">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                  Z
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {t("setup.tires.rear")}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {rearTireComp ? formatTireLabel(rearTireComp) : "Neosazeno"}
                  </p>
                </div>
              </div>

              {rearTireComp && formatTireBadge(rearTireComp) && (
                <span className="chip chip-neutral tabular-nums">
                  {formatTireBadge(rearTireComp)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="field-label">
                  Tlak (bar)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={rearPressure}
                  onChange={(e) => setRearPressure(e.target.value)}
                  className="field"
                />
              </div>

              <div>
                <label className="field-label">
                  {t("setup.tires.insert")}
                </label>
                <input
                  type="text"
                  value={rearInsert}
                  onChange={(e) => setRearInsert(e.target.value)}
                  className="field"
                />
              </div>
            </div>

            <div>
              <label className="field-label">
                {t("setup.tires.notes")}
              </label>
              <input
                type="text"
                value={rearNotes}
                onChange={(e) => setRearNotes(e.target.value)}
                className="field"
              />
            </div>
          </div>
        </div>

        {/* Celková poznámka k nastavení */}
        <div className="card p-4 sm:p-5">
          <label className="field-label">
            {t("setup.generalNotes")}
          </label>
          <textarea
            rows={3}
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            className="field"
          />
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t("common.loading")}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{t("setup.save")}</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* HISTORIE PROFILŮ NASTAVENÍ */}
      {snapshots.length > 0 && (
        <div className="card p-4 sm:p-5 space-y-4 ">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <History className="w-4 h-4 text-navy-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Uložené profily nastavení ({snapshots.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {snapshots.map((snap) => (
              <div
                key={snap.id}
                className="panel panel-neutral space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">
                    {snap.profileName || "Profil nastavení"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 tabular-nums">
                      {formatDateCs(snap.createdAt)}
                    </span>
                    <DeleteButton
                      onConfirm={() => deleteSetupSnapshot(snap.id)}
                      title="Smazat profil nastavení"
                      message={`Opravdu chcete smazat profil nastavení „${snap.profileName || "Profil nastavení"}“? Tuto akci nelze vrátit zpět.`}
                    />
                  </div>
                </div>

                {snap.notes && (
                  <p className="text-slate-600 italic">
                    "{snap.notes}"
                  </p>
                )}

                <div className="pt-2 border-t border-slate-200 text-slate-500 space-y-1 tabular-nums">
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
            <label htmlFor="snapshot-name" className="field-label">
              {t("setup.profileName")} *
            </label>
            <input
              id="snapshot-name"
              type="text"
              required
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value)}
              className="field"
            />
          </div>

          <div>
            <label htmlFor="snapshot-notes" className="field-label">
              Poznámka k profilu
            </label>
            <textarea
              id="snapshot-notes"
              rows={2}
              value={snapshotNote}
              onChange={(e) => setSnapshotNote(e.target.value)}
              className="field"
            />
          </div>

          <ModalFooter>
            <button
              type="button"
              onClick={() => setIsSnapshotModalOpen(false)}
              className="btn-secondary"
            >
              {t("common.cancel")}
            </button>
            <button type="submit" className="btn-primary">
              <Check className="w-4 h-4" />
              <span>Uložit profil nastavení</span>
            </button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
