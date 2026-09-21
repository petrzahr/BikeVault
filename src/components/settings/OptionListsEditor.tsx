"use client";

import React, { useEffect, useState } from "react";
import { Plus, Trash2, RotateCcw } from "lucide-react";
import { useVault } from "@/context/VaultContext";
import type { CustomLists, ListOption } from "@/types/vault";
import { makeOptionValue, resolveLists, sortCategoriesAz } from "@/lib/bikeLists";
import { buttonClass, inputClass } from "@/lib/ui";

interface OptionRowProps {
  option: ListOption;
  canDelete: boolean;
  deleteHint?: string;
  onRename: (label: string) => void;
  onDelete: () => void;
}

function OptionRow({ option, canDelete, deleteHint, onRename, onDelete }: OptionRowProps) {
  const [draft, setDraft] = useState(option.label);
  useEffect(() => setDraft(option.label), [option.label]);

  const commit = () => {
    const next = draft.trim();
    if (!next) setDraft(option.label);
    else if (next !== option.label) onRename(next);
  };

  return (
    <div className="flex items-center gap-2">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className={inputClass}
      />
      <button
        type="button"
        onClick={onDelete}
        disabled={!canDelete}
        title={canDelete ? "Odebrat" : deleteHint ?? "Poslední položku nelze odebrat"}
        className={buttonClass("ghost", "md", "shrink-0 disabled:opacity-40 disabled:pointer-events-none")}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

interface OptionListProps {
  title: string;
  options: ListOption[];
  isCustomized: boolean;
  onChange: (next: ListOption[]) => void;
  onReset: () => void;
}

function OptionList({ title, options, isCustomized, onChange, onReset }: OptionListProps) {
  const [newLabel, setNewLabel] = useState("");

  const add = () => {
    const label = newLabel.trim();
    if (!label) return;
    onChange([...options, { value: makeOptionValue(label, options), label }]);
    setNewLabel("");
  };

  return (
    <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/60 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-700">{title}</span>
        {isCustomized && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Výchozí
          </button>
        )}
      </div>

      {options.map((o) => (
        <OptionRow
          key={o.value}
          option={o}
          canDelete={options.length > 1}
          onRename={(label) => onChange(options.map((x) => (x.value === o.value ? { ...x, label } : x)))}
          onDelete={() => onChange(options.filter((x) => x.value !== o.value))}
        />
      ))}

      <div className="flex items-center gap-2 pt-1">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder="Nová položka…"
          className={inputClass}
        />
        <button
          type="button"
          onClick={add}
          disabled={!newLabel.trim()}
          className={buttonClass("secondary", "md", "shrink-0 disabled:opacity-40 disabled:pointer-events-none")}
        >
          <Plus className="w-4 h-4" />
          <span>Přidat</span>
        </button>
      </div>
    </div>
  );
}

function ComponentCategoriesList() {
  const { data, addCategory, renameCategory, deleteCategory } = useVault();
  const [newName, setNewName] = useState("");
  const categories = sortCategoriesAz(data.categories);
  const usedIds = new Set(data.components.map((comp) => comp.categoryId));

  const add = () => {
    if (!newName.trim()) return;
    addCategory(newName);
    setNewName("");
  };

  return (
    <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/60 space-y-2.5">
      <span className="text-xs font-semibold text-slate-700">Kategorie komponent</span>

      {categories.map((c) => {
        const canDelete = !c.isSystem && !usedIds.has(c.id);
        return (
          <OptionRow
            key={c.id}
            option={{ value: c.id, label: c.nameCs }}
            canDelete={canDelete}
            deleteHint={c.isSystem ? "Systémovou kategorii nelze odebrat" : "Kategorii používá komponent"}
            onRename={(label) => renameCategory(c.id, label)}
            onDelete={() => deleteCategory(c.id)}
          />
        );
      })}

      <div className="flex items-center gap-2 pt-1">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder="Nová kategorie…"
          className={inputClass}
        />
        <button
          type="button"
          onClick={add}
          disabled={!newName.trim()}
          className={buttonClass("secondary", "md", "shrink-0 disabled:opacity-40 disabled:pointer-events-none")}
        >
          <Plus className="w-4 h-4" />
          <span>Přidat</span>
        </button>
      </div>
    </div>
  );
}
export function OptionListsEditor() {
  const { data, updateSettings } = useVault();
  const custom: CustomLists = data.settings.customLists ?? {};
  const lists = resolveLists(data.settings);
  const [disciplineCategory, setDisciplineCategory] = useState(lists.bikeCategories[0]?.value ?? "");

  const save = (patch: Partial<CustomLists>) => updateSettings({ customLists: { ...custom, ...patch } });
  const reset = (key: keyof CustomLists) => {
    const { [key]: _removed, ...rest } = custom;
    updateSettings({ customLists: rest });
  };

  // Vybraná kategorie mohla být odebrána
  const activeCategory = lists.bikeCategories.some((c) => c.value === disciplineCategory)
    ? disciplineCategory
    : lists.bikeCategories[0]?.value ?? "";

  const saveDisciplines = (next: ListOption[]) =>
    save({ disciplines: { ...(custom.disciplines ?? {}), [activeCategory]: next } });
  const resetDisciplines = () => {
    const { [activeCategory]: _removed, ...rest } = custom.disciplines ?? {};
    updateSettings({ customLists: { ...custom, disciplines: rest } });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <OptionList
        title="Kategorie kol"
        options={lists.bikeCategories}
        isCustomized={custom.bikeCategories !== undefined}
        onChange={(next) => save({ bikeCategories: next })}
        onReset={() => reset("bikeCategories")}
      />

      <div className="space-y-2.5">
        <select
          value={activeCategory}
          onChange={(e) => setDisciplineCategory(e.target.value)}
          className={inputClass}
          aria-label="Kategorie, jejíž disciplíny se upravují"
        >
          {lists.bikeCategories.map((c) => (
            <option key={c.value} value={c.value}>
              Disciplíny: {c.label}
            </option>
          ))}
        </select>
        <OptionList
          title={`Disciplíny kategorie ${lists.bikeCategories.find((c) => c.value === activeCategory)?.label ?? ""}`}
          options={lists.disciplines[activeCategory] ?? []}
          isCustomized={custom.disciplines?.[activeCategory] !== undefined}
          onChange={saveDisciplines}
          onReset={resetDisciplines}
        />
      </div>

      <OptionList
        title="Typ odpružení"
        options={lists.suspensionTypes}
        isCustomized={custom.suspensionTypes !== undefined}
        onChange={(next) => save({ suspensionTypes: next })}
        onReset={() => reset("suspensionTypes")}
      />

      <OptionList
        title="Typ pohonu"
        options={lists.driveTypes}
        isCustomized={custom.driveTypes !== undefined}
        onChange={(next) => save({ driveTypes: next })}
        onReset={() => reset("driveTypes")}
      />

      <ComponentCategoriesList />
    </div>
  );
}
