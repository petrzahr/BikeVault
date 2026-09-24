"use client";

import React, { useState } from "react";
import { useVault } from "@/context/VaultContext";
import { Check, AlertTriangle, Loader2 } from "lucide-react";
import { t, formatKm, formatMinutes } from "@/lib/i18n";
import { Modal } from "@/components/common/Modal";
import { buttonClass, inputClass, labelClass, cn } from "@/lib/ui";

interface UpdateOdometerModalProps {
  isOpen: boolean;
  onClose: () => void;
  bikeId: string;
  bikeName: string;
  currentKm: number;
  currentMinutes: number;
  onSuccess?: () => void;
}

export function UpdateOdometerModal({
  isOpen,
  onClose,
  bikeId,
  bikeName,
  currentKm,
  currentMinutes,
  onSuccess,
}: UpdateOdometerModalProps) {
  const { updateOdometer } = useVault();
  const [totalKmStr, setTotalKmStr] = useState<string>(String(currentKm || "0"));
  const [hoursStr, setHoursStr] = useState<string>(String(Math.floor(currentMinutes / 60)));
  const [minutesStr, setMinutesStr] = useState<string>(String(currentMinutes % 60));
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState<string>("");
  const [allowCorrection, setAllowCorrection] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const newKm = parseFloat(totalKmStr || "0");
  const newMinutes = (parseInt(hoursStr || "0", 10) * 60) + parseInt(minutesStr || "0", 10);

  const deltaKm = Math.round((newKm - currentKm) * 10) / 10;
  const deltaMin = newMinutes - currentMinutes;
  const isDecreasing = deltaKm < 0 || deltaMin < 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isNaN(newKm) || newKm < 0) {
      setError("Zadejte platný kumulativní stav kilometrů.");
      return;
    }
    if (newMinutes < 0) {
      setError("Zadejte platný počet hodin.");
      return;
    }

    if (isDecreasing && !allowCorrection) {
      setError("Nový stav je nižší než předchozí. Pro uložení potvrďte, že jde o korekci.");
      return;
    }

    setLoading(true);
    try {
      const res = await updateOdometer(
        bikeId,
        newKm,
        newMinutes,
        entryDate,
        note.trim() || undefined,
        allowCorrection
      );
      if (!res.success) {
        setError(res.error || "Došlo k chybě při ukládání stavu počítadla.");
        return;
      }
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Došlo k chybě při ukládání stavu počítadla.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("odometer.updateOdometer")}
      subtitle={bikeName}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Previous State & Delta Box */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
          <div className="flex justify-between items-center text-slate-600">
            <span>{t("odometer.previousState")}:</span>
            <span className="tabular-nums text-slate-900 font-semibold">
              {formatKm(currentKm)} • {formatMinutes(currentMinutes)}
            </span>
          </div>

          <div className="flex justify-between items-center pt-1.5 border-t border-slate-200/70">
            <span className="text-slate-600 font-medium">{t("odometer.difference")}:</span>
            <span className={`tabular-nums font-bold ${
              isDecreasing ? "text-amber-700" : "text-emerald-600"
            }`}>
              {deltaKm >= 0 ? `+${formatKm(deltaKm)}` : formatKm(deltaKm)} • {deltaMin >= 0 ? `+${formatMinutes(deltaMin)}` : `-${formatMinutes(Math.abs(deltaMin))}`}
            </span>
          </div>
        </div>

        {/* New cumulative kilometers */}
        <div>
          <label className={labelClass}>
            {t("odometer.currentKm")} *
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              min="0"
              required
              value={totalKmStr}
              onChange={(e) => setTotalKmStr(e.target.value)}
              className={cn(inputClass, "pr-12 tabular-nums")}
            />
            <span className="absolute right-3.5 top-2 text-slate-400 text-xs font-medium pointer-events-none">km</span>
          </div>
        </div>

        {/* New cumulative hours */}
        <div>
          <label className={labelClass}>
            {t("odometer.currentHours")} *
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <input
                type="number"
                min="0"
                required
                value={hoursStr}
                onChange={(e) => setHoursStr(e.target.value)}
                className={cn(inputClass, "pr-8 tabular-nums")}
              />
              <span className="absolute right-3.5 top-2 text-slate-400 text-xs font-medium pointer-events-none">h</span>
            </div>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="59"
                value={minutesStr}
                onChange={(e) => setMinutesStr(e.target.value)}
                className={cn(inputClass, "pr-11 tabular-nums")}
              />
              <span className="absolute right-3.5 top-2 text-slate-400 text-xs font-medium pointer-events-none">min</span>
            </div>
          </div>
        </div>

        {/* Date */}
        <div>
          <label className={labelClass}>
            {t("odometer.date")}
          </label>
          <input
            type="date"
            required
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Note */}
        <div>
          <label className={labelClass}>
            {t("odometer.note")}
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Warning if decreasing */}
        {isDecreasing && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-900">
            <div className="flex items-center gap-2 font-bold text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Upozornění: Zadaný stav je nižší než předchozí!</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800">
              Pokud opravujete předchozí překlep nebo došlo k výměně tachometru, zaškrtněte potvrzení korekce.
            </p>
            <label className="flex items-center gap-2 pt-1 font-semibold text-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allowCorrection}
                onChange={(e) => setAllowCorrection(e.target.checked)}
                className="w-4 h-4 text-navy-600 rounded border-slate-300 focus:ring-navy-500"
              />
              <span>Potvrdit korekci stavu počítadla</span>
            </label>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className={buttonClass("secondary", "md")}
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={loading || (isDecreasing && !allowCorrection)}
            className={buttonClass("primary", "md")}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>{loading ? t("common.loading") : t("odometer.saveStatus")}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default UpdateOdometerModal;
