"use client";

import React, { useState } from "react";
import { useVault } from "@/context/VaultContext";
import { X, Check, SlidersHorizontal, AlertTriangle } from "lucide-react";
import { t, formatKm, formatMinutes } from "@/lib/i18n";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{t("odometer.updateOdometer")}</h3>
              <p className="text-xs text-slate-500">{bikeName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Previous State & Delta Box */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span>{t("odometer.previousState")}:</span>
              <span className="font-mono text-slate-900 font-semibold">
                {formatKm(currentKm)} • {formatMinutes(currentMinutes)}
              </span>
            </div>

            <div className="flex justify-between items-center pt-1.5 border-t border-slate-200">
              <span className="text-slate-600 font-medium">{t("odometer.difference")}:</span>
              <span className={`font-mono font-bold ${
                isDecreasing ? "text-amber-700" : "text-emerald-600"
              }`}>
                {deltaKm >= 0 ? `+${formatKm(deltaKm)}` : formatKm(deltaKm)} • {deltaMin >= 0 ? `+${formatMinutes(deltaMin)}` : `-${formatMinutes(Math.abs(deltaMin))}`}
              </span>
            </div>
          </div>

          {/* New cumulative kilometers */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
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
                placeholder="2847.0"
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 font-mono text-lg focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-sm"
              />
              <span className="absolute right-4 top-3 text-slate-400 text-sm font-medium">km</span>
            </div>
          </div>

          {/* New cumulative hours */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
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
                  placeholder="186"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 font-mono text-base focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-sm"
                />
                <span className="absolute right-3.5 top-2.5 text-slate-400 text-xs font-medium">h</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={minutesStr}
                  onChange={(e) => setMinutesStr(e.target.value)}
                  placeholder="0"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 font-mono text-base focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-sm"
                />
                <span className="absolute right-3.5 top-2.5 text-slate-400 text-xs font-medium">min</span>
              </div>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              {t("odometer.date")}
            </label>
            <input
              type="date"
              required
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-sm"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              {t("odometer.note")}
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="např. Pravidelný odečet před servisem, po týdnu ježdění"
              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-sm"
            />
          </div>

          {/* Warning if decreasing */}
          {isDecreasing && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-900 animate-fade-in">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Upozornění: Zadaný stav je nižší než předchozí!</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800/90">
                Pokud opravujete předchozí překlep nebo došlo k výměně tachometru, zaškrtněte potvrzení korekce.
              </p>
              <label className="flex items-center gap-2 pt-1 font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowCorrection}
                  onChange={(e) => setAllowCorrection(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
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
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors font-medium"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={loading || (isDecreasing && !allowCorrection)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2 active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? t("common.loading") : t("odometer.saveStatus")}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
