"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/common/Modal";
import { useVault } from "@/context/VaultContext";
import { FinancialTransaction } from "@/types/vault";
import { buttonClass, inputClass, labelClass, cn } from "@/lib/ui";
import { Check, TrendingDown, TrendingUp, Calendar, Coins, Loader2 } from "lucide-react";
import { t } from "@/lib/i18n";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBikeId?: string | null;
  onSuccess?: () => void;
}

export function AddTransactionModal({
  isOpen,
  onClose,
  defaultBikeId,
  onSuccess,
}: AddTransactionModalProps) {
  const { data, addTransaction } = useVault();

  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [category, setCategory] = useState<FinancialTransaction["category"]>("CONSUMABLES");
  const [amount, setAmount] = useState<string>("");
  const [transactionDate, setTransactionDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [bikeId, setBikeId] = useState<string>(defaultBikeId || "");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setBikeId(defaultBikeId || "");
      setType("EXPENSE");
      setCategory("CONSUMABLES");
      setAmount("");
      setTransactionDate(new Date().toISOString().split("T")[0]);
      setNotes("");
      setError(null);
    }
  }, [isOpen, defaultBikeId]);

  if (!isOpen) return null;

  const expenseCategories: Array<{ value: FinancialTransaction["category"]; label: string }> = [
    { value: "CONSUMABLES", label: "Spotřební materiál (maziva, tmely, pásky...)" },
    { value: "ACCESSORY", label: "Příslušenství (košíky, brašny, světla...)" },
    { value: "UPGRADE", label: "Upgrade komponent" },
    { value: "SERVICE_PARTS", label: "Servis — náhradní díly" },
    { value: "SERVICE_LABOR", label: "Servis — práce" },
    { value: "OTHER", label: "Ostatní (startovné, mytí, doprava...)" },
  ];

  const incomeCategories: Array<{ value: FinancialTransaction["category"]; label: string }> = [
    { value: "COMPONENT_SALE", label: "Prodej komponenty" },
    { value: "BIKE_SALE", label: "Prodej kola" },
    { value: "REFUND", label: "Vrácení peněz / reklamace" },
    { value: "OTHER", label: "Ostatní příjem" },
  ];

  const handleTypeChange = (newType: "EXPENSE" | "INCOME") => {
    setType(newType);
    if (newType === "EXPENSE") {
      setCategory("CONSUMABLES");
    } else {
      setCategory("COMPONENT_SALE");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount.replace(",", "."));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Zadejte platnou kladnou částku.");
      return;
    }

    if (!notes.trim()) {
      setError("Vyplňte stručný popis transakce.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      addTransaction({
        type,
        category,
        amount: parsedAmount,
        currency: "CZK",
        transactionDate,
        bikeId: bikeId || null,
        notes: notes.trim(),
      });

      // Reset
      setAmount("");
      setNotes("");
      setError(null);
      setLoading(false);
      onClose();
      onSuccess?.();
    } catch (err: any) {
      setError(err?.message || "Uložení transakce se nezdařilo.");
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={type === "EXPENSE" ? "Zapsat výdaj" : "Zapsat příjem"}
      subtitle="Přidejte dílenský výdaj, příslušenství nebo prodej"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        {/* Přepínač Výdaj / Příjem */}
        <div>
          <label className={labelClass}>Typ položky</label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => handleTypeChange("EXPENSE")}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                type === "EXPENSE"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Výdaj</span>
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange("INCOME")}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                type === "INCOME"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Příjem</span>
            </button>
          </div>
        </div>

        {/* Částka */}
        <div>
          <label htmlFor="tx-amount" className={labelClass}>
            Částka (Kč) *
          </label>
          <div className="relative">
            <input
              id="tx-amount"
              type="number"
              step="1"
              min="1"
              required
              autoFocus
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={cn(inputClass, "pr-10 tabular-nums text-base font-bold")}
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 pointer-events-none">
              Kč
            </span>
          </div>
        </div>

        {/* Kategorie */}
        <div>
          <label htmlFor="tx-category" className={labelClass}>
            Kategorie položky *
          </label>
          <select
            id="tx-category"
            required
            value={category}
            onChange={(e) => setCategory(e.target.value as FinancialTransaction["category"])}
            className={inputClass}
          >
            {(type === "EXPENSE" ? expenseCategories : incomeCategories).map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Popis / položka */}
        <div>
          <label htmlFor="tx-notes" className={labelClass}>
            Popis položky *
          </label>
          <input
            id="tx-notes"
            type="text"
            required
            placeholder={
              type === "EXPENSE"
                ? "Např. Bezdušový tmel 1L, startovné Enduro Trutnov..."
                : "Např. Prodej starého představce, vrácení zboží..."
            }
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Datum a Kolo (dva sloupce) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="tx-date" className={labelClass}>
              Datum transakce *
            </label>
            <input
              id="tx-date"
              type="date"
              required
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="tx-bike" className={labelClass}>
              Vazba na kolo (volitelné)
            </label>
            <select
              id="tx-bike"
              value={bikeId}
              onChange={(e) => setBikeId(e.target.value)}
              className={inputClass}
            >
              <option value="">— Bez vazby na kolo —</option>
              {data.bikes.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.manufacturer} {b.model})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tlačítka */}
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
            className={cn(
              buttonClass(type === "EXPENSE" ? "primary" : "primary", "md"),
              "w-full sm:w-auto"
            )}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Ukládám...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{type === "EXPENSE" ? "Zapsat výdaj" : "Zapsat příjem"}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default AddTransactionModal;
