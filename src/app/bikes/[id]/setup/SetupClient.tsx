"use client";

import React, { useState } from "react";
import { useVault } from "@/context/VaultContext";
import { useFeedback } from "@/components/common/Feedback";
import { BikeHeader } from "@/components/bike/BikeHeader";
import {
  Save,
  Camera,
  Check,
  History,
  Loader2
} from "lucide-react";
import { t, formatDateCs, formatPsi, formatBar } from "@/lib/i18n";
import { formatTireLabel, formatTireBadge, barToPsi, sagMm, getSupportedAdjusters } from "@/lib/domain/setup";
import { SetupSheet, ReadoutRow, ReadoutField, SagRuler, ClickStepper } from "@/components/setup/SetupParts";
import { Modal, ModalFooter } from "@/components/common/Modal";
import { DeleteButton } from "@/components/common/DeleteButton";
import { setupContentFromDraft, resolveForkTravel } from "@/lib/domain/setupEditing";
import type { Bike, BikeSetup, Component, SetupSnapshot, DampingAdjuster } from "@/types/vault";

interface SetupClientProps {
  bike: Bike;
  initialSetup?: BikeSetup;
  snapshots?: SetupSnapshot[];
  forkComp?: Component;
  shockComp?: Component;
  frontTireComp?: Component;
  rearTireComp?: Component;
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

  // Zdvih: odvozený z props při každém renderu (spec namontovaného dílu, u vidlice fallback na uložené nastavení).
  const forkTravelNum = resolveForkTravel(forkTravelSpec, initialSetup?.forkTravelMm);
  const shockTravelNum = frameTravelSpec ?? null;

  // Nepodporované tlumení se jen skryje; uložené hodnoty zůstávají ve stavu i při uložení.
  const forkAdjusters = getSupportedAdjusters(forkComp);
  const shockAdjusters = getSupportedAdjusters(shockComp);

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

  const getSetupContent = () => setupContentFromDraft({
    forkPressure, forkSag, forkLsc, forkHsc, forkLsr, forkHsr, forkTokens,
    forkNotes, shockPressure, shockSag, shockLsc, shockHsc, shockLsr, shockHsr,
    shockTokens, shockNotes, frontPressure, frontInsert, frontNotes, rearPressure, rearInsert,
    rearNotes, generalNotes,
  }, forkTravelSpec, initialSetup?.forkTravelMm);

  const handleSaveSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg(null);

    try {
      saveSetup(bike.id, getSetupContent());

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
      const snapshotData = getSetupContent();

      saveSetupSnapshot(bike.id, snapshotName.trim(), snapshotData, snapshotNote.trim() || undefined);
      setIsSnapshotModalOpen(false);
      setSnapshotName("");
      setSnapshotNote("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Nepodařilo se vytvořit snímek nastavení.";
      toast(msg, "error");
    }
  };

