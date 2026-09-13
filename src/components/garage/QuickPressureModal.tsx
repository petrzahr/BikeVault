"use client";

import React, { useState } from "react";
import { useVault } from "@/context/VaultContext";
import { X, Gauge, Check, Plus, Minus } from "lucide-react";
import { t } from "@/lib/i18n";

interface QuickPressureModalProps {
  isOpen: boolean;
  onClose: () => void;
  bikeId: string;
  bikeName: string;
  initialFrontBar?: number;
  initialRearBar?: number;
  onSuccess?: () => void;
}

export function QuickPressureModal({
  isOpen,
  onClose,
  bikeId,
  bikeName,
  initialFrontBar = 1.55,
  initialRearBar = 1.75,
  onSuccess,
}: QuickPressureModalProps) {
  const { saveSetup } = useVault();
  const [front, setFront] = useState<number>(initialFrontBar);
  const [rear, setRear] = useState<number>(initialRearBar);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAdjust = (type: "front" | "rear", delta: number) => {
    if (type === "front") {
      setFront((prev) => Math.max(0.5, Math.round((prev + delta) * 100) / 100));
    } else {
      setRear((prev) => Math.max(0.5, Math.round((prev + delta) * 100) / 100));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      saveSetup(bikeId, {
        frontTirePressureBar: front,
        rearTirePressureBar: rear,
      });
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl text-slate-900">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
              <Gauge className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Rychlá úprava tlaků</h3>
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

        <div className="p-5 space-y-5">
          {/* Přední plášť */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Přední plášť
              </span>
              <span className="text-xs font-mono text-blue-600 font-medium">
                {(front * 14.5038).toFixed(1)} psi
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleAdjust("front", -0.05)}
                className="w-11 h-11 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-sm flex items-center justify-center font-bold text-lg active:scale-95 transition-all"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="text-center font-mono font-bold text-2xl text-slate-900">
                {front.toFixed(2)} <span className="text-xs text-slate-500 font-sans">bar</span>
              </div>
              <button
                type="button"
                onClick={() => handleAdjust("front", +0.05)}
                className="w-11 h-11 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-sm flex items-center justify-center font-bold text-lg active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Zadní plášť */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Zadní plášť
              </span>
              <span className="text-xs font-mono text-blue-600 font-medium">
                {(rear * 14.5038).toFixed(1)} psi
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleAdjust("rear", -0.05)}
                className="w-11 h-11 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-sm flex items-center justify-center font-bold text-lg active:scale-95 transition-all"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="text-center font-mono font-bold text-2xl text-slate-900">
                {rear.toFixed(2)} <span className="text-xs text-slate-500 font-sans">bar</span>
              </div>
              <button
                type="button"
                onClick={() => handleAdjust("rear", +0.05)}
                className="w-11 h-11 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-sm flex items-center justify-center font-bold text-lg active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors font-medium"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2 active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? t("common.loading") : t("common.save")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
