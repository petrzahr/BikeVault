"use client";

import React, { useState } from "react";
import { useVault } from "@/context/VaultContext";
import { Check, Plus, Minus, Loader2 } from "lucide-react";
import { t } from "@/lib/i18n";
import { Modal } from "@/components/common/Modal";
import { buttonClass } from "@/lib/ui";

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Rychlá úprava tlaků"
      subtitle={bikeName}
      maxWidth="max-w-sm"
    >
      <div className="space-y-4">
        {/* Přední plášť */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-xs font-semibold text-slate-700">
              Přední plášť
            </span>
            <span className="text-xs tabular-nums text-navy-600 font-semibold">
              {(front * 14.5038).toFixed(1)} psi
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => handleAdjust("front", -0.05)}
              className="w-10 h-10 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-sm flex items-center justify-center font-bold text-lg active:scale-95 transition-all cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="text-center tabular-nums font-bold text-2xl text-slate-900">
              {front.toFixed(2)} <span className="text-xs text-slate-400 font-normal">bar</span>
            </div>
            <button
              type="button"
              onClick={() => handleAdjust("front", +0.05)}
              className="w-10 h-10 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-sm flex items-center justify-center font-bold text-lg active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Zadní plášť */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-xs font-semibold text-slate-700">
              Zadní plášť
            </span>
            <span className="text-xs tabular-nums text-navy-600 font-semibold">
              {(rear * 14.5038).toFixed(1)} psi
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => handleAdjust("rear", -0.05)}
              className="w-10 h-10 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-sm flex items-center justify-center font-bold text-lg active:scale-95 transition-all cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="text-center tabular-nums font-bold text-2xl text-slate-900">
              {rear.toFixed(2)} <span className="text-xs text-slate-400 font-normal">bar</span>
            </div>
            <button
              type="button"
              onClick={() => handleAdjust("rear", +0.05)}
              className="w-10 h-10 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-sm flex items-center justify-center font-bold text-lg active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className={buttonClass("secondary", "md")}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className={buttonClass("primary", "md")}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>{loading ? t("common.loading") : t("common.save")}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default QuickPressureModal;
