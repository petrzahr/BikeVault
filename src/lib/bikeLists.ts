import type { Component, ComponentCategory, ComponentSpecField, CustomLists, ListOption, UserSettings } from "@/types/vault";

export const DEFAULT_BIKE_CATEGORIES: ListOption[] = [
  { value: "MTB", label: "MTB" },
  { value: "GRAVEL", label: "Gravel" },
  { value: "ROAD", label: "Silniční" },
  { value: "CYCLOCROSS", label: "Cyklokros" },
  { value: "CITY_URBAN", label: "Městské" },
  { value: "TOURING", label: "Touring" },
  { value: "DIRT_PUMPTRACK", label: "Dirt / Pumptrack" },
  { value: "OTHER", label: "Jiné" },
];

export const DEFAULT_SUSPENSION_TYPES: ListOption[] = [
  { value: "FULL_SUSPENSION", label: "Celoodpružené" },
  { value: "FRONT_SUSPENSION", label: "Pouze přední (Hardtail)" },
  { value: "RIGID", label: "Pevné (Bez odpružení)" },
];

export const DEFAULT_DRIVE_TYPES: ListOption[] = [
  { value: "CONVENTIONAL", label: "Klasické" },
  { value: "ELECTRIC", label: "Elektrokolo (E-bike)" },
];

export const DEFAULT_DISCIPLINES: Record<string, ListOption[]> = {
  MTB: [
    { value: "ENDURO", label: "Enduro" },
    { value: "TRAIL", label: "Trail" },
    { value: "DOWNHILL", label: "Downhill" },
    { value: "XC", label: "XC / Maraton" },
  ],
  GRAVEL: [
    { value: "GRAVEL", label: "Gravel" },
    { value: "BIKEPACKING", label: "Bikepacking" },
    { value: "RACE", label: "Závodní" },
  ],
  ROAD: [
    { value: "ROAD", label: "Silnice" },
    { value: "ENDURANCE", label: "Vytrvalostní" },
    { value: "AERO", label: "Aero" },
    { value: "TT", label: "Časovka / Triatlon" },
  ],
  CYCLOCROSS: [{ value: "CYCLOCROSS", label: "Cyklokros" }],
  CITY_URBAN: [
    { value: "COMMUTER", label: "Dojíždění" },
    { value: "CITY", label: "Městské" },
  ],
  TOURING: [{ value: "TOURING", label: "Touring" }],
  DIRT_PUMPTRACK: [
    { value: "DIRT", label: "Dirt" },
    { value: "PUMPTRACK", label: "Pumptrack" },
  ],
  OTHER: [{ value: "OTHER", label: "Jiné" }],
};

export interface ResolvedLists {
  bikeCategories: ListOption[];
  suspensionTypes: ListOption[];
  driveTypes: ListOption[];
  disciplines: Record<string, ListOption[]>;
}

/** Řazení A–Z podle českých pravidel (bez ohledu na velikost písmen). */
export function compareCs(a: string, b: string): number {
  return a.localeCompare(b, "cs", { sensitivity: "base", numeric: true });
}

export function sortOptions(options: ListOption[]): ListOption[] {
  return [...options].sort((a, b) => compareCs(a.label, b.label));
}

export function resolveLists(settings?: Pick<UserSettings, "customLists"> | null): ResolvedLists {
  const c: CustomLists = settings?.customLists ?? {};
  const disciplines = { ...DEFAULT_DISCIPLINES, ...(c.disciplines ?? {}) };
  return {
    bikeCategories: sortOptions(c.bikeCategories ?? DEFAULT_BIKE_CATEGORIES),
    suspensionTypes: sortOptions(c.suspensionTypes ?? DEFAULT_SUSPENSION_TYPES),
    driveTypes: sortOptions(c.driveTypes ?? DEFAULT_DRIVE_TYPES),
    disciplines: Object.fromEntries(Object.entries(disciplines).map(([k, v]) => [k, sortOptions(v)])),
  };
}

/** Popisek hodnoty; pro hodnotu, která už v seznamu není, vrací původní text. */
export function labelFor(options: ListOption[] | undefined, value: string): string {
  return options?.find((o) => o.value === value)?.label ?? value;
}

/** Vytvoří stabilní hodnotu z popisku, unikátní vůči existujícím volbám. */
export function makeOptionValue(label: string, existing: ListOption[]): string {
  const base =
    label
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "CUSTOM";
  let value = base;
  let i = 2;
  while (existing.some((o) => o.value === value)) value = `${base}_${i++}`;
  return value;
}

