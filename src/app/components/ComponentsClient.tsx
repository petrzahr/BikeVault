"use client";

import React, { useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Check
} from "lucide-react";
import { t, formatCzk } from "@/lib/i18n";
import { useVault } from "@/context/VaultContext";
import Link from "next/link";
import { AddComponentModal } from "@/components/garage/AddComponentModal";
import { Modal, ModalFooter } from "@/components/common/Modal";
import { PageHeader } from "@/components/common/PageHeader";
import { useFeedback } from "@/components/common/Feedback";
import { sortCategoriesAz } from "@/lib/bikeLists";

interface ComponentsClientProps {
  initialComponents?: any[];
  categories?: any[];
}

export function ComponentsClient({
  initialComponents: propComponents,
  categories: propCategories,
}: ComponentsClientProps = {}) {
  const { data, getAllComponents, getGarageBikes, installComponent } = useVault();
  const { toast } = useFeedback();
  const initialComponents = propComponents ?? getAllComponents();
  const categories = sortCategoriesAz(propCategories ?? data.categories);
  const activeBikes = getGarageBikes("ACTIVE");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [componentToEdit, setComponentToEdit] = useState<any | null>(null);

  // Install from storage
  const [componentToInstall, setComponentToInstall] = useState<any | null>(null);
  const [installBikeId, setInstallBikeId] = useState<string>("");
  const [installSlot, setInstallSlot] = useState<string>("");

  const openInstall = (comp: any, cat: any) => {
    setComponentToInstall(comp);
    setInstallBikeId(activeBikes.length === 1 ? activeBikes[0].id : "");
    setInstallSlot(cat?.defaultSlot || cat?.code || "");
  };

  const handleInstall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!componentToInstall || !installBikeId || !installSlot) return;
    try {
      installComponent(installBikeId, componentToInstall.id, installSlot);
      setComponentToInstall(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Chyba při montáži komponentu.";
      toast(msg, "error");
    }
  };

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
      <PageHeader
        title={t("nav.components")}
        badge={<span className="chip chip-neutral tabular-nums">{initialComponents.length} celkem</span>}
        actions={
          <button onClick={() => setIsAddModalOpen(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            <span>{t("components.addComponent")}</span>
          </button>
        }
      >

        {/* Panel filtrů a vyhledávání */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div role="tablist" aria-label="Stav komponent" className="segmented flex overflow-x-auto">
            {[
              { id: "ALL", label: t("common.all") },
              { id: "INSTALLED", label: t("components.installed") },
              { id: "IN_STORAGE", label: t("components.inStorage") },
              { id: "SOLD", label: t("components.sold") },
              { id: "DISCARDED", label: t("components.discarded") },
            ].map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={filterStatus === tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className="segment"
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("common.search")}
              aria-label="Hledat komponenty"
              className="field pl-9 pr-3"
            />
          </div>
        </div>
      </PageHeader>

      {/* Grid komponentů */}
      {filtered.length === 0 ? (
        <div className="card empty-state py-12">
          <p>Nebyly nalezeny žádné odpovídající komponenty.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const comp = item.component;
            const cat = item.category;
            const activeBike = item.activeBike;

            let statusBadge = {
              text: t("components.inStorage"),
              style: "chip-neutral",
            };
            if (comp.status === "INSTALLED") {
              statusBadge = {
                text: activeBike ? `Na kole: ${activeBike.name}` : t("components.installed"),
                style: "chip-emerald",
              };
            } else if (comp.status === "SOLD") {
              statusBadge = {
                text: t("components.sold"),
                style: "chip-navy",
              };
            } else if (comp.status === "DISCARDED") {
              statusBadge = {
                text: t("components.discarded"),
                style: "chip-neutral",
              };
            }

            return (
              <div
                key={comp.id}
                className="card p-4 sm:p-5 flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="chip chip-neutral">
                      {cat?.nameCs || "Komponenta"}
                    </span>
                    {comp.status === "IN_STORAGE" ? (
                      <button
                        onClick={() => openInstall(comp, cat)}
                        className="btn-primary btn-sm"
                      >
                        Namontovat na kolo
                      </button>
                    ) : (
                      <span className={`chip ${statusBadge.style} truncate max-w-[180px]`}>
                        {statusBadge.text}
                      </span>
                    )}
                  </div>

                  <Link href={`/components/${comp.id}`} className="block group/title">
                    <h3 className="text-sm font-bold text-slate-900 group-hover/title:text-navy-600 transition-colors">
                      {comp.manufacturer} {comp.model}
                    </h3>
                  </Link>
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
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setComponentToEdit(comp)}
                      className="btn-text"
                      title="Upravit komponentu"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Upravit</span>
                    </button>
                    <Link
                      href={`/components/${comp.id}`}
                      className="btn-text"
                    >
                      <span>Detail & Servis →</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddComponentModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      <AddComponentModal
        isOpen={!!componentToEdit}
        onClose={() => setComponentToEdit(null)}
        componentToEdit={componentToEdit}
      />

      {/* MODAL: NAMONTOVAT ZE SKLADU */}
      <Modal
        isOpen={!!componentToInstall}
        onClose={() => setComponentToInstall(null)}
        title="Namontovat díl na kolo"
        subtitle={componentToInstall ? `${componentToInstall.manufacturer} ${componentToInstall.model}` : undefined}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleInstall} className="space-y-4">
          <div>
            <label htmlFor="components-install-bike" className="field-label">Kolo</label>
            {activeBikes.length === 0 ? (
              <div className="panel panel-neutral">
                Nemáte žádné aktivní kolo.
              </div>
            ) : (
              <select
                id="components-install-bike"
                required
                value={installBikeId}
                onChange={(e) => setInstallBikeId(e.target.value)}
                className="field"
              >
                <option value="">—</option>
                {activeBikes.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label htmlFor="components-install-slot" className="field-label">Pozice na kole</label>
            <select
              id="components-install-slot"
              required
              value={installSlot}
              onChange={(e) => setInstallSlot(e.target.value)}
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
              onClick={() => setComponentToInstall(null)}
              className="btn-secondary"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={!installBikeId || !installSlot}
              className="btn-primary"
            >
              <Check className="w-4 h-4" />
              <span>Namontovat na kolo</span>
            </button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}

export default ComponentsClient;
