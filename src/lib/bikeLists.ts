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

export function resolveLists(settings?: Pick<UserSettings, "customLists"> | null): ResolvedLists {
  const c: CustomLists = settings?.customLists ?? {};
  return {
    bikeCategories: c.bikeCategories ?? DEFAULT_BIKE_CATEGORIES,
    suspensionTypes: c.suspensionTypes ?? DEFAULT_SUSPENSION_TYPES,
    driveTypes: c.driveTypes ?? DEFAULT_DRIVE_TYPES,
    disciplines: { ...DEFAULT_DISCIPLINES, ...(c.disciplines ?? {}) },
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
