"use client";

import React, { useState, useEffect } from "react";
import { Check, Loader2, Upload, Trash2, Scale, Bike as BikeIcon } from "lucide-react";
import { t } from "@/lib/i18n";
import { useVault } from "@/context/VaultContext";
import { Modal } from "@/components/common/Modal";
import { Bike } from "@/types/vault";
import {
  parseWeightInput,
  processImageFile,
  resolveBikeImage,
} from "@/lib/domain/bikeImage";

export interface BikeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  bikeToEdit?: Bike | null;
}

export function BikeModal({ isOpen, onClose, onSuccess, bikeToEdit }: BikeModalProps) {
  const { addBike, updateBike } = useVault();
  const isEditMode = Boolean(bikeToEdit);

  const [name, setName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [modelYear, setModelYear] = useState<number | string>(new Date().getFullYear());
  const [frameSize, setFrameSize] = useState("");
  const [category, setCategory] = useState("MTB");
  const [discipline, setDiscipline] = useState("ENDURO");
  const [suspensionType, setSuspensionType] = useState("FULL_SUSPENSION");
  const [driveType, setDriveType] = useState("CONVENTIONAL");
  const [serialNumber, setSerialNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [purchasePrice, setPurchasePrice] = useState<string>("95000");
  const [initialKm, setInitialKm] = useState<string>("0");
  const [initialHours, setInitialHours] = useState<string>("0");
  const [weightInput, setWeightInput] = useState<string>("");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE" | "SOLD" | "ARCHIVED">("ACTIVE");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);

  // Synchronizace formuláře při otevření nebo změně editovaného kola
  useEffect(() => {
    if (!isOpen) return;

    if (bikeToEdit) {
      setName(bikeToEdit.name || "");
      setManufacturer(bikeToEdit.manufacturer || "");
      setModel(bikeToEdit.model || "");
      setModelYear(bikeToEdit.modelYear ?? "");
      setFrameSize(bikeToEdit.frameSize || "");
      setCategory(bikeToEdit.category || "MTB");
      setDiscipline(bikeToEdit.discipline || "ENDURO");
      setSuspensionType(bikeToEdit.suspensionType || "FULL_SUSPENSION");
      setDriveType(bikeToEdit.driveType || "CONVENTIONAL");
      setSerialNumber(bikeToEdit.serialNumber || "");
      setPurchaseDate(bikeToEdit.purchaseDate || new Date().toISOString().split("T")[0]);
      setPurchasePrice(
        bikeToEdit.purchasePrice !== undefined && bikeToEdit.purchasePrice !== null
          ? String(bikeToEdit.purchasePrice)
          : "0"
      );
      setWeightInput(
        bikeToEdit.weightKg !== undefined && bikeToEdit.weightKg !== null
          ? String(bikeToEdit.weightKg).replace(".", ",")
          : ""
      );
      setUploadedImage(bikeToEdit.uploadedImage || bikeToEdit.uploadedImageData || null);
      setImageUrl(bikeToEdit.imageUrl || "");
      setNotes(bikeToEdit.notes || "");
      setStatus(bikeToEdit.status || "ACTIVE");
    } else {
      setName("");
      setManufacturer("");
      setModel("");
      setModelYear(new Date().getFullYear());
      setFrameSize("");
      setCategory("MTB");
      setDiscipline("ENDURO");
      setSuspensionType("FULL_SUSPENSION");
      setDriveType("CONVENTIONAL");
      setSerialNumber("");
      setPurchaseDate(new Date().toISOString().split("T")[0]);
      setPurchasePrice("95000");
      setInitialKm("0");
      setInitialHours("0");
      setWeightInput("");
      setUploadedImage(null);
      setImageUrl("");
      setNotes("");
      setStatus("ACTIVE");
    }
    setError(null);
    setPreviewFailed(false);
  }, [isOpen, bikeToEdit]);

  if (!isOpen) return null;

  // Určení náhledu s deterministickou prioritou: uploadedImage > imageUrl > null
  const currentPreviewSource = resolveBikeImage({
    uploadedImage,
    imageUrl: imageUrl.trim() || null,
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      const processedDataUrl = await processImageFile(file);
      setUploadedImage(processedDataUrl);
      setPreviewFailed(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Chyba při nahrávání obrázku.");
    } finally {
      // Vyresetování inputu pro možnost opětovného vybrání stejného souboru
      e.target.value = "";
    }
  };

  const handleRemoveUploadedImage = () => {
    setUploadedImage(null);
    setPreviewFailed(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !manufacturer.trim() || !model.trim()) {
      setError("Vyplňte prosím název, výrobce a model kola.");
      return;
    }

    const weightRes = parseWeightInput(weightInput);
    if (!weightRes.valid) {
      setError(weightRes.error || "Neplatná hodnota hmotnosti.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEditMode && bikeToEdit) {
        // EDIT MODE: aktualizace existujícího kola s přísným zachováním ID a historie
        updateBike(bikeToEdit.id, {
          name: name.trim(),
          manufacturer: manufacturer.trim(),
          model: model.trim(),
          modelYear: modelYear ? Number(modelYear) : null,
          frameSize: frameSize.trim() || null,
          serialNumber: serialNumber || null,
          category,
          discipline,
          suspensionType,
          driveType,
          purchaseDate,
          purchasePrice: parseFloat(purchasePrice || "0"),
          weightKg: weightRes.value,
          uploadedImage: uploadedImage || null,
          uploadedImageData: uploadedImage || null,
          imageUrl: imageUrl.trim() || null,
          notes: notes.trim() || null,
          status,
        });
      } else {
        // CREATE MODE: založení nového kola
        addBike({
          name: name.trim(),
          manufacturer: manufacturer.trim(),
          model: model.trim(),
          modelYear: modelYear ? Number(modelYear) : undefined,
          frameSize: frameSize.trim() || undefined,
          serialNumber: serialNumber || undefined,
          category,
          discipline,
          suspensionType,
          driveType,
          purchaseDate,
          purchasePrice: parseFloat(purchasePrice || "0"),
          currency: "CZK",
          status: "ACTIVE",
          initialKm: parseFloat(initialKm || "0"),
          initialHours: parseFloat(initialHours || "0"),
          weightKg: weightRes.value,
          uploadedImage: uploadedImage || undefined,
          uploadedImageData: uploadedImage || undefined,
          imageUrl: imageUrl.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      }

      onClose();
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Operace se nezdařila.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? "Upravit kolo" : t("bike.addTitle")}
      subtitle={
        isEditMode
          ? "Úprava parametrů a specifikací existujícího kola"
          : "Založení nového kola do virtuální garáže"
      }
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Základní identifikační údaje (přesné logické pořadí 1–7) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* 1. Název kola */}
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

          {/* 2. Výrobce */}
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

          {/* 3. Model */}
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

          {/* 4. Modelový rok */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t("bike.modelYear")}
            </label>
            <input
              type="number"
              value={modelYear}
              onChange={(e) => setModelYear(e.target.value ? parseInt(e.target.value, 10) : "")}
              placeholder="2024"
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 tabular-nums"
            />
          </div>

          {/* 5. Velikost rámu */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Velikost rámu
            </label>
            <input
              type="text"
              value={frameSize}
              onChange={(e) => setFrameSize(e.target.value)}
              placeholder="např. L, 56, M/L"
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          {/* 6. Sériové číslo rámu */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Sériové číslo rámu
            </label>
            <input
              type="text"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="Výrobní číslo rámu"
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          {/* 7. Hmotnost */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-slate-400" />
              <span>Hmotnost</span>
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                placeholder="např. 15,8"
                className="w-full pl-3.5 pr-10 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 tabular-nums"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                kg
              </span>
            </div>
          </div>
        </div>

        {/* Klasifikace */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/70">
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

          {/* Stav kola (pouze v editaci) */}
          {isEditMode && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Stav kola
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE" | "SOLD" | "ARCHIVED")}
                className="w-full px-2.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-700"
              >
                <option value="ACTIVE">Aktivní</option>
                <option value="INACTIVE">Neaktivní</option>
                <option value="SOLD">Prodáno</option>
                <option value="ARCHIVED">Archivováno</option>
              </select>
            </div>
          )}

          {/* Výchozí nájezd (pouze při zakládání kola) */}
          {!isEditMode && (
            <>
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
            </>
          )}
        </div>

        {/* Fotografie kola - nahrání souboru a náhled */}
        <div className="space-y-3 p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
          <label className="block text-xs font-semibold text-slate-700">
            Fotografie kola
          </label>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Náhled fotografie */}
            <div className="relative w-28 h-20 sm:w-32 sm:h-24 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center">
              {currentPreviewSource && !previewFailed ? (
                <img
                  src={currentPreviewSource}
                  alt="Náhled fotografie kola"
                  onError={() => setPreviewFailed(true)}
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                  <BikeIcon className="w-8 h-8 mb-1 text-slate-300" />
                  <span className="text-[10px] text-slate-400 font-medium">Bez fotografie</span>
                </div>
              )}
            </div>

            {/* Ovládací prvky pro nahrání a odebrání */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <label className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200/80 shadow-xs cursor-pointer transition-all flex items-center gap-1.5 active:scale-95">
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>{uploadedImage ? "Změnit soubor" : "Nahrát fotografii"}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                </label>

                {uploadedImage && (
                  <button
                    type="button"
                    onClick={handleRemoveUploadedImage}
                    className="px-3 py-2 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 text-xs font-semibold rounded-xl border border-rose-200/80 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Odebrat fotku</span>
                  </button>
                )}
              </div>

              <p className="text-[11px] text-slate-500">
                Podporované formáty: JPEG, PNG, WebP (max. 10 MB).
                {uploadedImage && imageUrl && (
                  <span className="block text-sky-600 font-medium mt-0.5">
                    Nahraná fotografie má přednost před níže uvedenou URL adresou.
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Externí URL adresa fotografie */}
          <div className="pt-2 border-t border-slate-200/60">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              URL fotografie kola (volitelné)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value);
                setPreviewFailed(false);
              }}
              placeholder="https://..."
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>
        </div>

        {/* Poznámky */}
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

        {/* Tlačítka akcí */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-sm shadow-sky-200 transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer active:scale-95"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>
              {loading
                ? t("common.loading")
                : isEditMode
                ? "Uložit změny"
                : t("bike.save")}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default BikeModal;
