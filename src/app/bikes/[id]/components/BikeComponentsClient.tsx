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
  Ban
} from "lucide-react";
import { t, formatKm, formatMinutes, formatCzk, formatDateCs } from "@/lib/i18n";
import { calculateInstallationUsage } from "@/lib/domain/odometer";
import { useVault } from "@/context/VaultContext";
import { findStorageReplacements } from "@/lib/domain/replacement";
import { QuickReplaceModal } from "@/components/garage/QuickReplaceModal";
import Link from "next/link";

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

  const installedComponents = propInstalledComponents ?? getBikeInstalledComponents(bike.id);
  const allBikes = propAllBikes ?? getGarageBikes();
  const storageComponents = propStorageComponents ?? getStorageComponents();
  const categories = propCategories ?? data.categories;

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
  const [installSlot, setInstallSlot] = useState<string>("CHAIN");

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
      alert(msg);
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
      alert(msg);
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
      alert(msg);
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
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const otherBikes = allBikes.filter((b) => b.id !== bike.id && b.status === "ACTIVE");

  return (
    <div className="space-y-8 animate-fade-in">
      <BikeHeader bike={bike} />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {t("components.installed")} ({installedComponents.length})
          </h2>
          <p className="text-xs text-slate-500">
            Fyzické komponenty osazené na kole a jejich aktuální nájezd
          </p>
        </div>

        <button
          onClick={() => setIsInstallOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Namontovat komponent</span>
        </button>
      </div>

      {/* Installed Components List */}
      {installedComponents.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
          <p className="text-slate-500 text-sm">Na tomto kole zatím nejsou evidovány žádné osazené komponenty.</p>
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
                className="bg-white border border-slate-200 hover:border-slate-300 p-5 rounded-2xl flex flex-col justify-between space-y-4 shadow-sm transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200 tracking-wide">
                      {item.category.nameCs}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      namontováno {formatDateCs(item.installation.installedAt)}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    {item.component.manufacturer} {item.component.model}
                  </h3>
                  {item.component.variant && (
                    <p className="text-xs text-slate-500">
                      {item.component.variant}
                    </p>
                  )}

                  {item.component.tireCasing && (
                    <p className="text-xs text-blue-700 font-mono mt-1 font-medium">
                      {item.component.tireCasing} • {item.component.tireCompound || ""}
                    </p>
                  )}
                </div>

                {/* Usage metrics for this installation */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                      Nájezd na tomto kole
                    </span>
                    <span className="text-base font-bold text-slate-900 font-mono">
                      {formatKm(usage.usageKm)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                      Odjeto hodin
                    </span>
                    <span className="text-base font-bold text-slate-900 font-mono">
                      {formatMinutes(usage.usageMinutes)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedInst(item);
                        setTargetSlot(item.installation.slot);
                        setIsTransferOpen(true);
                      }}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1.5 transition-colors font-medium"
                      title="Přesunout na jiné kolo"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
                      <span>Přesunout</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedInst(item);
                        setIsRemoveOpen(true);
                      }}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1.5 transition-colors font-medium"
                      title="Sundat do skladu / prodat / vyřadit"
                    >
                      <Archive className="w-3.5 h-3.5 text-slate-500" />
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
                        className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 rounded-lg flex items-center gap-1.5 transition-colors font-medium cursor-pointer shadow-xs"
                        title={
                          matchingCandidates.length === 1
                            ? "Rychle vyměnit za identický kus ze skladu (1 ks skladem)"
                            : `Rychle vyměnit za identický kus ze skladu (${matchingCandidates.length} ks skladem)`
                        }
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
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
                          className="px-2.5 py-1.5 bg-slate-100/70 text-slate-400 border border-slate-200 rounded-lg flex items-center gap-1.5 font-medium text-xs cursor-not-allowed select-none"
                        >
                          <Ban className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span>Vyměnit</span>
                        </button>

                        {/* Accessible Tooltip */}
                        <div 
                          role="tooltip"
                          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex group-focus-within:flex flex-col items-center z-30 pointer-events-none"
                        >
                          <div className="bg-slate-900 text-white text-[11px] font-normal px-2.5 py-1 rounded-md whitespace-nowrap shadow-lg">
                            Není k dispozici stejný komponent skladem.
                          </div>
                          <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1" />
                        </div>
                      </div>
                    )}
                  </div>

                  <Link
                    href={`/components/${item.component.id}`}
                    className="text-slate-500 hover:text-blue-600 flex items-center gap-1 font-medium transition-colors"
                  >
                    <span>Detail</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: DEMONTOVAT KOMPONENT */}
      {isRemoveOpen && selectedInst && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Demontovat komponent</h3>
                <p className="text-xs text-slate-500">{selectedInst.component.manufacturer} {selectedInst.component.model}</p>
              </div>
              <button onClick={() => setIsRemoveOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleRemove} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Kam komponent přesunout?
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
                      className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        disposition === opt.id
                          ? "bg-blue-50/70 border-blue-500 text-blue-950 font-medium"
                          : "bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="disposition"
                        value={opt.id}
                        checked={disposition === opt.id}
                        onChange={() => setDisposition(opt.id as any)}
                        className="text-blue-600 focus:ring-0"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {disposition === "SOLD" && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 animate-fade-in">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Prodejní cena (Kč)
                    </label>
                    <input
                      type="number"
                      required
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value)}
                      placeholder="např. 6000"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Datum prodeje
                    </label>
                    <input
                      type="date"
                      required
                      value={saleDate}
                      onChange={(e) => setSaleDate(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRemoveOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
                >
                  {loading ? t("common.loading") : "Potvrdit demontáž"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PŘESUNOUT NA JINÉ KOLO */}
      {isTransferOpen && selectedInst && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Přesunout komponent na jiné kolo</h3>
                <p className="text-xs text-slate-500">{selectedInst.component.manufacturer} {selectedInst.component.model}</p>
              </div>
              <button onClick={() => setIsTransferOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleTransfer} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Cílové kolo
                </label>
                {otherBikes.length === 0 ? (
                  <p className="text-xs text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200">
                    V garáži nemáte žádné další aktivní kolo. Pro přesun musíte nejprve založit druhé kolo.
                  </p>
                ) : (
                  <select
                    required
                    value={targetBikeId}
                    onChange={(e) => setTargetBikeId(e.target.value)}
                    className="w-full bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  >
                    <option value="">-- Vyberte cílové kolo --</option>
                    {otherBikes.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.category})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Pozice / Slot na cílovém kole
                </label>
                <select
                  value={targetSlot}
                  onChange={(e) => setTargetSlot(e.target.value)}
                  className="w-full bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.defaultSlot || c.code}>
                      {c.nameCs}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTransferOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={loading || otherBikes.length === 0 || !targetBikeId}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
                >
                  {loading ? t("common.loading") : "Provést přesun"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NAMONTOVAT ZE SKLADU */}
      {isInstallOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Namontovat díl na kolo</h3>
                <p className="text-xs text-slate-500">{bike.name}</p>
              </div>
              <button onClick={() => setIsInstallOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleInstall} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Vyberte díl ze skladu
                </label>
                {storageComponents.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
                    <p>Ve skladu nemáte žádné volné komponenty.</p>
                    <Link
                      href="/components"
                      className="text-blue-600 hover:underline block font-semibold"
                    >
                      Přejít do Centrálního skladu a přidat komponent →
                    </Link>
                  </div>
                ) : (
                  <select
                    required
                    value={selectedStorageCompId}
                    onChange={(e) => setSelectedStorageCompId(e.target.value)}
                    className="w-full bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  >
                    <option value="">-- Vyberte komponent ze skladu --</option>
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
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Slot na kole
                </label>
                <select
                  value={installSlot}
                  onChange={(e) => setInstallSlot(e.target.value)}
                  className="w-full bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.defaultSlot || c.code}>
                      {c.nameCs}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsInstallOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={loading || storageComponents.length === 0 || !selectedStorageCompId}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
                >
                  {loading ? t("common.loading") : "Namontovat"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
