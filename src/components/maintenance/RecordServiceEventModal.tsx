"use client";

import React, { useState, useEffect } from "react";
import { Wrench, Check, Loader2, Coins, Bike as BikeIcon, Layers, Calendar, UserCheck, Store } from "lucide-react";
import { t, formatCzk } from "@/lib/i18n";
import { useVault } from "@/context/VaultContext";
import { useFeedback } from "@/components/common/Feedback";
import { Modal } from "@/components/common/Modal";
import { Bike, Component, ServiceSchedule } from "@/types/vault";
import { buttonClass, inputClass, labelClass, cn } from "@/lib/ui";

export interface RecordServiceEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** Pevně dané kolo (např. z detailu kola) */
  fixedBikeId?: string;
  /** Pevně daná komponenta (např. z detailu komponenty) */
  fixedComponentId?: string;
  /** Servisní plán, jehož splnění zapisujeme */
  initialSchedule?: ServiceSchedule | null;
  /** Volitelný seznam kol pro výběr */
  bikes?: Bike[];
  /** Volitelný seznam komponent pro výběr */
  components?: Component[];
}

export function RecordServiceEventModal({
  isOpen,
  onClose,
  onSuccess,
  fixedBikeId,
  fixedComponentId,
  initialSchedule,
  bikes: propBikes,
  components: propComponents,
}: RecordServiceEventModalProps) {
  const { data, createServiceEvent, getGarageBikes } = useVault();
  const { toast } = useFeedback();

  const bikesList = propBikes ?? getGarageBikes("ACTIVE");

  const [serviceName, setServiceName] = useState("");
  const [selectedBikeId, setSelectedBikeId] = useState("");
  const [selectedComponentId, setSelectedComponentId] = useState("");
  const [selectedScheduleId, setSelectedScheduleId] = useState("");
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [executionType, setExecutionType] = useState<"DIY" | "WORKSHOP">("DIY");
  const [serviceProvider, setServiceProvider] = useState("Svépomocí");
  const [partsCost, setPartsCost] = useState("");
  const [laborCost, setLaborCost] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inicializace stavu při otevření dialogu
  useEffect(() => {
    if (!isOpen) return;

    if (initialSchedule) {
      setServiceName(initialSchedule.name || "");
      setSelectedScheduleId(initialSchedule.id);
      setSelectedBikeId(initialSchedule.bikeId || fixedBikeId || bikesList[0]?.id || "");
      setSelectedComponentId(initialSchedule.componentId || fixedComponentId || "");
    } else {
      setServiceName("");
      setSelectedScheduleId("");
      setSelectedBikeId(fixedBikeId || bikesList[0]?.id || "");
      setSelectedComponentId(fixedComponentId || "");
    }

    setServiceDate(new Date().toISOString().split("T")[0]);
    setExecutionType("DIY");
    setServiceProvider("Svépomocí");
    setPartsCost("");
    setLaborCost("");
    setNotes("");
    setError(null);
  }, [isOpen, initialSchedule, fixedBikeId, fixedComponentId, bikesList]);

  if (!isOpen) return null;

  // Dostupné komponenty na vybraném kole
  const availableComponents = selectedBikeId
    ? data.componentInstallations
        .filter((ci) => ci.bikeId === selectedBikeId && !ci.removedAt)
        .map((ci) => {
          const comp = (propComponents ?? data.components).find((c) => c.id === ci.componentId);
          const cat = data.categories.find((category) => category.id === comp?.categoryId);
          return { installation: ci, component: comp, category: cat };
        })
        .filter((item) => item.component !== undefined)
    : [];

  // Dostupné servisní plány pro vybrané kolo / komponentu
  const availableSchedules = data.serviceSchedules.filter((s) => {
    if (!s.isActive) return false;
    if (selectedBikeId && s.bikeId !== selectedBikeId) return false;
    if (selectedComponentId && s.componentId && s.componentId !== selectedComponentId) return false;
    return true;
  });

  const partsPriceNum = parseFloat(partsCost || "0");
  const laborPriceNum = parseFloat(laborCost || "0");
  const totalCost = (isNaN(partsPriceNum) ? 0 : partsPriceNum) + (isNaN(laborPriceNum) ? 0 : laborPriceNum);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!serviceName.trim()) {
      setError("Vyplňte prosím název servisního úkonu.");
      return;
    }

    const bikeIdToUse = fixedBikeId || selectedBikeId;
    if (!bikeIdToUse) {
      setError("Vyberte prosím kolo, na kterém byl servis proveden.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const bike = data.bikes.find((b) => b.id === bikeIdToUse);
      const partsPrice = isNaN(partsPriceNum) ? 0 : partsPriceNum;
      const laborPrice = isNaN(laborPriceNum) ? 0 : laborPriceNum;

      createServiceEvent({
        bikeId: bikeIdToUse,
        componentId: selectedComponentId || fixedComponentId || null,
        serviceScheduleId: selectedScheduleId || null,
        eventType: "MAINTENANCE",
        serviceDate,
        bikeKm: bike ? Number(bike.currentKm) : 0,
        bikeMinutes: bike ? bike.currentMinutes : 0,
        performedBy: executionType === "DIY" ? "SELF" : "SHOP",
        shopName: executionType === "WORKSHOP" ? serviceProvider.trim() : null,
        description: serviceName.trim(),
        partsPrice,
        laborPrice,
        totalPrice: partsPrice + laborPrice,
        currency: "CZK",
        notes: notes.trim() || null,
      });

      toast("Servisní úkon byl úspěšně zaevidován.", "success");
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Chyba při zápisu servisu.");
    } finally {
      setLoading(false);
    }
  };

  const isScheduleLinked = Boolean(selectedScheduleId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isScheduleLinked ? "Zapsat provedení servisu" : "Zapsat servisní úkon bez plánu"}
      subtitle={
        isScheduleLinked
          ? "Zaznamenání úkonu do historie a reset servisního intervalu"
          : "Jednorázový záznam údržby do servisní knihy kola"
      }
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Název úkonu */}
        <div>
          <label htmlFor="service-event-name" className={labelClass}>
            Název servisního úkonu *
          </label>
          <input
            id="service-event-name"
            type="text"
            required
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            className={inputClass}
            placeholder="např. Výměna řetězu, Malý servis vidlice, Odvzdušnění brzd..."
          />
        </div>

        {/* Výběr kola (pokud není pevně určeno) */}
        {!fixedBikeId && (
          <div>
            <label htmlFor="service-event-bike" className={labelClass}>
              <BikeIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>Kolo *</span>
            </label>
            <select
              id="service-event-bike"
              value={selectedBikeId}
              onChange={(e) => {
                setSelectedBikeId(e.target.value);
                if (!fixedComponentId) setSelectedComponentId("");
                setSelectedScheduleId("");
              }}
              className={inputClass}
            >
              {bikesList.map((bike) => (
                <option key={bike.id} value={bike.id}>
                  {bike.name} ({bike.manufacturer} {bike.model})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Výběr komponenty (pokud není pevně určena) */}
        {!fixedComponentId && availableComponents.length > 0 && (
          <div>
            <label htmlFor="service-event-component" className={labelClass}>
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>Vztahuje se ke komponentě (volitelné)</span>
            </label>
            <select
              id="service-event-component"
              value={selectedComponentId}
              onChange={(e) => {
                setSelectedComponentId(e.target.value);
                setSelectedScheduleId("");
              }}
              className={inputClass}
            >
              <option value="">-- Pouze celé kolo --</option>
              {availableComponents.map((item) => (
                <option key={item.component!.id} value={item.component!.id}>
                  {item.category?.nameCs || "Komponenta"}: {item.component!.manufacturer} {item.component!.model}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Propojený servisní plán */}
        {availableSchedules.length > 0 && (
          <div>
            <label htmlFor="service-event-schedule" className={labelClass}>
              <Wrench className="w-3.5 h-3.5 text-slate-500" />
              <span>Propojený servisní plán (resetuje interval)</span>
            </label>
            <select
              id="service-event-schedule"
              value={selectedScheduleId}
              onChange={(e) => {
                const schedId = e.target.value;
                setSelectedScheduleId(schedId);
                if (schedId) {
                  const s = availableSchedules.find((item) => item.id === schedId);
                  if (s && !serviceName.trim()) {
                    setServiceName(s.name);
                  }
                }
              }}
              className={inputClass}
            >
              <option value="">-- Bez plánu (jednorázový servis) --</option>
              {availableSchedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Datum a typ provedení */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="service-event-date" className={labelClass}>
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Datum provedení *</span>
            </label>
            <input
              id="service-event-date"
              type="date"
              required
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="service-event-execution" className={labelClass}>
              Provedení
            </label>
            <select
              id="service-event-execution"
              value={executionType}
              onChange={(e) => {
                const val = e.target.value as "DIY" | "WORKSHOP";
                setExecutionType(val);
                if (val === "DIY") setServiceProvider("Svépomocí");
                else setServiceProvider("");
              }}
              className={inputClass}
            >
              <option value="DIY">Svépomocí</option>
              <option value="WORKSHOP">Odborný servis / Dílna</option>
            </select>
          </div>
        </div>

        {/* Mechanik / Název servisu */}
        <div>
          <label htmlFor="service-event-provider" className={labelClass}>
            {executionType === "WORKSHOP" ? (
              <>
                <Store className="w-3.5 h-3.5 text-slate-500" />
                <span>Název servisu / Dílny</span>
              </>
            ) : (
              <>
                <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>Kdo provedl servis</span>
              </>
            )}
          </label>
          <input
            id="service-event-provider"
            type="text"
            value={serviceProvider}
            onChange={(e) => setServiceProvider(e.target.value)}
            className={inputClass}
            placeholder={executionType === "WORKSHOP" ? "např. Kolofix Praha, Specialized Concept Store..." : "např. Svépomocí, kamarád..."}
          />
        </div>

        {/* Náklady na servis */}
        <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-slate-500" />
              <span>Náklady na servis</span>
            </span>
            {totalCost > 0 && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                Celkem: {formatCzk(totalCost)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="service-event-parts-cost" className={labelClass}>
                Cena dílů (Kč)
              </label>
              <input
                id="service-event-parts-cost"
                type="number"
                min="0"
                value={partsCost}
                onChange={(e) => setPartsCost(e.target.value)}
                className={cn(inputClass, "tabular-nums")}
                placeholder="0"
              />
            </div>

            <div>
              <label htmlFor="service-event-labor-cost" className={labelClass}>
                Cena práce (Kč)
              </label>
              <input
                id="service-event-labor-cost"
                type="number"
                min="0"
                value={laborCost}
                onChange={(e) => setLaborCost(e.target.value)}
                className={cn(inputClass, "tabular-nums")}
                placeholder="0"
              />
            </div>
          </div>

          {totalCost > 0 && (
            <p className="text-[11px] text-slate-500">
              Uložením se automaticky vytvoří výdajová transakce v historii financí kola.
            </p>
          )}
        </div>

        {/* Poznámky */}
        <div>
          <label htmlFor="service-event-notes" className={labelClass}>
            {t("bike.notes")}
          </label>
          <textarea
            id="service-event-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClass}
            placeholder="Poznámky k postupu servisu, použitým kapalinám či nastavení..."
          />
        </div>

        {/* Tlačítka akcí */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-xs py-2.5 -mx-1 px-1 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5 sm:gap-3 z-10">
          <button
            type="button"
            onClick={onClose}
            className={cn(buttonClass("secondary", "md"), "w-full sm:w-auto")}
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={loading}
            className={cn(buttonClass("primary", "md"), "w-full sm:w-auto flex items-center justify-center gap-1.5")}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Ukládám...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Zapsat servis</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default RecordServiceEventModal;
