"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Check } from "lucide-react";
import { t } from "@/lib/i18n";
import { useVault } from "@/context/VaultContext";
import { useFeedback } from "@/components/common/Feedback";
import { Modal } from "@/components/common/Modal";
import { buttonClass, inputClass, labelClass, cn } from "@/lib/ui";
import { sortCategoriesAz } from "@/lib/bikeLists";

interface AddComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
  componentToEdit?: any | null;
}

export const AddComponentModal: React.FC<AddComponentModalProps> = ({ isOpen, onClose, componentToEdit }) => {
  const { data, addComponent, updateComponent } = useVault();
  const { toast } = useFeedback();
  const categories = sortCategoriesAz(data.categories);
  const isEditing = Boolean(componentToEdit);

  const [categoryId, setCategoryId] = useState("");
  const effectiveCategoryId = categoryId;
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

  // Initialize form on open / edit
  useEffect(() => {
    if (!isOpen) return;

    if (componentToEdit) {
      setCategoryId(componentToEdit.categoryId || "");
      setManufacturer(componentToEdit.manufacturer || "");
      setModel(componentToEdit.model || "");
      setVariant(componentToEdit.variant || "");
      setSerialNumber(componentToEdit.serialNumber || "");
      setPurchaseDate(componentToEdit.purchaseDate ? componentToEdit.purchaseDate.split("T")[0] : new Date().toISOString().split("T")[0]);
      setPurchasePrice(componentToEdit.purchasePrice != null ? String(componentToEdit.purchasePrice) : "");
      setInitialKm(componentToEdit.initialKm != null ? String(componentToEdit.initialKm) : "0");
      setInitialHours(componentToEdit.initialMinutes != null ? String(componentToEdit.initialMinutes / 60) : "0");
      setWheelDiameter(componentToEdit.wheelDiameter || "");
      setTireWidth(componentToEdit.tireWidth || "");
      setTireCasing(componentToEdit.tireCasing || "");
      setTireCompound(componentToEdit.tireCompound || "");
      setNotes(componentToEdit.notes || "");
    } else {
      setCategoryId("");
      setManufacturer("");
      setModel("");
      setVariant("");
      setSerialNumber("");
      setPurchaseDate(new Date().toISOString().split("T")[0]);
      setPurchasePrice("");
      setInitialKm("0");
      setInitialHours("0");
      setWheelDiameter("");
      setTireWidth("");
      setTireCasing("");
      setTireCompound("");
      setNotes("");
    }
  }, [isOpen, componentToEdit]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manufacturer.trim() || !model.trim() || !effectiveCategoryId) return;

    setLoading(true);
    try {
      if (isEditing) {
        updateComponent(componentToEdit.id, {
          categoryId: effectiveCategoryId,
          manufacturer: manufacturer.trim(),
          model: model.trim(),
          variant: variant.trim() || undefined,
          serialNumber: serialNumber.trim() || undefined,
          purchaseDate,
          purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
          initialKm: initialKm ? parseFloat(initialKm) : 0,
          initialMinutes: Math.round((initialHours ? parseFloat(initialHours) : 0) * 60),
          wheelDiameter: wheelDiameter.trim() || undefined,
          tireWidth: tireWidth.trim() || undefined,
          tireCasing: tireCasing.trim() || undefined,
          tireCompound: tireCompound.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        toast("Komponent byl upraven.", "success");
      } else {
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
      }

      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (isEditing ? "Chyba při úpravě komponentu." : "Chyba při zakládání komponentu.");
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Upravit komponent" : t("components.addComponent")}
      subtitle={isEditing ? "Úprava údajů o dílu v centrálním skladu" : "Založení nového dílu do centrálního skladu"}
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
            required
            className={inputClass}
          >
            <option value="">—</option>
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
    
        <div className="grid grid-cols-2 gap-3">
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
          <div>
            <label className={labelClass}>
              Sériové číslo
            </label>
            <input
              type="text"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="volitelné"
              className={inputClass}
            />
          </div>
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
    
        {/* Specifická pole pro pláště / kola */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
          <span className="text-xs font-semibold text-slate-700 block">
            Specifikace pro pláště / kola (volitelné)
          </span>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={wheelDiameter}
              onChange={(e) => setWheelDiameter(e.target.value)}
              placeholder="Průměr kola (např. 29&quot;, 27.5&quot;)"
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-navy-500/20"
            />
            <input
              type="text"
              value={tireWidth}
              onChange={(e) => setTireWidth(e.target.value)}
              placeholder="Šířka pláště (např. 2.4&quot;)"
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-navy-500/20"
            />
            <input
              type="text"
              value={tireCasing}
              onChange={(e) => setTireCasing(e.target.value)}
              placeholder="Kostra (např. DoubleDown, DH, EXO+)"
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-navy-500/20"
            />
            <input
              type="text"
              value={tireCompound}
              onChange={(e) => setTireCompound(e.target.value)}
              placeholder="Směs (např. MaxxGrip, MaxxTerra)"
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-navy-500/20"
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
            className={buttonClass("secondary", "md")}
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={loading}
            className={buttonClass("primary", "md")}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>{loading ? t("common.loading") : isEditing ? "Uložit změny" : "Založit díl do skladu"}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddComponentModal;
