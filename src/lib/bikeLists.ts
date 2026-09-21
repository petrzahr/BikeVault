import type { CustomLists, ListOption, UserSettings } from "@/types/vault";

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
