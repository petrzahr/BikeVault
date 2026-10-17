"use client";

import React, { useState } from "react";
import { BikeHeader } from "@/components/bike/BikeHeader";
import { 
  Layers, 
  Plus, 
  ArrowRightLeft, 
  RefreshCw, 
  Archive, 
  Clock, 
  Check, 
  X,
  ExternalLink,
  Ban,
  Loader2
} from "lucide-react";
import { t, formatKm, formatMinutes, formatCzk, formatDateCs } from "@/lib/i18n";
import { calculateInstallationUsage } from "@/lib/domain/odometer";
import { useVault } from "@/context/VaultContext";
import { useFeedback } from "@/components/common/Feedback";
import { findStorageReplacements } from "@/lib/domain/replacement";
import { QuickReplaceModal } from "@/components/garage/QuickReplaceModal";
import { Modal, ModalFooter } from "@/components/common/Modal";
import Link from "next/link";
import { sortCategoriesAz } from "@/lib/bikeLists";

interface BikeComponentsClientProps {
  bike: any;
  installedComponents?: any[];
  allBikes?: any[];
  storageComponents?: any[];
  categories?: any[];
}

export function BikeComponentsClient({
  bike,
  installedComponents: propInstalledComponents,
  allBikes: propAllBikes,
  storageComponents: propStorageComponents,
  categories: propCategories,
}: BikeComponentsClientProps) {
  const { 
    data, 
    removeComponent, 
    transferComponent, 
    installComponent, 
    quickReplaceComponent, 
    getBikeInstalledComponents, 
    getStorageComponents, 
    getGarageBikes 
  } = useVault();
  const { toast } = useFeedback();

  const installedComponents = propInstalledComponents ?? getBikeInstalledComponents(bike.id);
  const allBikes = propAllBikes ?? getGarageBikes();
  const storageComponents = propStorageComponents ?? getStorageComponents();
  const categories = sortCategoriesAz(propCategories ?? data.categories);

  // Modals state
  const [selectedInst, setSelectedInst] = useState<any>(null);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isInstallOpen, setIsInstallOpen] = useState(false);

  // Quick Replace Modal state
  const [isReplaceOpen, setIsReplaceOpen] = useState(false);
  const [selectedReplaceItem, setSelectedReplaceItem] = useState<any>(null);
  const [replaceCandidates, setReplaceCandidates] = useState<any[]>([]);
  const [replaceLoading, setReplaceLoading] = useState(false);

  // Form states for Remove
  const [disposition, setDisposition] = useState<"IN_STORAGE" | "SOLD" | "DAMAGED" | "DISCARDED">("IN_STORAGE");
  const [salePrice, setSalePrice] = useState<string>("");
  const [saleDate, setSaleDate] = useState<string>(new Date().toISOString().split("T")[0]);

  // Form states for Transfer
  const [targetBikeId, setTargetBikeId] = useState<string>("");
  const [targetSlot, setTargetSlot] = useState<string>("");

  // Form states for Install
  const [selectedStorageCompId, setSelectedStorageCompId] = useState<string>("");
  const [installSlot, setInstallSlot] = useState<string>("");

  const [loading, setLoading] = useState(false);

  const handleQuickReplace = async (replacementComponentId: string) => {
    if (!selectedReplaceItem) return;
    setReplaceLoading(true);
    try {
      quickReplaceComponent(
        bike.id,
        selectedReplaceItem.installation.id,
        replacementComponentId
      );
      setIsReplaceOpen(false);
      setSelectedReplaceItem(null);
      setReplaceCandidates([]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Chyba při výměně komponentu.";
      toast(msg, "error");
    } finally {
      setReplaceLoading(false);
    }
  };

  // Handlers
  const handleRemove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInst) return;
    setLoading(true);
    try {
      removeComponent(
        selectedInst.installation.id,
        disposition,
        salePrice ? parseFloat(salePrice) : undefined,
        disposition === "SOLD" ? saleDate : undefined
      );
      setIsRemoveOpen(false);
      setSelectedInst(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Chyba při demontáži komponentu.";
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInst || !targetBikeId) return;
    setLoading(true);
    try {
      transferComponent(
        selectedInst.installation.id,
        targetBikeId,
        targetSlot || selectedInst.installation.slot
      );
      setIsTransferOpen(false);
      setSelectedInst(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Chyba při přesunu komponentu.";
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStorageCompId || !installSlot) return;
    setLoading(true);
    try {
      installComponent(bike.id, selectedStorageCompId, installSlot);
      setIsInstallOpen(false);
      setSelectedStorageCompId("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Chyba při montáži komponentu.";
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const otherBikes = allBikes.filter((b) => b.id !== bike.id && b.status === "ACTIVE");

  return (
    <div className="space-y-6 animate-fade-in">
      <BikeHeader bike={bike} />

      {/* Header Bar */}
      <div className="card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            {t("components.installed")} ({installedComponents.length})
          </h2>
        </div>

        <button
          onClick={() => setIsInstallOpen(true)}
          className="btn-primary self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Namontovat komponent</span>
        </button>
      </div>

      {/* Installed Components List */}
      {installedComponents.length === 0 ? (
        <div className="card empty-state py-12">
          <p>Na tomto kole zatím nejsou evidovány žádné osazené komponenty.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {installedComponents.map((item) => {
            const usage = calculateInstallationUsage(
              Number(item.installation.installedBikeKm),
              item.installation.installedBikeMinutes,
              item.installation.removedBikeKm ? Number(item.installation.removedBikeKm) : null,
              item.installation.removedBikeMinutes,
              Number(bike.currentKm),
              bike.currentMinutes
            );

            const matchingCandidates = findStorageReplacements(
              item.component,
              item.category?.code,
              storageComponents
            );
            const hasMatchingStorage = matchingCandidates.length > 0;

            return (
              <div
                key={item.installation.id}
                className="card p-4 sm:p-5 flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="chip chip-neutral">
                      {item.category.nameCs}
                    </span>
                    <span className="text-xs text-slate-500 font-medium tabular-nums">
                      namontováno {formatDateCs(item.installation.installedAt)}
                    </span>
                  </div>

                  <Link href={`/components/${item.component.id}`} className="block group/title">
                    <h3 className="text-sm font-bold text-slate-900 group-hover/title:text-navy-600 transition-colors">
                      {item.component.manufacturer} {item.component.model}
                    </h3>
                  </Link>
                  {item.component.variant && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {item.component.variant}
                    </p>
                  )}

                  {item.component.tireCasing && (
                    <p className="text-xs text-slate-600 tabular-nums mt-1 font-medium">
                      {item.component.tireCasing} • {item.component.tireCompound || ""}
                    </p>
                  )}
                </div>

                {/* Usage metrics for this installation */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl">
                  <div>
                    <span className="section-label block">
                      Nájezd na tomto kole
                    </span>
                    <span className="text-base font-bold text-slate-900 tabular-nums">
                      {formatKm(usage.usageKm)}
                    </span>
                  </div>
                  <div>
                    <span className="section-label block">
                      Odjeto hodin
                    </span>
                    <span className="text-base font-bold text-slate-900 tabular-nums">
                      {formatMinutes(usage.usageMinutes)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedInst(item);
                        setTargetSlot(item.installation.slot);
                        setIsTransferOpen(true);
                      }}
                      className="btn-secondary btn-sm"
                      title="Přesunout na jiné kolo"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>Přesunout</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedInst(item);
                        setIsRemoveOpen(true);
                      }}
                      className="btn-secondary btn-sm"
                      title="Sundat do skladu / prodat / vyřadit"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>Demontovat</span>
                    </button>

                    {/* Quick Replace Action: Vyměnit */}
                    {hasMatchingStorage ? (
                      <button
                        onClick={() => {
                          setSelectedReplaceItem(item);
                          setReplaceCandidates(matchingCandidates);
                          setIsReplaceOpen(true);
                        }}
                        className="btn-secondary btn-sm"
                        title={
                          matchingCandidates.length === 1
                            ? "Rychle vyměnit za identický kus ze skladu (1 ks skladem)"
                            : `Rychle vyměnit za identický kus ze skladu (${matchingCandidates.length} ks skladem)`
                        }
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>
                          Vyměnit {matchingCandidates.length > 1 ? `(${matchingCandidates.length})` : ""}
                        </span>
                      </button>
                    ) : (
                      <div className="relative group inline-block">
                        <button
                          type="button"
                          disabled
                          aria-disabled="true"
                          aria-label="Vyměnit: Není k dispozici stejný komponent skladem."
                          className="btn-secondary btn-sm select-none"
                        >
                          <Ban className="w-3.5 h-3.5 shrink-0" />
                          <span>Vyměnit</span>
                        </button>

                        {/* Accessible Tooltip */}
                        <div 
                          role="tooltip"
                          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex group-focus-within:flex flex-col items-center z-30 pointer-events-none"
                        >
                          <div className="bg-slate-900 text-white text-xs font-medium px-2.5 py-1 rounded-md whitespace-nowrap shadow-lg">
                            Není k dispozici stejný komponent skladem.
                          </div>
                          <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1" />
                        </div>
                      </div>
                    )}
                  </div>

                  <Link
                    href={`/components/${item.component.id}`}
                    className="btn-text"
                  >
                    <span>Detail</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: DEMONTOVAT KOMPONENTU */}
      <Modal
        isOpen={isRemoveOpen && !!selectedInst}
        onClose={() => setIsRemoveOpen(false)}
        title="Demontovat komponentu"
        subtitle={selectedInst ? `${selectedInst.component.manufacturer} ${selectedInst.component.model}` : undefined}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleRemove} className="space-y-4">
          <div>
            <label className="field-label">
              Nový stav komponenty po demontáži
            </label>
            <div className="space-y-2">
              {[
                { id: "IN_STORAGE", label: "Ponechat funkční skladem (pro budoucí použití)" },
                { id: "SOLD", label: "Prodáno (zaznamenat prodejní cenu a příjem)" },
                { id: "DAMAGED", label: "Poškozeno (nefunkční / vyžaduje servis)" },
                { id: "DISCARDED", label: "Vyřazeno / Recyklace (opotřebováno)" },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className="option-card items-center"
                >
                  <input
                    type="radio"
                    name="disposition"
                    value={opt.id}
                    checked={disposition === opt.id}
                    onChange={() => setDisposition(opt.id as any)}
                    className="text-navy-600 focus:ring-0"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {disposition === "SOLD" && (
            <div className="panel panel-neutral grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
              <div>
                <label htmlFor="sale-price" className="field-label">
                  Prodejní cena (Kč)
                </label>
                <input
                  id="sale-price"
                  type="number"
                  required
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className="field"
                />
              </div>
              <div>
                <label htmlFor="sale-date" className="field-label">
                  Datum prodeje
                </label>
                <input
                  id="sale-date"
                  type="date"
                  required
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="field"
                />
              </div>
            </div>
          )}

          <ModalFooter>
            <button
              type="button"
              onClick={() => setIsRemoveOpen(false)}
              className="btn-secondary"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t("common.loading")}</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Demontovat komponentu</span>
                </>
              )}
            </button>
          </ModalFooter>
        </form>
      </Modal>

      {/* MODAL: PŘESUNOUT NA JINÉ KOLO */}
      <Modal
        isOpen={isTransferOpen && !!selectedInst}
        onClose={() => setIsTransferOpen(false)}
        title="Přesunout komponentu na jiné kolo"
        subtitle={selectedInst ? `${selectedInst.component.manufacturer} ${selectedInst.component.model}` : undefined}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleTransfer} className="space-y-4">
          <div>
            <label htmlFor="transfer-target-bike" className="field-label">
              Cílové kolo
            </label>
            {otherBikes.length === 0 ? (
              <p className="panel panel-warning">
                V garáži nemáte žádné další aktivní kolo. Pro přesun musíte nejprve založit druhé kolo.
              </p>
            ) : (
              <select
                id="transfer-target-bike"
                required
                value={targetBikeId}
                onChange={(e) => setTargetBikeId(e.target.value)}
                className="field"
              >
                <option value="">-- Vyberte cílové kolo --</option>
                {otherBikes.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}{b.category ? ` (${b.category})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label htmlFor="transfer-target-slot" className="field-label">
              Pozice na cílovém kole
            </label>
            <select
              id="transfer-target-slot"
              value={targetSlot}
              onChange={(e) => setTargetSlot(e.target.value)}
              className="field"
            >
              <option value="">— Ponechat původní pozici —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.defaultSlot || c.code}>
                  {c.nameCs}
                </option>
              ))}
            </select>
          </div>

          <ModalFooter>
            <button
              type="button"
              onClick={() => setIsTransferOpen(false)}
              className="btn-secondary"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={loading || otherBikes.length === 0 || !targetBikeId}
              className="btn-primary"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t("common.loading")}</span>
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>Přesunout komponentu</span>
                </>
              )}
            </button>
          </ModalFooter>
        </form>
      </Modal>

      {/* MODAL: NAMONTOVAT ZE SKLADU */}
      <Modal
        isOpen={isInstallOpen}
        onClose={() => setIsInstallOpen(false)}
        title="Namontovat komponentu na kolo"
        subtitle={bike.name}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleInstall} className="space-y-4">
          <div>
            <label htmlFor="install-comp-select" className="field-label">
              Vyberte komponentu ze skladu
            </label>
            {storageComponents.length === 0 ? (
              <div className="panel panel-neutral space-y-2">
                <p>Ve skladu nemáte žádné volné komponenty.</p>
                <Link
                  href="/components"
                  className="btn-text"
                >
                  Přejít do skladu a přidat komponentu →
                </Link>
              </div>
            ) : (
              <select
                id="install-comp-select"
                required
                value={selectedStorageCompId}
                onChange={(e) => setSelectedStorageCompId(e.target.value)}
                className="field"
              >
                <option value="">-- Vyberte komponentu ze skladu --</option>
                {storageComponents.map((item) => {
                  const c = item.component || item;
                  return (
                    <option key={c.id} value={c.id}>
                      {c.manufacturer} {c.model} {c.variant ? `(${c.variant})` : ""}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          <div>
            <label htmlFor="install-slot-select" className="field-label">
              Pozice na kole
            </label>
            <select
              id="install-slot-select"
              value={installSlot}
              onChange={(e) => setInstallSlot(e.target.value)}
              required
              className="field"
            >
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.defaultSlot || c.code}>
                  {c.nameCs}
                </option>
              ))}
            </select>
          </div>

          <ModalFooter>
            <button
              type="button"
              onClick={() => setIsInstallOpen(false)}
              className="btn-secondary"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={loading || storageComponents.length === 0 || !selectedStorageCompId}
              className="btn-primary"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t("common.loading")}</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Namontovat na kolo</span>
                </>
              )}
            </button>
          </ModalFooter>
        </form>
      </Modal>

      {/* MODAL: RYCHLÁ VÝMĚNA KOMPONENTU (VYMĚNIT) */}
      {isReplaceOpen && selectedReplaceItem && (
        <QuickReplaceModal
          isOpen={isReplaceOpen}
          onClose={() => {
            setIsReplaceOpen(false);
            setSelectedReplaceItem(null);
            setReplaceCandidates([]);
          }}
          bike={bike}
          installedItem={selectedReplaceItem}
          matchingCandidates={replaceCandidates}
          onConfirm={handleQuickReplace}
          loading={replaceLoading}
        />
      )}
    </div>
  );
}