  const fmt1 = (v: number | null) =>
    v === null ? null : v.toLocaleString("cs-CZ", { maximumFractionDigits: 1 });
  const psiLine = (bar: string) => {
    const psi = fmt1(barToPsi(bar));
    return psi ? `${psi} psi` : null;
  };
  const sagLine = (travel: number | string | null | undefined, sag: string) => {
    const mm = fmt1(sagMm(travel, sag));
    return mm ? `${mm} mm` : null;
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
        {/* PLÁŠTĚ: first, they are what gets checked on the trail */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[
            {
              key: "front",
              title: t("setup.tires.front"),
              comp: frontTireComp,
              pressure: frontPressure,
              setPressure: setFrontPressure,
              insert: frontInsert,
              setInsert: setFrontInsert,
              notes: frontNotes,
              setNotes: setFrontNotes,
            },
            {
              key: "rear",
              title: t("setup.tires.rear"),
              comp: rearTireComp,
              pressure: rearPressure,
              setPressure: setRearPressure,
              insert: rearInsert,
              setInsert: setRearInsert,
              notes: rearNotes,
              setNotes: setRearNotes,
            },
          ].map((tire) => (
            <SetupSheet
              key={tire.key}
              title={tire.title}
              subtitle={tire.comp ? formatTireLabel(tire.comp) : "Neosazeno"}
              badge={
                tire.comp && formatTireBadge(tire.comp) ? (
                  <span className="chip chip-neutral shrink-0">{formatTireBadge(tire.comp)}</span>
                ) : undefined
              }
            >
              <ReadoutRow>
                <ReadoutField
                  label="Tlak"
                  unit="bar"
                  step="0.05"
                  value={tire.pressure}
                  onChange={tire.setPressure}
                  secondary={psiLine(tire.pressure)}
                />
                <div className="px-4 sm:px-5 py-3 space-y-1 min-w-0">
                  <label htmlFor={`tire-insert-${tire.key}`} className="section-label block">
                    {t("setup.tires.insert")}
                  </label>
                  <input
                    id={`tire-insert-${tire.key}`}
                    type="text"
                    value={tire.insert}
                    onChange={(e) => tire.setInsert(e.target.value)}
                    className="field"
                  />
                </div>
              </ReadoutRow>
              <div className="px-4 sm:px-5 py-3">
                <label htmlFor={`tire-notes-${tire.key}`} className="field-label">
                  {t("setup.tires.notes")}
                </label>
                <input
                  id={`tire-notes-${tire.key}`}
                  type="text"
                  value={tire.notes}
                  onChange={(e) => tire.setNotes(e.target.value)}
                  className="field"
                />
              </div>
            </SetupSheet>
          ))}
        </div>

        {/* ODPRUŽENÍ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[
            bike.suspensionType !== "RIGID" && {
              key: "fork",
              title: t("setup.fork.title"),
              subtitle: forkComp ? `${forkComp.manufacturer} ${forkComp.model}` : "Nenamontována",
              travel: forkTravelNum,
              pressure: forkPressure,
              setPressure: setForkPressure,
              pressureStep: "0.5",
              sag: forkSag,
              setSag: setForkSag,
              clicks: [
                { key: "LSC", label: t("setup.fork.lsc"), value: forkLsc, set: setForkLsc },
                { key: "HSC", label: t("setup.fork.hsc"), value: forkHsc, set: setForkHsc },
                { key: "LSR", label: t("setup.fork.lsr"), value: forkLsr, set: setForkLsr },
                { key: "HSR", label: t("setup.fork.hsr"), value: forkHsr, set: setForkHsr },
              ].filter((c) => forkAdjusters.includes(c.key as DampingAdjuster)),
              tokensLabel: t("setup.fork.tokens"),
              tokens: forkTokens,
              setTokens: setForkTokens,
              notesLabel: t("setup.fork.notes"),
              notes: forkNotes,
              setNotes: setForkNotes,
            },
            bike.suspensionType === "FULL_SUSPENSION" && {
              key: "shock",
              title: t("setup.shock.title"),
              subtitle: shockComp ? `${shockComp.manufacturer} ${shockComp.model}` : "Nenamontován",
              travel: shockTravelNum,
              pressure: shockPressure,
              setPressure: setShockPressure,
              pressureStep: "1",
              sag: shockSag,
              setSag: setShockSag,
              clicks: [
                { key: "LSC", label: t("setup.shock.lsc"), value: shockLsc, set: setShockLsc },
                { key: "HSC", label: t("setup.shock.hsc"), value: shockHsc, set: setShockHsc },
                { key: "LSR", label: t("setup.shock.lsr"), value: shockLsr, set: setShockLsr },
                { key: "HSR", label: t("setup.shock.hsr"), value: shockHsr, set: setShockHsr },
              ].filter((c) => shockAdjusters.includes(c.key as DampingAdjuster)),
              tokensLabel: t("setup.shock.tokens"),
              tokens: shockTokens,
              setTokens: setShockTokens,
              notesLabel: t("setup.shock.notes"),
              notes: shockNotes,
              setNotes: setShockNotes,
            },
          ]
            .filter((s): s is Exclude<typeof s, false> => Boolean(s))
            .map((s) => (
              <SetupSheet
                key={s.key}
                title={s.title}
                subtitle={s.subtitle}
                badge={s.travel ? <span className="chip chip-signal font-mono font-medium shrink-0">{s.travel} mm</span> : undefined}
              >
                <ReadoutRow>
                  <ReadoutField
                    label="Tlak"
                    unit="psi"
                    step={s.pressureStep}
                    value={s.pressure}
                    onChange={s.setPressure}
                  />
                  <ReadoutField
                    label="SAG"
                    unit="%"
                    step="1"
                    value={s.sag}
                    onChange={s.setSag}
                    secondary={sagLine(s.travel, s.sag)}
                  />
                </ReadoutRow>
                <SagRuler sagPercent={s.sag} travelMm={s.travel} />
                {s.clicks.length > 0 && (
                  <div>
                    {s.clicks.map((c) => (
                      <ClickStepper key={c.key} label={c.label} value={c.value} onChange={c.set} />
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-[7rem_1fr] gap-3 px-4 sm:px-5 py-3 border-t border-slate-200 bg-slate-50">
                  <div>
                    <label htmlFor={`${s.key}-tokens`} className="field-label">
                      {s.tokensLabel}
                    </label>
                    <input
                      id={`${s.key}-tokens`}
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={s.tokens}
                      onChange={(e) => s.setTokens(e.target.value)}
                      className="field"
                    />
                  </div>
                  <div className="min-w-0">
                    <label htmlFor={`${s.key}-notes`} className="field-label">
                      {s.notesLabel}
                    </label>
                    <input
                      id={`${s.key}-notes`}
                      type="text"
                      value={s.notes}
                      onChange={(e) => s.setNotes(e.target.value)}
                      className="field"
                    />
                  </div>
                </div>
              </SetupSheet>
            ))}
        </div>

        {/* Celková poznámka k nastavení */}
        <div className="card p-4 sm:p-5">
          <label htmlFor="setup-general-notes" className="field-label">
            {t("setup.generalNotes")}
          </label>
          <textarea
            id="setup-general-notes"
            rows={3}
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            className="field"
          />
        </div>

        {/* Submit Bar: on phones it stays reachable above the bottom navigation */}
        <div className="sticky z-20 bottom-[calc(4rem+env(safe-area-inset-bottom))] md:static flex items-center justify-end gap-3 max-md:p-2 max-md:bg-white max-md:border max-md:border-slate-200 max-md:rounded-lg">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary max-md:w-full"
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
        <div className="card overflow-hidden">
          <div className="card-header justify-start">
            <History className="w-4 h-4 text-signal-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Uložené profily nastavení ({snapshots.length})
            </h3>
          </div>

          <div className="divide-y divide-slate-200">
            {snapshots.map((snap) => (
              <div key={snap.id} className="px-4 sm:px-5 py-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-bold text-sm text-slate-900 block truncate">
                      {snap.profileName || "Profil nastavení"}
                    </span>
                    {snap.notes && <p className="text-xs text-slate-500">{snap.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-mono text-xs text-slate-500">
                      {formatDateCs(snap.createdAt)}
                    </span>
                    <DeleteButton
                      onConfirm={() => deleteSetupSnapshot(snap.id)}
                      title="Smazat profil nastavení"
                      message={`Opravdu chcete smazat profil nastavení „${snap.profileName || "Profil nastavení"}“? Tuto akci nelze vrátit zpět.`}
                    />
                  </div>
                </div>

                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
                  {[
                    ["Vidlice", snap.snapshotData?.forkPressurePsi ? formatPsi(snap.snapshotData.forkPressurePsi as number | string | null | undefined) : "–"],
                    ["Tlumič", snap.snapshotData?.shockPressurePsi ? formatPsi(snap.snapshotData.shockPressurePsi as number | string | null | undefined) : "–"],
                    ["Přední", formatBar(snap.snapshotData?.frontTirePressureBar as number | string | null | undefined)],
                    ["Zadní", formatBar(snap.snapshotData?.rearTirePressureBar as number | string | null | undefined)],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="section-label">{k}</dt>
                      <dd className="readout text-sm">{v}</dd>
                    </div>
                  ))}
                </dl>
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
