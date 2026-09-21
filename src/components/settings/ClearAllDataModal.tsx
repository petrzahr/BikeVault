"use client";

import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/common/Modal";
import { buttonClass } from "@/lib/ui";

const CONFIRM_WORD = "SMAZAT";

interface ClearAllDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  bikesCount: number;
  componentsCount: number;
}

export function ClearAllDataModal({ isOpen, onClose, onConfirm, bikesCount, componentsCount }: ClearAllDataModalProps) {
  const [typed, setTyped] = useState("");
  const canConfirm = typed.trim() === CONFIRM_WORD;

  const handleClose = () => {
    setTyped("");
    onClose();
  };

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm();
    handleClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Smazat všechna data" maxWidth="max-w-md">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl shrink-0 bg-rose-50 text-rose-600">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="text-sm text-slate-600 space-y-2">
          <p>
            Smažou se všechna kola ({bikesCount}), komponenty ({componentsCount}) a vše, co s nimi souvisí: historie
            tachometru, montáže, servisní plány a záznamy, nastavení a finanční záznamy.
          </p>
          <p>Kategorie komponent a uživatelské předvolby zůstanou. Tuto akci nelze vrátit zpět, zvažte předchozí zálohu.</p>
        </div>
      </div>

      <div className="mt-5 space-y-1.5">
        <label htmlFor="clear-all-confirm" className="block text-xs font-semibold text-slate-700">
          Pro potvrzení napište <span className="font-mono text-rose-600">{CONFIRM_WORD}</span>
        </label>
        <input
          id="clear-all-confirm"
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400"
        />
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={handleClose}
          className={buttonClass("secondary", "md")}
        >
          Zrušit
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canConfirm}
          className={buttonClass("danger", "md")}
        >
          Smazat všechna data
        </button>
      </div>
    </Modal>
  );
}

export default ClearAllDataModal;
