"use client";

import React, { useState } from "react";
import { 
  Layers, 
  Plus, 
  Search, 
  Archive, 
  CheckCircle2, 
  DollarSign, 
  X,
  Bike as BikeIcon
} from "lucide-react";
import { t, formatKm, formatMinutes, formatCzk, formatDateCs } from "@/lib/i18n";
import { createComponentAction } from "@/app/actions/components";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ComponentsClientProps {
  initialComponents: any[];
  categories: any[];
}

export function ComponentsClient({ initialComponents, categories }: ComponentsClientProps) {
  const router = useRouter();
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
      await createComponentAction({
        categoryId,
        manufacturer,
        model,
        variant: variant.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
        purchaseDate,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
        initialKm: initialKm ? parseFloat(initialKm) : 0,
        initialHours: initialHours ? parseFloat(initialHours) : 0,
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
      router.refresh();
    } catch (err: any) {
      alert(err?.message || "Chyba při zakládání komponentu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {t("nav.components")}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-mono text-xs font-semibold">
              {initialComponents.length} celkem
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Centrální sklad, inventář a kompletní životní cyklus všech fyzických dílů
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t("components.addComponent")}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
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
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                filterStatus === tab.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("common.search")}
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-slate-900 text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* Components Grid */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
          <p className="text-slate-500 text-sm">Nebyly nalezeny žádné odpovídající komponenty.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const comp = item.component;
            const cat = item.category;
            const activeBike = item.activeBike;

            let statusBadge = {
              text: t("components.inStorage"),
              style: "bg-blue-50 text-blue-700 border-blue-200",
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
                style: "bg-red-50 text-red-700 border-red-200",
              };
            }

            return (
              <div
                key={comp.id}
                className="bg-white border border-slate-200 hover:border-slate-300 p-5 rounded-2xl flex flex-col justify-between space-y-4 shadow-sm transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-semibold text-slate-600 px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                      {cat?.nameCs || "Díl"}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusBadge.style} truncate max-w-[180px]`}>
                      {statusBadge.text}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    {comp.manufacturer} {comp.model}
                  </h3>
                  {comp.variant && (
                    <p className="text-xs text-slate-500">
                      {comp.variant}
                    </p>
                  )}

                  {comp.tireCasing && (
                    <p className="text-xs text-blue-700 font-mono mt-1 font-medium">
                      {comp.tireCasing} • {comp.tireCompound || ""}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Cena: <strong className="text-slate-900 font-mono">{formatCzk(comp.purchasePrice)}</strong></span>
                  <Link
                    href={`/components/${comp.id}`}
                    className="text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1"
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
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg my-8 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">{t("components.addComponent")}</h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Kategorie komponentu *
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-4 py-2 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
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
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Výrobce *
                  </label>
                  <input
                    type="text"
                    required
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    placeholder="např. RockShox, SRAM, Shimano"
                    className="w-full bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-4 py-2 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Model *
                  </label>
                  <input
                    type="text"
                    required
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="např. ZEB Ultimate, Eagle X0"
                    className="w-full bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-4 py-2 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Varianta / specifikace
                </label>
                <input
                  type="text"
                  value={variant}
                  onChange={(e) => setVariant(e.target.value)}
                  placeholder="např. 180mm 29 Slab Grey, 32z, 10-52z"
                  className="w-full bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-4 py-2 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Nákupní cena (Kč)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-4 py-2 text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Datum nákupu
                  </label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-4 py-2 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>

              {/* Specifická pole pro pláště */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Specifikace pro pláště (volitelné)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={tireCasing}
                    onChange={(e) => setTireCasing(e.target.value)}
                    placeholder="Kostra (např. DoubleDown, DH, EXO+)"
                    className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                  <input
                    type="text"
                    value={tireCompound}
                    onChange={(e) => setTireCompound(e.target.value)}
                    placeholder="Směs (např. MaxxGrip, MaxxTerra)"
                    className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Poznámka
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 rounded-xl p-3 text-slate-900 text-xs focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
                >
                  {loading ? t("common.loading") : "Založit díl do skladu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
