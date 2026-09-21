"use client";

import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/common/Modal";
import { useVault } from "@/context/VaultContext";
import { BikeComponentsDisposition } from "@/lib/domain/deletion";
import { buttonClass } from "@/lib/ui";

interface DeleteBikeModalProps {
  isOpen: boolean;
  onClose: () => void;
  bikeId: string;
  bikeName: string;
  onDeleted?: () => void;
}

export function DeleteBikeModal({ isOpen, onClose, bikeId, bikeName, onDeleted }: DeleteBikeModalProps) {
  const { data, deleteBike } = useVault();
  const [disposition, setDisposition] = useState<BikeComponentsDisposition>("STORAGE");

  const installedCount = data.componentInstallations.filter((i) => i.bikeId === bikeId && !i.removedAt).length;

  const handleConfirm = () => {
    deleteBike(bikeId, disposition);
    onClose();
    onDeleted?.();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Smazat kolo" maxWidth="max-w-md">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl shrink-0 bg-rose-50 text-rose-600">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="text-sm text-slate-600 space-y-2">
          <p>
            Opravdu chcete smazat kolo <strong className="text-slate-900">{bikeName}</strong>? Smaže se i jeho
            historie tachometru, servisní záznamy a plány, nastavení, snímky nastavení a finanční záznamy kola.
            Tuto akci nelze vrátit zpět.
          </p>
        </div>
      </div>

      {installedCount > 0 && (
        <fieldset className="mt-5 space-y-2">
          <legend className="text-xs font-semibold text-slate-700 mb-2">
            Co udělat s komponenty na kole ({installedCount})?
          </legend>
          <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 cursor-pointer has-[:checked]:border-navy-500 has-[:checked]:bg-navy-50/50">
            <input
              type="radio"
              name="components-disposition"
              checked={disposition === "STORAGE"}
              onChange={() => setDisposition("STORAGE")}
              className="mt-0.5"
            />
            <span className="text-xs text-slate-600">
              <span className="block font-semibold text-slate-800">Vrátit do skladu</span>
              Komponenty zůstanou v evidenci a půjdou namontovat na jiné kolo.
            </span>
          </label>
          <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 cursor-pointer has-[:checked]:border-rose-500 has-[:checked]:bg-rose-50/50">
            <input
              type="radio"
              name="components-disposition"
              checked={disposition === "DELETE"}
              onChange={() => setDisposition("DELETE")}
              className="mt-0.5"
            />
            <span className="text-xs text-slate-600">
              <span className="block font-semibold text-slate-800">Smazat i komponenty</span>
              Komponenty se odstraní včetně jejich servisních plánů a nákupních záznamů.
            </span>
          </label>
        </fieldset>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className={buttonClass("secondary", "md")}
        >
          Zrušit
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className={buttonClass("danger", "md")}
        >
          Smazat kolo
        </button>
      </div>
    </Modal>
  );
}

export default DeleteBikeModal;
