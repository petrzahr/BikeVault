"use client";

import React, { useState } from "react";
import { Plus, Pencil, Trash2, RotateCcw, ChevronDown, ChevronRight, SlidersHorizontal, ArrowUp, ArrowDown } from "lucide-react";
import { useVault } from "@/context/VaultContext";
import type { ComponentCategory, CustomLists, ListOption } from "@/types/vault";
import { getCategorySpecFields, makeOptionValue, resolveLists, sortCategoriesAz } from "@/lib/bikeLists";
import { PageHeader } from "@/components/common/PageHeader";


interface ListRowData {
  id: string;
  label: string;
  canDelete: boolean;
  deleteHint?: string;
}

/** Textové pole pro přejmenování / přidání; potvrzení Enterem nebo opuštěním pole, Esc ruší. */
function InlineInput({
  initial = "",
  placeholder,
  onCommit,
  onCancel,
}: {
  initial?: string;
  placeholder?: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const [done, setDone] = useState(false);

  const finish = (commit: boolean) => {
    if (done) return;
    setDone(true);
    const next = value.trim();
    if (commit && next && next !== initial) onCommit(next);
    else onCancel();
  };

  return (
    <input
      autoFocus
      value={value}
      placeholder={placeholder}
      aria-label={placeholder || "Hodnota položky"}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter") finish(true);
        if (e.key === "Escape") finish(false);
      }}
      className="field field-sm"
    />
  );
}

