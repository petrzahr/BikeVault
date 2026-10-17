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
import { Modal, ModalFooter } from "@/components/common/Modal";

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
      subtitle="Rychlá výměna opotřebované komponenty za náhradní kus ze skladu"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. Aktuálně namontovaná komponenta */}
        <div className="space-y-1">
          <span className="text-xs font-semibold text-slate-700 block">
            Aktuálně namontovaná komponenta
          </span>
          <div className="panel panel-neutral">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="chip bg-white text-slate-700">
                {currentCat?.nameCs || "Komponenta"}
              </span>
              <span className="text-xs text-slate-500">
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
              <p className="text-xs text-slate-600 mt-0.5">
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
            <span className="chip chip-emerald">
              {matchingCandidates.length === 1 ? "1 kus skladem" : `${matchingCandidates.length} kusy skladem`}
            </span>
          </div>

          {matchingCandidates.length === 1 ? (
            <div className="panel panel-info">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-bold text-slate-900">
                  {matchingCandidates[0].component.manufacturer} {matchingCandidates[0].component.model}
                </span>
                <span className="chip bg-white text-navy-700">
                  Skladem
                </span>
              </div>
              {matchingCandidates[0].component.variant && (
                <p className="text-xs text-slate-600">
                  {matchingCandidates[0].component.variant}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500 tabular-nums">
                {matchingCandidates[0].component.serialNumber && (
                  <span className="flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5" />
                    SN: {matchingCandidates[0].component.serialNumber}
                  </span>
                )}
                {matchingCandidates[0].component.purchaseDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
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
                    className="option-card items-start"
                  >
                    <input
                      type="radio"
                      name="replacementId"
                      value={c.id}
                      checked={isSelected}
                      onChange={() => setSelectedReplacementId(c.id)}
                      className="mt-0.5 text-navy-600 focus:ring-navy-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900">
                          {c.manufacturer} {c.model}
                        </span>
                        <span className="text-xs text-slate-500 tabular-nums">
                          ID: {c.id.slice(0, 6)}
                        </span>
                      </div>
                      {c.variant && <p className="text-slate-600 text-xs">{c.variant}</p>}
                      <div className="flex flex-wrap items-center gap-2.5 mt-1 text-xs text-slate-500 tabular-nums">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 panel panel-neutral">
          <div>
            <span className="section-label block">
              Aktuální nájezd kola
            </span>
            <span className="text-base font-bold text-slate-900 tabular-nums">
              {formatKm(Number(bike.currentKm))}
            </span>
          </div>
          <div>
            <span className="section-label block">
              Odjeto na kole
            </span>
            <span className="text-base font-bold text-slate-900 tabular-nums">
              {formatMinutes(bike.currentMinutes)}
            </span>
          </div>
        </div>

        {/* 4. Důsledek pro původní komponentu */}
        <div className="panel panel-neutral text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
            <Archive className="w-3.5 h-3.5 text-slate-500" />
            <span>Původní komponenta bude označena jako:</span>
            <span className="chip chip-rose">
              Vyřazeno
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed pl-5">
            Montáž na tomto kole bude ukončena k aktuálnímu nájezdu kola. Kompletní historie a nájezd původní komponenty zůstanou uchovány v systému.
          </p>
        </div>

        {/* Footer buttons */}
        <ModalFooter>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
          >
            Zrušit
          </button>
          <button
            type="submit"
            disabled={loading || !selectedReplacementId}
            className="btn-primary"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Provádím výměnu...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Vyměnit komponentu</span>
              </>
            )}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export default QuickReplaceModal;
