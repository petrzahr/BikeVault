"use client";

import React, { useState } from "react";
import { Sparkles, Check, Loader2 } from "lucide-react";
import { t } from "@/lib/i18n";
import { useVault } from "@/context/VaultContext";
import { Modal } from "@/components/common/Modal";

interface AddBikeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddBikeModal({ isOpen, onClose, onSuccess }: AddBikeModalProps) {
  const { addBike } = useVault();
  const [selectedPreset, setSelectedPreset] = useState<string>("mtbFull");
  const [name, setName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [modelYear, setModelYear] = useState<number>(new Date().getFullYear());
  const [category, setCategory] = useState("MTB");
  const [discipline, setDiscipline] = useState("ENDURO");
  const [suspensionType, setSuspensionType] = useState("FULL_SUSPENSION");
  const [driveType, setDriveType] = useState("CONVENTIONAL");
  const [serialNumber, setSerialNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [purchasePrice, setPurchasePrice] = useState<string>("95000");
  const [initialKm, setInitialKm] = useState<string>("0");
  const [initialHours, setInitialHours] = useState<string>("0");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePresetSelect = (presetKey: string) => {
    setSelectedPreset(presetKey);
    switch (presetKey) {
      case "mtbFull":
        setCategory("MTB");
        setDiscipline("ENDURO");
        setSuspensionType("FULL_SUSPENSION");
        setDriveType("CONVENTIONAL");
        break;
      case "mtbHardtail":
        setCategory("MTB");
        setDiscipline("TRAIL");
        setSuspensionType("FRONT_SUSPENSION");
        setDriveType("CONVENTIONAL");
        break;
      case "gravelRigid":
        setCategory("GRAVEL");
        setDiscipline("GRAVEL");
        setSuspensionType("RIGID");
        setDriveType("CONVENTIONAL");
        break;
      case "gravelSuspension":
        setCategory("GRAVEL");
        setDiscipline("GRAVEL");
        setSuspensionType("FRONT_SUSPENSION");
        setDriveType("CONVENTIONAL");
        break;
      case "road":
        setCategory("ROAD");
        setDiscipline("ROAD");
        setSuspensionType("RIGID");
        setDriveType("CONVENTIONAL");
        break;
      case "emtbFull":
        setCategory("MTB");
        setDiscipline("ENDURO");
        setSuspensionType("FULL_SUSPENSION");
        setDriveType("ELECTRIC");
        break;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !manufacturer.trim() || !model.trim()) {
      setError("Vyplňte prosím název, výrobce a model kola.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      addBike({
        name,
        manufacturer,
        model,
        modelYear: modelYear ? Number(modelYear) : undefined,
        category,
        discipline,
        suspensionType,
        driveType,
        serialNumber,
        purchaseDate,
        purchasePrice: parseFloat(purchasePrice || "0"),
        currency: "CZK",
        status: "ACTIVE",
        initialKm: parseFloat(initialKm || "0"),
        initialHours: parseFloat(initialHours || "0"),
        imageUrl: imageUrl.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      onClose();
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Nepodařilo se vytvořit kolo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("bike.addTitle")}
      subtitle="Založení nového kola do virtuální garáže"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Presets */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            <span>Rychlý výběr typu kola (Preset)</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: "mtbFull", label: t("bike.presets.mtbFull") },
              { id: "mtbHardtail", label: t("bike.presets.mtbHardtail") },
              { id: "gravelRigid", label: t("bike.presets.gravelRigid") },
              { id: "gravelSuspension", label: t("bike.presets.gravelSuspension") },
              { id: "road", label: t("bike.presets.road") },
              { id: "emtbFull", label: t("bike.presets.emtbFull") },
            ].map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => handlePresetSelect(p.id)}
                className={`px-3 py-2 text-xs font-medium rounded-xl border text-left transition-all ${
                  selectedPreset === p.id
                    ? "bg-sky-50 border-sky-300 text-sky-700 font-semibold shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Základní údaje */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t("bike.name")} *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="např. Propain Spindrift CF"
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t("bike.manufacturer")} *
            </label>
            <input
              type="text"
              required
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              placeholder="např. Propain, Canyon, Trek"
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t("bike.model")} *
            </label>
            <input
              type="text"
              required
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="např. Spindrift CF, Grizl CF SL"
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t("bike.modelYear")}
            </label>
            <input
              type="number"
              value={modelYear}
              onChange={(e) => setModelYear(parseInt(e.target.value, 10))}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 tabular-nums"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t("bike.serialNumber")}
            </label>
            <input
              type="text"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="Výrobní číslo rámu"
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>
        </div>

        {/* Klasifikace */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/70">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t("bike.category")}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-700"
            >
              <option value="MTB">MTB</option>
              <option value="GRAVEL">Gravel</option>
              <option value="ROAD">Silniční</option>
              <option value="CYCLOCROSS">Cyklokros</option>
              <option value="CITY_URBAN">Městské</option>
              <option value="TOURING">Touring</option>
              <option value="DIRT_PUMPTRACK">Dirt / Pumptrack</option>
              <option value="OTHER">Jiné</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t("bike.suspensionType")}
            </label>
            <select
              value={suspensionType}
              onChange={(e) => setSuspensionType(e.target.value)}
              className="w-full px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-700"
            >
              <option value="FULL_SUSPENSION">Celoodpružené</option>
              <option value="FRONT_SUSPENSION">Pouze přední (Hardtail)</option>
              <option value="RIGID">Pevné (Bez odpružení)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t("bike.driveType")}
            </label>
            <select
              value={driveType}
              onChange={(e) => setDriveType(e.target.value)}
              className="w-full px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-700"
            >
              <option value="CONVENTIONAL">Klasické</option>
              <option value="ELECTRIC">Elektrokolo (E-bike)</option>
            </select>
          </div>
        </div>

        {/* Nákup a výchozí počítadlo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t("bike.purchaseDate")} *
            </label>
            <input
              type="date"
              required
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t("bike.purchasePrice")} (Kč)
            </label>
            <input
              type="number"
              min="0"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 tabular-nums"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t("bike.initialKm")}
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={initialKm}
              onChange={(e) => setInitialKm(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 tabular-nums"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t("bike.initialHours")}
            </label>
            <input
              type="number"
              min="0"
              value={initialHours}
              onChange={(e) => setInitialHours(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 tabular-nums"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            URL fotografie kola (volitelné)
          </label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {t("bike.notes")}
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Poznámka ke kolu, komponentům nebo určení"
            className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-sm shadow-sky-200 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>{loading ? t("common.loading") : t("bike.save")}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default AddBikeModal;