function ListRow({
  row,
  onRename,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  row: ListRowData;
  onRename: (label: string) => void;
  onDelete: () => void;
  /** Když jsou zadané, zobrazí se šipky pro ruční řazení (např. vlastní pole specifikace). */
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const canReorder = Boolean(onMoveUp || onMoveDown);

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-1 bg-slate-50 rounded-lg min-h-9">
      {editing ? (
        <InlineInput
          initial={row.label}
          onCommit={(v) => {
            onRename(v);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <span className="text-xs font-medium text-slate-700 truncate">{row.label}</span>
      )}
      {!editing && (
        <div className="flex items-center shrink-0">
          {canReorder && (
            <>
              <button type="button" onClick={onMoveUp} disabled={!onMoveUp} title="Posunout nahoru" aria-label="Posunout nahoru" className="btn-icon">
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={onMoveDown} disabled={!onMoveDown} title="Posunout dolů" aria-label="Posunout dolů" className="btn-icon">
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <button type="button" onClick={() => setEditing(true)} title="Přejmenovat" aria-label="Přejmenovat položku" className="btn-icon">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={!row.canDelete}
            title={row.canDelete ? "Odebrat" : row.deleteHint}
            aria-label={row.canDelete ? "Odebrat položku" : (row.deleteHint || "Nelze odebrat")}
            className="btn-icon btn-icon-danger"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

interface ListCardProps {
  title: string;
  rows: ListRowData[];
  addPlaceholder: string;
  emptyText?: string;
  /** Když je zadáno, lze přejmenovat / odebrat i celou kartu (např. kategorii kol). */
  onRenameTitle?: (label: string) => void;
  onDeleteTitle?: () => void;
  onAdd: (label: string) => void;
  onRenameRow: (id: string, label: string) => void;
  onDeleteRow: (id: string) => void;
}

function ListCard({
  title,
  rows,
  addPlaceholder,
  emptyText = "Zatím žádné položky.",
  onRenameTitle,
  onDeleteTitle,
  onAdd,
  onRenameRow,
  onDeleteRow,
}: ListCardProps) {
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState(false);

  return (
    <div className="card p-4 flex flex-col">
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 min-h-[36px]">
        {renaming && onRenameTitle ? (
          <InlineInput
            initial={title}
            onCommit={(v) => {
              onRenameTitle(v);
              setRenaming(false);
            }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <h3 className="text-sm font-bold text-slate-900 truncate">{title}</h3>
        )}
        {!renaming && (
          <div className="flex items-center shrink-0">
            <button type="button" onClick={() => setAdding(true)} title="Přidat položku" className="btn-icon">
              <Plus className="w-3.5 h-3.5" />
            </button>
            {onRenameTitle && (
              <button type="button" onClick={() => setRenaming(true)} title="Přejmenovat" className="btn-icon">
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {onDeleteTitle && (
              <button type="button" onClick={onDeleteTitle} title="Odebrat" className="btn-icon btn-icon-danger">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-1.5 pt-2.5">
        {rows.length === 0 && !adding && <p className="text-xs text-slate-500 px-1 py-2">{emptyText}</p>}
        {rows.map((row) => (
          <ListRow
            key={row.id}
            row={row}
            onRename={(label) => onRenameRow(row.id, label)}
            onDelete={() => onDeleteRow(row.id)}
          />
        ))}
        {adding && (
          <div className="px-1">
            <InlineInput
              placeholder={addPlaceholder}
              onCommit={(v) => {
                onAdd(v);
                setAdding(false);
              }}
              onCancel={() => setAdding(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** Vlastní pole specifikace jedné kategorie komponent — přidávání/přejmenování/mazání/řazení. */
function CategorySpecFieldsPanel({ category }: { category: ComponentCategory }) {
  const { addCategorySpecField, renameCategorySpecField, deleteCategorySpecField, moveCategorySpecField } = useVault();
  const fields = getCategorySpecFields(category);
  const [adding, setAdding] = useState(false);

  return (
    <div className="ml-2 pl-3 border-l-2 border-slate-200 space-y-1.5 py-2">
      {fields.length === 0 && !adding && (
        <p className="text-xs text-slate-500 px-1">Kategorie zatím nemá žádná vlastní pole specifikace.</p>
      )}
      {fields.map((field, index) => (
        <ListRow
          key={field.key}
          row={{ id: field.key, label: field.label, canDelete: true }}
          onRename={(label) => renameCategorySpecField(category.id, field.key, label)}
          onDelete={() => deleteCategorySpecField(category.id, field.key)}
          onMoveUp={index > 0 ? () => moveCategorySpecField(category.id, field.key, "UP") : undefined}
          onMoveDown={index < fields.length - 1 ? () => moveCategorySpecField(category.id, field.key, "DOWN") : undefined}
        />
      ))}
      {adding ? (
        <div className="px-1">
          <InlineInput
            placeholder="Název pole…"
            onCommit={(v) => {
              addCategorySpecField(category.id, v);
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="btn-text"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Přidat vlastní pole</span>
        </button>
      )}
    </div>
  );
}

/** Řádek kategorie komponent s rozbalitelnou správou jejích vlastních polí specifikace. */
function ComponentCategoryRow({
  category,
  canDelete,
  deleteHint,
  onRename,
  onDelete,
}: {
  category: ComponentCategory;
  canDelete: boolean;
  deleteHint?: string;
  onRename: (label: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const fieldCount = getCategorySpecFields(category).length;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 px-3 py-1 bg-slate-50 rounded-lg min-h-9">
        {editing ? (
          <InlineInput
            initial={category.nameCs}
            onCommit={(v) => {
              onRename(v);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-slate-700 truncate cursor-pointer hover:text-slate-900"
          >
            {expanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
            <span className="truncate">{category.nameCs}</span>
            {fieldCount > 0 && (
              <span className="text-xs text-slate-500 font-semibold tabular-nums">({fieldCount})</span>
            )}
          </button>
        )}
        {!editing && (
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              title="Vlastní pole specifikace"
              className="btn-icon"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => setEditing(true)} title="Přejmenovat" className="btn-icon">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={!canDelete}
              title={canDelete ? "Odebrat" : deleteHint}
              className="btn-icon btn-icon-danger"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
      {expanded && <CategorySpecFieldsPanel category={category} />}
    </div>
  );
}

export function ListsClient() {
  const { data, updateSettings, addCategory, renameCategory, deleteCategory } = useVault();
  const custom: CustomLists = data.settings.customLists ?? {};
  const lists = resolveLists(data.settings);
  const [addingKind, setAddingKind] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);

  const save = (patch: Partial<CustomLists>) => updateSettings({ customLists: { ...custom, ...patch } });

  // Obecné operace nad plochým seznamem uloženým v customLists
  const flatCard = (key: "suspensionTypes" | "driveTypes", options: ListOption[]) => ({
    rows: options.map((o) => ({ id: o.value, label: o.label, canDelete: true })),
    onAdd: (label: string) => save({ [key]: [...options, { value: makeOptionValue(label, options), label }] }),
    onRenameRow: (id: string, label: string) =>
      save({ [key]: options.map((o) => (o.value === id ? { ...o, label } : o)) }),
    onDeleteRow: (id: string) => save({ [key]: options.filter((o) => o.value !== id) }),
  });

  const saveDisciplines = (category: string, next: ListOption[]) =>
    save({ disciplines: { ...(custom.disciplines ?? {}), [category]: next } });

  const deleteBikeCategory = (option: ListOption) => {
    if (!window.confirm(`Odebrat kategorii „${option.label}“ včetně jejích disciplín? Již založená kola se nezmění.`)) return;
    const { [option.value]: _removed, ...disciplines } = { ...lists.disciplines };
    save({
      bikeCategories: lists.bikeCategories.filter((c) => c.value !== option.value),
      disciplines,
    });
  };

  const usedCategoryIds = new Set(data.components.map((c) => c.categoryId));
  const componentCategories = sortCategoriesAz(data.categories);

  const resetAll = () => {
    if (!window.confirm("Vrátit kategorie kol, disciplíny, typ odpružení a typ pohonu na výchozí hodnoty?")) return;
    updateSettings({ customLists: undefined });
  };

  return (
    <div className="space-y-5 pb-12">
      <PageHeader
        title="Seznamy"
        actions={
          <>
            {data.settings.customLists && (
              <button type="button" onClick={resetAll} className="btn-secondary">
                <RotateCcw className="w-4 h-4" />
                <span>Obnovit výchozí</span>
              </button>
            )}
            <button type="button" onClick={() => setAddingKind(true)} className="btn-primary">
              <Plus className="w-4 h-4" />
              <span>Nová kategorie kol</span>
            </button>
          </>
        }
      >
        {addingKind && (
          <div className="max-w-sm">
            <InlineInput
              placeholder="Název kategorie kola…"
              onCommit={(label) => {
                save({ bikeCategories: [...lists.bikeCategories, { value: makeOptionValue(label, lists.bikeCategories), label }] });
                setAddingKind(false);
              }}
              onCancel={() => setAddingKind(false)}
            />
          </div>
        )}
      </PageHeader>

      {/* Kategorie kol s disciplínami */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {lists.bikeCategories.map((cat) => {
          const disciplines = lists.disciplines[cat.value] ?? [];
          return (
            <ListCard
              key={cat.value}
              title={cat.label}
              rows={disciplines.map((d) => ({ id: d.value, label: d.label, canDelete: true }))}
              addPlaceholder="Nová disciplína…"
              emptyText="Kategorie zatím nemá žádné disciplíny."
              onRenameTitle={(label) =>
                save({ bikeCategories: lists.bikeCategories.map((c) => (c.value === cat.value ? { ...c, label } : c)) })
              }
              onDeleteTitle={() => deleteBikeCategory(cat)}
              onAdd={(label) =>
                saveDisciplines(cat.value, [...disciplines, { value: makeOptionValue(label, disciplines), label }])
              }
              onRenameRow={(id, label) =>
                saveDisciplines(cat.value, disciplines.map((d) => (d.value === id ? { ...d, label } : d)))
              }
              onDeleteRow={(id) => saveDisciplines(cat.value, disciplines.filter((d) => d.value !== id))}
            />
          );
        })}
      </div>

      {/* Ostatní seznamy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ListCard title="Typy odpružení" addPlaceholder="Nový typ odpružení…" {...flatCard("suspensionTypes", lists.suspensionTypes)} />
        <ListCard title="Typy pohonu" addPlaceholder="Nový typ pohonu…" {...flatCard("driveTypes", lists.driveTypes)} />

        {/* Kategorie komponent — každou lze rozbalit a spravovat jí vlastní pole specifikace */}
        <div className="card p-4 flex flex-col">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 min-h-[36px]">
            <h3 className="text-sm font-bold text-slate-900 truncate">Kategorie komponent</h3>
            <button type="button" onClick={() => setAddingCategory(true)} title="Přidat kategorii" className="btn-icon">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-1.5 pt-2.5">
            {componentCategories.map((c) => (
              <ComponentCategoryRow
                key={c.id}
                category={c}
                canDelete={!c.isSystem && !usedCategoryIds.has(c.id)}
                deleteHint={c.isSystem ? "Systémovou kategorii nelze odebrat" : "Kategorii používá existující komponenta"}
                onRename={(label) => renameCategory(c.id, label)}
                onDelete={() => deleteCategory(c.id)}
              />
            ))}
            {addingCategory && (
              <div className="px-1">
                <InlineInput
                  placeholder="Nová kategorie komponent…"
                  onCommit={(v) => {
                    addCategory(v);
                    setAddingCategory(false);
                  }}
                  onCancel={() => setAddingCategory(false)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ListsClient;
