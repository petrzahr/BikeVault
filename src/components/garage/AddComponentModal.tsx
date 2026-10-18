"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Check } from "lucide-react";
import { t } from "@/lib/i18n";
import { useVault } from "@/context/VaultContext";
import { useFeedback } from "@/components/common/Feedback";
import { Modal, ModalFooter } from "@/components/common/Modal";
import { getCategorySpecFields, LEGACY_COMPONENT_SPEC_KEYS, sortCategoriesAz } from "@/lib/bikeLists";
import { DAMPING_ADJUSTERS, getSupportedAdjusters } from "@/lib/domain/setup";
import type { Component, DampingAdjuster } from "@/types/vault";

/** Kategorie, u kterých se eviduje nastavitelné tlumení. */
const DAMPED_CATEGORY_CODES = ["FORK", "REAR_SHOCK"];

interface AddComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
  componentToEdit?: any | null;
  /** Předvyplní formulář podle existující komponenty; uložení založí novou. */
  componentToDuplicate?: Component | null;
}

const isLegacySpecKey = (key: string): boolean =>
  (LEGACY_COMPONENT_SPEC_KEYS as readonly string[]).includes(key);

export const AddComponentModal: React.FC<AddComponentModalProps> = ({ isOpen, onClose, componentToEdit, componentToDuplicate }) => {
  const { data, addComponent, updateComponent } = useVault();
  const { toast } = useFeedback();
  const categories = sortCategoriesAz(data.categories);
  const isEditing = Boolean(componentToEdit);
  const isDuplicating = !isEditing && Boolean(componentToDuplicate);

  const [categoryId, setCategoryId] = useState("");
  const effectiveCategoryId = categoryId;
  const selectedCategory = categories.find((c) => c.id === effectiveCategoryId);
  const specFields = getCategorySpecFields(selectedCategory);
  const isDamped = DAMPED_CATEGORY_CODES.includes(selectedCategory?.code ?? "");

  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [variant, setVariant] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [purchasePrice, setPurchasePrice] = useState("");
  const [initialKm, setInitialKm] = useState("0");
  const [initialHours, setInitialHours] = useState("0");
  const [specValues, setSpecValues] = useState<Record<string, string>>({});
  const [adjusters, setAdjusters] = useState<DampingAdjuster[]>([...DAMPING_ADJUSTERS]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Initialize form on open / edit
  useEffect(() => {
    if (!isOpen) return;

    const source = componentToEdit ?? componentToDuplicate;
    if (source) {
      setCategoryId(source.categoryId || "");
      setManufacturer(source.manufacturer || "");
      setModel(source.model || "");
      setVariant(source.variant || "");
      const values: Record<string, string> = {};
      LEGACY_COMPONENT_SPEC_KEYS.forEach((key) => {
        if (source[key]) values[key] = String(source[key]);
      });
      if (source.customFields) Object.assign(values, source.customFields);
      setSpecValues(values);
      setAdjusters(getSupportedAdjusters(source));
    }

    if (componentToEdit) {
      setSerialNumber(componentToEdit.serialNumber || "");
      setPurchaseDate(componentToEdit.purchaseDate ? componentToEdit.purchaseDate.split("T")[0] : new Date().toISOString().split("T")[0]);
      setPurchasePrice(componentToEdit.purchasePrice != null ? String(componentToEdit.purchasePrice) : "");
      setInitialKm(componentToEdit.initialKm != null ? String(componentToEdit.initialKm) : "0");
      setInitialHours(componentToEdit.initialMinutes != null ? String(componentToEdit.initialMinutes / 60) : "0");
      setNotes(componentToEdit.notes || "");
    } else if (componentToDuplicate) {
      // Nový kus: údaje vázané na konkrétní nákup se nepřebírají
      setSerialNumber("");
      setPurchaseDate(new Date().toISOString().split("T")[0]);
      setPurchasePrice("");
      setInitialKm("0");
      setInitialHours("0");
      setNotes("");
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
      setAdjusters([...DAMPING_ADJUSTERS]);
      setNotes("");
    }
  }, [isOpen, componentToEdit, componentToDuplicate]);

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
        // Všechny čtyři = výchozí stav, neukládá se (stejně jako u starších dat).
        dampingAdjusters: isDamped && adjusters.length < DAMPING_ADJUSTERS.length ? adjusters : undefined,
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
      title={isEditing ? "Upravit komponentu" : isDuplicating ? "Duplikovat komponentu" : t("components.addComponent")}
      subtitle={
        isEditing
          ? "Úprava údajů o komponentě v evidenci skladu"
          : isDuplicating
            ? "Nový kus podle existující komponenty — doplň cenu, datum a sériové číslo"
            : "Zaevidování nové komponenty do skladu"
      }
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <label htmlFor="comp-category" className="field-label">
            Kategorie komponenty *
          </label>
          <select
            id="comp-category"
            value={effectiveCategoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            className="field"
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
            <label htmlFor="comp-manufacturer" className="field-label">
              Výrobce *
            </label>
            <input
              id="comp-manufacturer"
              type="text"
              required
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              className="field"
            />
          </div>
          <div>
            <label htmlFor="comp-model" className="field-label">
              Model *
            </label>
            <input
              id="comp-model"
              type="text"
              required
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="field"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="comp-variant" className="field-label">
              Varianta / specifikace
            </label>
            <input
              id="comp-variant"
              type="text"
              value={variant}
              onChange={(e) => setVariant(e.target.value)}
              className="field"
            />
          </div>
          <div>
            <label htmlFor="comp-serial-number" className="field-label">
              Sériové číslo
            </label>
            <input
              id="comp-serial-number"
              type="text"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              className="field"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="comp-purchase-price" className="field-label">
              Nákupní cena (Kč)
            </label>
            <input
              id="comp-purchase-price"
              type="number"
              min="0"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              className="field"
            />
          </div>
          <div>
            <label htmlFor="comp-purchase-date" className="field-label">
              Datum nákupu
            </label>
            <input
              id="comp-purchase-date"
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="field"
            />
          </div>
        </div>

        {/* Vlastní pole specifikace podle zvolené kategorie */}
        {specFields.length > 0 && (
          <div className="panel panel-neutral space-y-2.5">
            <span className="text-xs font-semibold text-slate-700 block">
              Specifikace: {selectedCategory?.nameCs}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {specFields.map((field) => (
                <div key={field.key}>
                  <label htmlFor={`spec-${field.key}`} className="field-label">
                    {field.label}
                  </label>
                  <input
                    id={`spec-${field.key}`}
                    type="text"
                    value={specValues[field.key] || ""}
                    onChange={(e) => setSpecValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={`Zadejte ${field.label.toLowerCase()}...`}
                    className="field"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {isDamped && (
          <div>
            <span id="comp-adjusters-label" className="field-label">
              Nastavitelné tlumení
            </span>
            <div role="group" aria-labelledby="comp-adjusters-label" className="segmented inline-flex">
              {DAMPING_ADJUSTERS.map((a) => {
                const active = adjusters.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setAdjusters((prev) =>
                        active ? prev.filter((x) => x !== a) : DAMPING_ADJUSTERS.filter((x) => x === a || prev.includes(x)),
                      )
                    }
                    className="segment font-mono"
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="comp-notes" className="field-label">
            Poznámka
          </label>
          <textarea
            id="comp-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="field"
          />
        </div>

        <ModalFooter>
          <button
            type="button"
            onClick={() => onClose()}
            className="btn-secondary"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>{loading ? t("common.loading") : isEditing ? "Uložit změny komponenty" : "Uložit komponentu do skladu"}</span>
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

export default AddComponentModal;
