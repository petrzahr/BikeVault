"use client";

import React, { useState } from "react";
import { createBikeAction } from "@/app/actions/bikes";
import { X, Bike, Check, Sparkles } from "lucide-react";
import { t } from "@/lib/i18n";

interface AddBikeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddBikeModal({ isOpen, onClose, onSuccess }: AddBikeModalProps) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !manufacturer.trim() || !model.trim()) {
      setError("Vyplňte prosím název, výrobce a model kola.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createBikeAction({
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
        initialKm: parseFloat(initialKm || "0"),
        initialHours: parseFloat(initialHours || "0"),
        imageUrl: imageUrl.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err?.message || "Nepodařilo se vytvořit kolo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl my-8 overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{t("bike.addTitle")}</h3>
              <p className="text-xs text-slate-500">Založení nového kola do virtuální garáže</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
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
                      ? "bg-blue-50 border-blue-300 text-blue-700 font-semibold shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Základní údaje */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                {t("bike.name")} *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="např. Propain Spindrift CF"
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                {t("bike.manufacturer")} *
              </label>
              <input
                type="text"
                required
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="např. Propain, Canyon, Trek"
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                {t("bike.model")} *
              </label>
              <input
                type="text"
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="např. Spindrift CF, Grizl CF SL"
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                {t("bike.modelYear")}
              </label>
              <input
                type="number"
                value={modelYear}
                onChange={(e) => setModelYear(parseInt(e.target.value, 10))}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-mono shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                {t("bike.serialNumber")}
              </label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="Výrobní číslo rámu"
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-mono shadow-sm"
              />
            </div>
          </div>

          {/* Klasifikace */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                {t("bike.category")}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
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
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                {t("bike.suspensionType")}
              </label>
              <select
                value={suspensionType}
                onChange={(e) => setSuspensionType(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              >
                <option value="FULL_SUSPENSION">Celoodpružené</option>
                <option value="FRONT_SUSPENSION">Pouze přední (Hardtail)</option>
                <option value="RIGID">Pevné (Bez odpružení)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                {t("bike.driveType")}
              </label>
              <select
                value={driveType}
                onChange={(e) => setDriveType(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              >
                <option value="CONVENTIONAL">Klasické</option>
                <option value="ELECTRIC">Elektrokolo (E-bike)</option>
              </select>
            </div>
          </div>

          {/* Nákup a výchozí počítadlo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                {t("bike.purchaseDate")} *
              </label>
              <input
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                {t("bike.purchasePrice")} (Kč)
              </label>
              <input
                type="number"
                min="0"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-mono shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                {t("bike.initialKm")}
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={initialKm}
                onChange={(e) => setInitialKm(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-mono shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                {t("bike.initialHours")}
              </label>
              <input
                type="number"
                min="0"
                value={initialHours}
                onChange={(e) => setInitialHours(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-mono shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              URL fotografie kola (volitelné)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              {t("bike.notes")}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Poznámka ke kolu, komponentům nebo určení"
              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors font-medium"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2 active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? t("common.loading") : t("bike.save")}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