/** "Kategorie • Disciplína" bez prázdných částí (prázdný výběr = prázdný řetězec). */
export function bikeKindLabel(
  lists: ResolvedLists,
  bike: { category?: string | null; discipline?: string | null },
): string {
  const category = bike.category ? labelFor(lists.bikeCategories, bike.category) : "";
  const discipline = bike.discipline ? labelFor(lists.disciplines[bike.category ?? ""], bike.discipline) : "";
  return [category, discipline].filter(Boolean).join(" • ");
}

/** Kategorie komponent seřazené A–Z podle českého názvu (pro dropdowny). */
export function sortCategoriesAz<T extends { nameCs: string }>(categories: T[]): T[] {
  return [...categories].sort((a, b) => compareCs(a.nameCs, b.nameCs));
}

/** Výchozí vlastní pole pro vestavěné kategorie, dokud si je uživatel sám neupraví (viz getCategorySpecFields). */
export const DEFAULT_CATEGORY_SPEC_FIELDS: Record<string, ComponentSpecField[]> = {
  TIRE_FRONT: [
    { key: "wheelDiameter", label: "Průměr", placeholder: 'např. 29", 27.5"' },
    { key: "tireWidth", label: "Šířka pláště", placeholder: 'např. 2.4"' },
    { key: "tireCasing", label: "Kostra", placeholder: "např. DoubleDown, DH, EXO+" },
    { key: "tireCompound", label: "Směs", placeholder: "např. MaxxGrip, MaxxTerra" },
  ],
  TIRE_REAR: [
    { key: "wheelDiameter", label: "Průměr", placeholder: 'např. 29", 27.5"' },
    { key: "tireWidth", label: "Šířka pláště", placeholder: 'např. 2.4"' },
    { key: "tireCasing", label: "Kostra", placeholder: "např. DoubleDown, DH, EXO+" },
    { key: "tireCompound", label: "Směs", placeholder: "např. MaxxGrip, MaxxTerra" },
  ],
  WHEELS: [{ key: "wheelDiameter", label: "Průměr", placeholder: 'např. 29", 27.5"' }],
};

/** Klíče, které se historicky ukládaly jako pevná pole Component místo Component.customFields. */
export const LEGACY_COMPONENT_SPEC_KEYS = ["wheelDiameter", "tireWidth", "tireCasing", "tireCompound"] as const;

/** Efektivní sada vlastních polí kategorie: uloženo na kategorii, jinak výchozí podle `code`, jinak žádná. */
export function getCategorySpecFields(category: Pick<ComponentCategory, "code" | "specFields"> | null | undefined): ComponentSpecField[] {
  if (!category) return [];
  if (category.specFields) return category.specFields;
  return DEFAULT_CATEGORY_SPEC_FIELDS[category.code] ?? [];
}

/** Hodnota vlastního pole komponenty (legacy pevné schéma, nebo customFields podle klíče). */
export function getComponentSpecValue(
  component: Pick<Component, "customFields" | "wheelDiameter" | "tireWidth" | "tireCasing" | "tireCompound">,
  key: string,
): string | null {
  const value = (LEGACY_COMPONENT_SPEC_KEYS as readonly string[]).includes(key)
    ? (component as Record<string, unknown>)[key]
    : component.customFields?.[key];
  return (value as string) || null;
}

/** Zdvih (mm) komponenty podle jejího vlastního pole se štítkem obsahujícím "zdvih" (napr. "Zdvih (mm)"). */
export function getComponentTravelMm(
  component: Component | null | undefined,
  category: Pick<ComponentCategory, "code" | "specFields"> | null | undefined,
): number | null {
  if (!component || !category) return null;
  const field = getCategorySpecFields(category).find((f) => f.label.toLowerCase().includes("zdvih"));
  if (!field) return null;
  const raw = getComponentSpecValue(component, field.key);
  if (!raw) return null;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Vytvoří stabilní klíč vlastního pole z popisku, unikátní vůči existujícím polím kategorie. */
export function makeSpecFieldKey(label: string, existing: ComponentSpecField[]): string {
  const base =
    label
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "FIELD";
  let key = base;
  let i = 2;
  while (existing.some((f) => f.key === key)) key = `${base}_${i++}`;
  return key;
}
