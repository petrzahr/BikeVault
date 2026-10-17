"use client";

import React, { useState, useEffect } from "react";
import { Check, Loader2, Upload, Trash2, Scale, Bike as BikeIcon, ArrowRight, ArrowLeft } from "lucide-react";
import { t } from "@/lib/i18n";
import { useVault } from "@/context/VaultContext";
import { Modal, ModalFooter } from "@/components/common/Modal";
import { Bike, ListOption } from "@/types/vault";
import { resolveLists } from "@/lib/bikeLists";
import {
  parseWeightInput,
  processImageFile,
  resolveBikeImage,
} from "@/lib/domain/bikeImage";
import { cn } from "@/lib/ui";

export interface BikeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  bikeToEdit?: Bike | null;
  initialData?: Partial<Bike> & { initialKm?: number; initialHours?: number; stravaGearId?: string } | null;
}

type BikeModalTab = "IDENTITY" | "SPECS" | "ACQUISITION";

const EMPTY_LABEL = "—";

export function BikeModal({ isOpen, onClose, onSuccess, bikeToEdit, initialData }: BikeModalProps) {
  const { data, addBike, updateBike } = useVault();
  const lists = resolveLists(data.settings);
  const isEditMode = Boolean(bikeToEdit);

  const [activeTab, setActiveTab] = useState<BikeModalTab>("IDENTITY");
  const [name, setName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [modelYear, setModelYear] = useState<number | string>(new Date().getFullYear());
  const [frameSize, setFrameSize] = useState("");
  const [category, setCategory] = useState("");
  const [discipline, setDiscipline] = useState("");
  // Zachová i uloženou hodnotu, která už v seznamu není, aby se při úpravě tiše nepřepsala
  const withCurrent = (options: ListOption[], current: string) =>
    !current || options.some((o) => o.value === current) ? options : [...options, { value: current, label: current }];
  const disciplineOptions = withCurrent(lists.disciplines[category] ?? [], discipline);
  const [suspensionType, setSuspensionType] = useState("");
  const [driveType, setDriveType] = useState("");
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

    setActiveTab("IDENTITY");
    if (bikeToEdit) {
      setName(bikeToEdit.name || "");
      setManufacturer(bikeToEdit.manufacturer || "");
      setModel(bikeToEdit.model || "");
      setModelYear(bikeToEdit.modelYear ?? "");
      setFrameSize(bikeToEdit.frameSize || "");
      setCategory(bikeToEdit.category || "");
      setDiscipline(bikeToEdit.discipline || "");
      setSuspensionType(bikeToEdit.suspensionType || "");
      setDriveType(bikeToEdit.driveType || "");
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
    } else if (initialData) {
      setName(initialData.name || "");
      setManufacturer(initialData.manufacturer || "");
      setModel(initialData.model || "");
      setModelYear(initialData.modelYear ?? new Date().getFullYear());
      setFrameSize(initialData.frameSize || "");
      setCategory(initialData.category || "");
      setDiscipline(initialData.discipline || "");
      setSuspensionType(initialData.suspensionType || "");
      setDriveType(initialData.driveType || "");
      setSerialNumber(initialData.serialNumber || "");
      setPurchaseDate(initialData.purchaseDate || new Date().toISOString().split("T")[0]);
      setPurchasePrice(
        initialData.purchasePrice !== undefined && initialData.purchasePrice !== null
          ? String(initialData.purchasePrice)
          : "0"
      );
      setInitialKm(
        initialData.initialKm !== undefined ? String(initialData.initialKm) : "0"
      );
      setInitialHours(
        initialData.initialHours !== undefined ? String(initialData.initialHours) : "0"
      );
      setWeightInput(
        initialData.weightKg !== undefined && initialData.weightKg !== null
          ? String(initialData.weightKg).replace(".", ",")
          : ""
      );
      setUploadedImage(initialData.uploadedImage || null);
      setImageUrl(initialData.imageUrl || "");
      setNotes(initialData.notes || "");
      setStatus(initialData.status || "ACTIVE");
    } else {
      setName("");
      setManufacturer("");
      setModel("");
      setModelYear(new Date().getFullYear());
      setFrameSize("");
      setCategory("");
      setDiscipline("");
      setSuspensionType("");
      setDriveType("");
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
  }, [isOpen, bikeToEdit, initialData]);

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

  const handleNextFromIdentity = () => {
    if (!name.trim() || !manufacturer.trim() || !model.trim()) {
      setError("Vyplňte prosím název, výrobce a model kola.");
      return;
    }
    const weightRes = parseWeightInput(weightInput);
    if (!weightRes.valid) {
      setError(weightRes.error || "Neplatná hodnota hmotnosti.");
      return;
    }
    setError(null);
    setActiveTab("SPECS");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !manufacturer.trim() || !model.trim()) {
      setError("Vyplňte prosím název, výrobce a model kola.");
      setActiveTab("IDENTITY");
      return;
    }

    const weightRes = parseWeightInput(weightInput);
    if (!weightRes.valid) {
      setError(weightRes.error || "Neplatná hodnota hmotnosti.");
      setActiveTab("IDENTITY");
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
          stravaGearId: bikeToEdit.stravaGearId,
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
          stravaGearId: initialData?.stravaGearId || undefined,
          initialOdometerSource: initialData?.stravaGearId ? "STRAVA" : "MANUAL",
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
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {error && (
          <div role="alert" className="panel panel-error font-medium">
            {error}
          </div>
        )}

        {/* Přepínač sekcí formuláře (Segmented Control) */}
        <div className="segmented flex">
          <button
            type="button"
            onClick={() => setActiveTab("IDENTITY")}
            aria-pressed={activeTab === "IDENTITY"}
            className="segment flex-1 px-2"
          >
            <span
              className={cn(
                "w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold shrink-0",
                activeTab === "IDENTITY" ? "bg-white text-navy-700" : "bg-slate-200 text-slate-700"
              )}
            >
              1
            </span>
            <span>Identita & Foto</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("SPECS")}
            aria-pressed={activeTab === "SPECS"}
            className="segment flex-1 px-2"
          >
            <span
              className={cn(
                "w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold shrink-0",
                activeTab === "SPECS" ? "bg-white text-navy-700" : "bg-slate-200 text-slate-700"
              )}
            >
              2
            </span>
            <span>Specifikace</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ACQUISITION")}
            aria-pressed={activeTab === "ACQUISITION"}
            className="segment flex-1 px-2"
          >
            <span
              className={cn(
                "w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold shrink-0",
                activeTab === "ACQUISITION" ? "bg-white text-navy-700" : "bg-slate-200 text-slate-700"
              )}
            >
              3
            </span>
            <span>Pořízení & Nájezd</span>
          </button>
        </div>

        {/* TAB 1: ZÁKLADNÍ IDENTIFIKAČNÍ ÚDAJE & FOTO (přesné logické pořadí polí 1–7) */}
        <div className={activeTab === "IDENTITY" ? "space-y-4" : "hidden"}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. Název kola */}
            <div className="sm:col-span-2">
              <label htmlFor="bike-name" className="field-label">
                {t("bike.name")} *
              </label>
              <input
                id="bike-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="field"
                placeholder="např. Santa Cruz Megatower"
              />
            </div>

            {/* 2. Výrobce */}
            <div>
              <label htmlFor="bike-manufacturer" className="field-label">
                {t("bike.manufacturer")} *
              </label>
              <input
                id="bike-manufacturer"
                type="text"
                required
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                className="field"
                placeholder="např. Santa Cruz"
              />
            </div>

            {/* 3. Model */}
            <div>
              <label htmlFor="bike-model" className="field-label">
                {t("bike.model")} *
              </label>
              <input
                id="bike-model"
                type="text"
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="field"
                placeholder="např. Megatower CC"
              />
            </div>

            {/* 4. Modelový rok */}
            <div>
              <label htmlFor="bike-model-year" className="field-label">
                {t("bike.modelYear")}
              </label>
              <input
                id="bike-model-year"
                type="number"
                value={modelYear}
                onChange={(e) => setModelYear(e.target.value ? parseInt(e.target.value, 10) : "")}
                className="field"
              />
            </div>

            {/* 5. Velikost rámu */}
            <div>
              <label htmlFor="bike-frame-size" className="field-label">
                Velikost rámu
              </label>
              <input
                id="bike-frame-size"
                type="text"
                value={frameSize}
                onChange={(e) => setFrameSize(e.target.value)}
                className="field"
                placeholder="např. L, XL, 56 cm"
              />
            </div>

            {/* 6. Sériové číslo rámu */}
            <div>
              <label htmlFor="bike-serial-number" className="field-label">
                Sériové číslo rámu
              </label>
              <input
                id="bike-serial-number"
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="field"
                placeholder="např. WSBC..."
              />
            </div>

            {/* 7. Hmotnost */}
            <div>
              <label htmlFor="bike-weight" className="field-label">
                <Scale className="w-3.5 h-3.5 text-slate-500" />
                <span>Hmotnost</span>
              </label>
              <div className="relative">
                <input
                  id="bike-weight"
                  type="text"
                  inputMode="decimal"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  className="field pr-10 tabular-nums"
                  placeholder="např. 14,8"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 pointer-events-none">
                  kg
                </span>
              </div>
            </div>
          </div>

          {/* Fotografie kola - nahrání souboru a náhled */}
          <div className="panel panel-neutral space-y-3">
            <label className="field-label">
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
                  <div className="flex flex-col items-center justify-center text-slate-500 p-2 text-center">
                    <BikeIcon className="w-8 h-8 mb-1 text-slate-400" />
                    <span className="text-xs text-slate-500 font-medium">Bez fotografie</span>
                  </div>
                )}
              </div>

              {/* Ovládací prvky pro nahrání a odebrání */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="btn-secondary">
                    <Upload className="w-3.5 h-3.5" />
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
                      className="btn-secondary btn-secondary-danger"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Odebrat fotografii</span>
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-500">
                  Podporované formáty: JPEG, PNG, WebP (max. 10 MB).
                  {uploadedImage && imageUrl && (
                    <span className="block text-navy-700 font-medium mt-0.5">
                      Nahraná fotografie má přednost před níže uvedenou URL adresou.
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Externí URL adresa fotografie */}
            <div className="pt-2 border-t border-slate-200">
              <label htmlFor="bike-image-url" className="field-label">
                URL fotografie kola (volitelné)
              </label>
              <input
                id="bike-image-url"
                type="url"
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setPreviewFailed(false);
                }}
                className="field"
                placeholder="https://..."
              />
            </div>
          </div>
        </div>

        {/* TAB 2: SPECIFIKACE A KLASIFIKACE */}
        <div className={activeTab === "SPECS" ? "space-y-4" : "hidden"}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 panel panel-neutral">
            <div>
              <label htmlFor="bike-category" className="field-label">
                {t("bike.category")}
              </label>
              <select
                id="bike-category"
                value={category}
                onChange={(e) => {
                  const next = e.target.value;
                  setCategory(next);
                  const allowed = lists.disciplines[next] ?? [];
                  if (!allowed.some((o) => o.value === discipline)) setDiscipline("");
                }}
                className="field"
              >
                <option value="">{EMPTY_LABEL}</option>
                {withCurrent(lists.bikeCategories, category).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="bike-discipline" className="field-label">
                {t("bike.discipline")}
              </label>
              <select
                id="bike-discipline"
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value)}
                className="field"
              >
                <option value="">{EMPTY_LABEL}</option>
                {disciplineOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="bike-suspension-type" className="field-label">
                {t("bike.suspensionType")}
              </label>
              <select
                id="bike-suspension-type"
                value={suspensionType}
                onChange={(e) => setSuspensionType(e.target.value)}
                className="field"
              >
                <option value="">{EMPTY_LABEL}</option>
                {withCurrent(lists.suspensionTypes, suspensionType).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="bike-drive-type" className="field-label">
                {t("bike.driveType")}
              </label>
              <select
                id="bike-drive-type"
                value={driveType}
                onChange={(e) => setDriveType(e.target.value)}
                className="field"
              >
                <option value="">{EMPTY_LABEL}</option>
                {withCurrent(lists.driveTypes, driveType).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Stav kola (pouze v editaci) */}
            {isEditMode && (
              <div className="sm:col-span-2 pt-2 border-t border-slate-200/60">
                <label htmlFor="bike-status" className="field-label">
                  Stav kola
                </label>
                <select
                  id="bike-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE" | "SOLD" | "ARCHIVED")}
                  className="field"
                >
                  <option value="ACTIVE">Aktivní</option>
                  <option value="INACTIVE">Neaktivní</option>
                  <option value="SOLD">Prodáno</option>
                  <option value="ARCHIVED">Archivováno</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* TAB 3: POŘÍZENÍ, NÁJEZD & POZNÁMKY */}
        <div className={activeTab === "ACQUISITION" ? "space-y-4" : "hidden"}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="bike-purchase-date" className="field-label">
                {t("bike.purchaseDate")} *
              </label>
              <input
                id="bike-purchase-date"
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="field"
              />
            </div>

            <div>
              <label htmlFor="bike-purchase-price" className="field-label">
                {t("bike.purchasePrice")} (Kč)
              </label>
              <input
                id="bike-purchase-price"
                type="number"
                min="0"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="field"
              />
            </div>

            {/* Výchozí nájezd (pouze při zakládání kola) */}
            {!isEditMode && (
              <>
                <div>
                  <label htmlFor="bike-initial-km" className="field-label">
                    {t("bike.initialKm")}
                  </label>
                  <input
                    id="bike-initial-km"
                    type="number"
                    step="0.1"
                    min="0"
                    value={initialKm}
                    onChange={(e) => setInitialKm(e.target.value)}
                    className="field"
                  />
                </div>

                <div>
                  <label htmlFor="bike-initial-hours" className="field-label">
                    {t("bike.initialHours")}
                  </label>
                  <input
                    id="bike-initial-hours"
                    type="number"
                    min="0"
                    value={initialHours}
                    onChange={(e) => setInitialHours(e.target.value)}
                    className="field"
                  />
                </div>
              </>
            )}
          </div>

          {/* Poznámky */}
          <div>
            <label htmlFor="bike-notes" className="field-label">
              {t("bike.notes")}
            </label>
            <textarea
              id="bike-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="field"
              placeholder="Poznámky k nákupu, záruce, specifické konfiguraci..."
            />
          </div>
        </div>

        {/* Tlačítka akcí s navigací kroků a přímým uložením */}
        <ModalFooter className="sm:justify-between">
          <div className="flex flex-col">
            {activeTab === "IDENTITY" ? (
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                {t("common.cancel")}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (activeTab === "SPECS") setActiveTab("IDENTITY");
                  if (activeTab === "ACQUISITION") setActiveTab("SPECS");
                }}
                className="btn-secondary"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>
                  {activeTab === "SPECS" ? "Zpět na identitu" : "Zpět na specifikace"}
                </span>
              </button>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2">
            {activeTab !== "ACQUISITION" ? (
              <>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-secondary"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{isEditMode ? "Uložit změny" : t("bike.save")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === "IDENTITY") {
                      handleNextFromIdentity();
                    } else if (activeTab === "SPECS") {
                      setActiveTab("ACQUISITION");
                    }
                  }}
                  className="btn-primary"
                >
                  <span>
                    {activeTab === "IDENTITY" ? "Další: Specifikace" : "Další: Pořízení"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary hidden sm:inline-flex"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>
                    {loading
                      ? t("common.loading")
                      : isEditMode
                      ? "Uložit změny kola"
                      : t("bike.save")}
                  </span>
                </button>
              </>
            )}
          </div>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export default BikeModal;
