"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Check } from "lucide-react";
import { t } from "@/lib/i18n";
import { useVault } from "@/context/VaultContext";
import { useFeedback } from "@/components/common/Feedback";
import { Modal } from "@/components/common/Modal";
import { buttonClass, inputClass, labelClass, cn } from "@/lib/ui";
import { getCategorySpecFields, LEGACY_COMPONENT_SPEC_KEYS, sortCategoriesAz } from "@/lib/bikeLists";

interface AddComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
  componentToEdit?: any | null;
}

const isLegacySpecKey = (key: string): boolean =>
  (LEGACY_COMPONENT_SPEC_KEYS as readonly string[]).includes(key);

export const AddComponentModal: React.FC<AddComponentModalProps> = ({ isOpen, onClose, componentToEdit }) => {
  const { data, addComponent, updateComponent } = useVault();
  const { toast } = useFeedback();
  const categories = sortCategoriesAz(data.categories);
  const isEditing = Boolean(componentToEdit);

  const [categoryId, setCategoryId] = useState("");
  const effectiveCategoryId = categoryId;
  const selectedCategory = categories.find((c) => c.id === effectiveCategoryId);
  const specFields = getCategorySpecFields(selectedCategory);

  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [variant, setVariant] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [purchasePrice, setPurchasePrice] = useState("");
  const [initialKm, setInitialKm] = useState("0");
  const [initialHours, setInitialHours] = useState("0");
  const [specValues, setSpecValues] = useState<Record<string, string>>({});
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
      const values: Record<string, string> = {};
      LEGACY_COMPONENT_SPEC_KEYS.forEach((key) => {
        if (componentToEdit[key]) values[key] = String(componentToEdit[key]);
      });
      if (componentToEdit.customFields) Object.assign(values, componentToEdit.customFields);
      setSpecValues(values);
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
      setSpecValues({});
      setNotes("");
    }
  }, [isOpen, componentToEdit]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manufacturer.trim() || !model.trim() || !effectiveCategoryId) return;

    setLoading(true);
    try {
      // Legacy pole (wheelDiameter, tireWidth, ...) žijí přímo na Component kvůli zpětné kompatibilitě,
      // ostatní vlastní pole kategorie jdou do Component.customFields.
      const legacySpecFields: Record<string, string | undefined> = {};
      const customFields: Record<string, string> = {};
      specFields.forEach((field) => {
        const val = (specValues[field.key] || "").trim();
        if (isLegacySpecKey(field.key)) {
          legacySpecFields[field.key] = val || undefined;
        } else if (val) {
          customFields[field.key] = val;
        }
      });

      const payload = {
        categoryId: effectiveCategoryId,
        manufacturer: manufacturer.trim(),
        model: model.trim(),
        variant: variant.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
        purchaseDate,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
        initialKm: initialKm ? parseFloat(initialKm) : 0,
        initialMinutes: Math.round((initialHours ? parseFloat(initialHours) : 0) * 60),
        ...legacySpecFields,
        customFields: Object.keys(customFields).length ? customFields : undefined,
        notes: notes.trim() || undefined,
      };

      if (isEditing) {
        updateComponent(componentToEdit.id, payload);
        toast("Komponent byl upraven.", "success");
      } else {
        addComponent({ ...payload, currency: "CZK" });
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

        {/* Vlastní pole specifikace podle zvolené kategorie */}
        {specFields.length > 0 && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
            <span className="text-xs font-semibold text-slate-700 block">
              Specifikace: {selectedCategory?.nameCs}
            </span>
            <div className="grid grid-cols-2 gap-2">
              {specFields.map((field) => (
                <input
                  key={field.key}
                  type="text"
                  value={specValues[field.key] || ""}
                  onChange={(e) => setSpecValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.label}
                  className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-navy-500/20"
                />
              ))}
            </div>
          </div>
        )}

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
