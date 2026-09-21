"use client";

import React, { useState } from "react";
import { 
  Plus, 
  Search, 
  Loader2,
  Check
} from "lucide-react";
import { t, formatCzk } from "@/lib/i18n";
import { useVault } from "@/context/VaultContext";
import { useFeedback } from "@/components/common/Feedback";
import Link from "next/link";
import { Modal } from "@/components/common/Modal";
import { buttonClass, inputClass, labelClass, cn } from "@/lib/ui";

interface ComponentsClientProps {
  initialComponents?: any[];
  categories?: any[];
}

export function ComponentsClient({
  initialComponents: propComponents,
  categories: propCategories,
}: ComponentsClientProps = {}) {
  const { data, addComponent, getAllComponents } = useVault();
  const { toast } = useFeedback();
  const initialComponents = propComponents ?? getAllComponents();
  const categories = propCategories ?? data.categories;
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states for Add Component
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
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

  // Filtered components
  const filtered = initialComponents.filter((item) => {
    const comp = item.component;
    if (filterStatus !== "ALL" && comp.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchMan = comp.manufacturer.toLowerCase().includes(q);
      const matchMod = comp.model.toLowerCase().includes(q);
      const matchCat = item.category?.nameCs?.toLowerCase().includes(q);
      return matchMan || matchMod || matchCat;
    }
    return true;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manufacturer.trim() || !model.trim() || !categoryId) return;

    setLoading(true);
    try {
      addComponent({
        categoryId,
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

      setIsAddModalOpen(false);
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

  return (
    <div className="space-y-5 pb-12">
      {/* Horní akční lišta ve stylu CashPilot */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-slate-900">{t("nav.components")}</h2>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold tabular-nums border border-slate-200">
                {initialComponents.length} celkem
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Centrální sklad, inventář a kompletní životní cyklus všech fyzických dílů
            </p>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className={buttonClass("primary", "md", "flex items-center gap-1.5 self-start sm:self-auto")}
          >
            <Plus className="w-4 h-4" />
            <span>{t("components.addComponent")}</span>
          </button>
        </div>

        {/* Panel filtrů a vyhledávání */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex gap-1 p-1 bg-slate-200/60 rounded-xl overflow-x-auto scrollbar-none">
            {[
              { id: "ALL", label: t("common.all") },
              { id: "INSTALLED", label: t("components.installed") },
              { id: "IN_STORAGE", label: t("components.inStorage") },
              { id: "SOLD", label: t("components.sold") },
              { id: "DISCARDED", label: t("components.discarded") },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  filterStatus === tab.id
                    ? "bg-white text-slate-900 shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("common.search")}
              className={cn(inputClass, "pl-8 pr-3")}
            />
          </div>
        </div>
      </div>

      {/* Grid komponentů */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-sm">
          <p className="text-slate-400 text-sm">Nebyly nalezeny žádné odpovídající komponenty.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const comp = item.component;
            const cat = item.category;
            const activeBike = item.activeBike;

            let statusBadge = {
              text: t("components.inStorage"),
              style: "bg-brand-50 text-brand-700 border-brand-200",
            };
            if (comp.status === "INSTALLED") {
              statusBadge = {
                text: activeBike ? `Na kole: ${activeBike.name}` : t("components.installed"),
                style: "bg-emerald-50 text-emerald-700 border-emerald-200",
              };
            } else if (comp.status === "SOLD") {
              statusBadge = {
                text: t("components.sold"),
                style: "bg-purple-50 text-purple-700 border-purple-200",
              };
            } else if (comp.status === "DISCARDED") {
              statusBadge = {
                text: t("components.discarded"),
                style: "bg-rose-50 text-rose-700 border-rose-200",
              };
            }

            return (
              <div
                key={comp.id}
                className="bg-white border border-slate-200/80 hover:border-slate-300 p-5 rounded-2xl flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-semibold text-slate-700 px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                      {cat?.nameCs || "Díl"}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusBadge.style} truncate max-w-[180px]`}>
                      {statusBadge.text}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    {comp.manufacturer} {comp.model}
                  </h3>
                  {comp.variant && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {comp.variant}
                    </p>
                  )}

                  {comp.tireCasing && (
                    <p className="text-xs text-brand-700 mt-1 font-medium">
                      {comp.tireCasing} • {comp.tireCompound || ""}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Cena: <strong className="text-slate-900 tabular-nums font-bold">{formatCzk(comp.purchasePrice)}</strong></span>
                  <Link
                    href={`/components/${comp.id}`}
                    className="text-brand-600 hover:text-brand-700 font-semibold inline-flex items-center gap-1"
                  >
                    <span>Detail & Servis →</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: PŘIDAT NOVÝ KOMPONENT */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
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
              value={categoryId}
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
              onClick={() => setIsAddModalOpen(false)}
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
    </div>
  );
}

export default ComponentsClient;
