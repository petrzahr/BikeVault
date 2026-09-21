"use client";

import React, { useState } from "react";
import { 
  RefreshCw, 
  Check, 
  AlertCircle, 
  Archive, 
  Calendar, 
  Hash,
  Loader2
} from "lucide-react";
import { formatKm, formatMinutes, formatDateCs, formatCzk } from "@/lib/i18n";
import { Modal } from "@/components/common/Modal";
import { buttonClass } from "@/lib/ui";

interface QuickReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  bike: any;
  installedItem: {
    installation: any;
    component: any;
    category?: any;
  };
  matchingCandidates: Array<{
    component: any;
    category?: any;
  }>;
  onConfirm: (replacementComponentId: string) => Promise<void>;
  loading: boolean;
}

export function QuickReplaceModal({
  isOpen,
  onClose,
  bike,
  installedItem,
  matchingCandidates,
  onConfirm,
  loading,
}: QuickReplaceModalProps) {
  const [selectedReplacementId, setSelectedReplacementId] = useState<string>(
    matchingCandidates[0]?.component.id || ""
  );

  if (!isOpen || !installedItem) return null;

  const currentComp = installedItem.component;
  const currentCat = installedItem.category;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReplacementId) return;
    await onConfirm(selectedReplacementId);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Vyměnit komponentu"
      subtitle="Rychlá výměna opotřebovaného dílu za identický kus ze skladu"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. Aktuálně osazený díl */}
        <div className="space-y-1">
          <span className="text-xs font-semibold text-slate-700 block">
            Aktuálně osazený díl
          </span>
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-md bg-white text-slate-700 border border-slate-200 text-[10px] font-semibold uppercase">
                {currentCat?.nameCs || "Komponent"}
              </span>
              <span className="text-[11px] text-slate-400">
                na kole od {formatDateCs(installedItem.installation.installedAt)}
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900">
              {currentComp.manufacturer} {currentComp.model}
            </h4>
            {currentComp.variant && (
              <p className="text-xs text-slate-600 mt-0.5">{currentComp.variant}</p>
            )}
            {currentComp.tireCasing && (
              <p className="text-xs text-brand-700 mt-0.5">
                {currentComp.wheelDiameter && `${currentComp.wheelDiameter}" `}
                {currentComp.tireWidth} • {currentComp.tireCasing} • {currentComp.tireCompound}
              </p>
            )}
          </div>
        </div>

        {/* 2. Nahradit za (ze skladu) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 block">
              Nahradit za (ze skladu)
            </span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {matchingCandidates.length === 1 ? "1 kus skladem" : `${matchingCandidates.length} kusy skladem`}
            </span>
          </div>

          {matchingCandidates.length === 1 ? (
            <div className="p-3.5 bg-brand-50/60 border border-brand-200 rounded-xl">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-bold text-brand-950">
                  {matchingCandidates[0].component.manufacturer} {matchingCandidates[0].component.model}
                </span>
                <span className="text-[10px] text-brand-700 bg-brand-100/70 px-2 py-0.5 rounded-md font-semibold">
                  SKLADEM
                </span>
              </div>
              {matchingCandidates[0].component.variant && (
                <p className="text-xs text-slate-600">
                  {matchingCandidates[0].component.variant}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-500 tabular-nums">
                {matchingCandidates[0].component.serialNumber && (
                  <span className="flex items-center gap-1">
                    <Hash className="w-3 h-3 text-slate-400" />
                    SN: {matchingCandidates[0].component.serialNumber}
                  </span>
                )}
                {matchingCandidates[0].component.purchaseDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    Koupeno: {formatDateCs(matchingCandidates[0].component.purchaseDate)}
                  </span>
                )}
                {matchingCandidates[0].component.purchasePrice && Number(matchingCandidates[0].component.purchasePrice) > 0 && (
                  <span>Cena: {formatCzk(Number(matchingCandidates[0].component.purchasePrice))}</span>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {matchingCandidates.map((cand) => {
                const c = cand.component;
                const isSelected = selectedReplacementId === c.id;
                return (
                  <label
                    key={c.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? "bg-brand-50/70 border-brand-500 text-slate-900 font-medium shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/60"
                    }`}
                  >
                    <input
                      type="radio"
                      name="replacementId"
                      value={c.id}
                      checked={isSelected}
                      onChange={() => setSelectedReplacementId(c.id)}
                      className="mt-0.5 text-brand-600 focus:ring-brand-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900">
                          {c.manufacturer} {c.model}
                        </span>
                        <span className="text-[10px] text-slate-400 tabular-nums">
                          ID: {c.id.slice(0, 6)}
                        </span>
                      </div>
                      {c.variant && <p className="text-slate-600 text-[11px]">{c.variant}</p>}
                      <div className="flex flex-wrap items-center gap-2.5 mt-1 text-[10px] text-slate-500 tabular-nums">
                        {c.serialNumber && <span>SN: {c.serialNumber}</span>}
                        {c.purchaseDate && <span>Koupeno: {formatDateCs(c.purchaseDate)}</span>}
                        {c.purchasePrice && Number(c.purchasePrice) > 0 && (
                          <span>{formatCzk(Number(c.purchasePrice))}</span>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Stav kola při výměně */}
        <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Tachometr kola
            </span>
            <span className="text-base font-bold text-slate-900 tabular-nums">
              {formatKm(Number(bike.currentKm))}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Odjeto na kole
            </span>
            <span className="text-base font-bold text-slate-900 tabular-nums">
              {formatMinutes(bike.currentMinutes)}
            </span>
          </div>
        </div>

        {/* 4. Důsledek pro původní komponent */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
            <Archive className="w-3.5 h-3.5 text-slate-500" />
            <span>Původní komponent bude označen jako:</span>
            <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full font-bold text-[10px]">
              Vyřazeno
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed pl-5">
            Instalace na tomto kole bude korektně uzavřena k aktuálnímu stavu tachometru. Kompletní historie a nájezd původního dílu zůstanou trvale uchovány v systému.
          </p>
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className={buttonClass("secondary", "lg")}
          >
            Zrušit
          </button>
          <button
            type="submit"
            disabled={loading || !selectedReplacementId}
            className={buttonClass("primary", "lg", "flex items-center gap-2")}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Měním komponent...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Vyměnit</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default QuickReplaceModal;
