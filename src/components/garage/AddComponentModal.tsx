"use client";

import React, { useState } from "react";
import { Loader2, Check } from "lucide-react";
import { t } from "@/lib/i18n";
import { useVault } from "@/context/VaultContext";
import { useFeedback } from "@/components/common/Feedback";
import { Modal } from "@/components/common/Modal";
import { buttonClass, inputClass, labelClass, cn } from "@/lib/ui";

interface AddComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddComponentModal: React.FC<AddComponentModalProps> = ({ isOpen, onClose }) => {
  const { data, addComponent } = useVault();
  const { toast } = useFeedback();
  const categories = data.categories;

  const [categoryId, setCategoryId] = useState("");
  const effectiveCategoryId = categoryId || categories[0]?.id || "";
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [variant, setVariant] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [purchasePrice, setPurchasePrice] = useState("");
  const [initialKm, setInitialKm] = useState("0");
  const [initialHours, setInitialHours] = useState("0");
  const [wheelDiameter, setWheelDiameter] = useState("");
  const [tireWidth, setTireWidth] = useState("");
  const [tireCasing, setTireCasing] = useState("");
  const [tireCompound, setTireCompound] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manufacturer.trim() || !model.trim() || !effectiveCategoryId) return;

    setLoading(true);
    try {
      addComponent({
        categoryId: effectiveCategoryId,
        manufacturer: manufacturer.trim(),
        model: model.trim(),
        variant: variant.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
        purchaseDate,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
        currency: "CZK",
        initialKm: initialKm ? parseFloat(initialKm) : 0,
        initialMinutes: Math.round((initialHours ? parseFloat(initialHours) : 0) * 60),
        wheelDiameter: wheelDiameter.trim() || undefined,
        tireWidth: tireWidth.trim() || undefined,
        tireCasing: tireCasing.trim() || undefined,
        tireCompound: tireCompound.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      toast("Komponent byl založen do skladu.", "success");
      onClose();
      setManufacturer("");
      setModel("");
      setVariant("");
      setPurchasePrice("");
      setNotes("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Chyba při zakládání komponentu.";
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("components.addComponent")}
      subtitle="Založení nového dílu do centrálního skladu"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <label className={labelClass}>
            Kategorie komponentu *
          </label>
          <select
            value={effectiveCategoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={inputClass}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameCs}
              </option>
            ))}
          </select>
        </div>
    
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>
              Výrobce *
            </label>
            <input
              type="text"
              required
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              placeholder="např. RockShox, SRAM, Shimano"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Model *
            </label>
            <input
              type="text"
              required
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="např. ZEB Ultimate, Eagle X0"
              className={inputClass}
            />
          </div>
        </div>
    
        <div>
          <label className={labelClass}>
            Varianta / specifikace
          </label>
          <input
            type="text"
            value={variant}
            onChange={(e) => setVariant(e.target.value)}
            placeholder="např. 180mm 29 Slab Grey, 32z, 10-52z"
            className={inputClass}
          />
        </div>
    
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>
              Nákupní cena (Kč)
            </label>
            <input
              type="number"
              min="0"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              placeholder="0"
              className={cn(inputClass, "tabular-nums")}
            />
          </div>
          <div>
            <label className={labelClass}>
              Datum nákupu
            </label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
    
        {/* Specifická pole pro pláště */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
          <span className="text-xs font-semibold text-slate-700 block">
            Specifikace pro pláště (volitelné)
          </span>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={tireCasing}
              onChange={(e) => setTireCasing(e.target.value)}
              placeholder="Kostra (např. DoubleDown, DH, EXO+)"
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <input
              type="text"
              value={tireCompound}
              onChange={(e) => setTireCompound(e.target.value)}
              placeholder="Směs (např. MaxxGrip, MaxxTerra)"
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </div>
    
        <div>
          <label className={labelClass}>
            Poznámka
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClass}
          />
        </div>
    
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => onClose()}
            className={buttonClass("secondary", "lg")}
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={loading}
            className={buttonClass("primary", "lg", "flex items-center gap-2")}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>{loading ? t("common.loading") : "Založit díl do skladu"}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddComponentModal;
