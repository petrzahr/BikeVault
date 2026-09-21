"use client";

import React, { useState } from "react";
import { 
  Plus, 
  Search
} from "lucide-react";
import { t, formatCzk } from "@/lib/i18n";
import { useVault } from "@/context/VaultContext";
import Link from "next/link";
import { AddComponentModal } from "@/components/garage/AddComponentModal";
import { buttonClass, inputClass, cn } from "@/lib/ui";

interface ComponentsClientProps {
  initialComponents?: any[];
  categories?: any[];
}

export function ComponentsClient({
  initialComponents: propComponents,
  categories: propCategories,
}: ComponentsClientProps = {}) {
  const { data, getAllComponents } = useVault();
  const initialComponents = propComponents ?? getAllComponents();
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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

  return (
    <div className="space-y-5 pb-12">
      {/* Horní akční lišta */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-slate-900">{t("nav.components")}</h2>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold tabular-nums border border-slate-200">
                {initialComponents.length} celkem
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className={buttonClass("primary", "md", "self-start sm:self-auto")}
          >
            <Plus className="w-4 h-4" />
            <span>{t("components.addComponent")}</span>
          </button>
        </div>

        {/* Panel filtrů a vyhledávání */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex gap-1.5 p-1 bg-slate-200/60 rounded-xl overflow-x-auto scrollbar-none">
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
                    ? "bg-navy-600 text-white shadow-sm font-bold"
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
              style: "bg-ink-900 text-white border-ink-900",
            };
            if (comp.status === "INSTALLED") {
              statusBadge = {
                text: activeBike ? `Na kole: ${activeBike.name}` : t("components.installed"),
                style: "bg-ink-900 text-white border-ink-900",
              };
            } else if (comp.status === "SOLD") {
              statusBadge = {
                text: t("components.sold"),
                style: "bg-ink-900 text-white border-ink-900",
              };
            } else if (comp.status === "DISCARDED") {
              statusBadge = {
                text: t("components.discarded"),
                style: "bg-ink-900 text-white border-ink-900",
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
                    <p className="text-xs text-navy-700 mt-1 font-medium">
                      {comp.tireCasing} • {comp.tireCompound || ""}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Cena: <strong className="text-slate-900 tabular-nums font-bold">{formatCzk(comp.purchasePrice)}</strong></span>
                  <Link
                    href={`/components/${comp.id}`}
                    className="text-navy-600 hover:text-navy-700 font-semibold inline-flex items-center gap-1"
                  >
                    <span>Detail & Servis →</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddComponentModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
}

export default ComponentsClient;
