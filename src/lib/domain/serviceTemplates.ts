/**
 * Architecture and definitions for BikeVault Service Templates (Doporučené šablony servisních plánů).
 * 
 * Templates provide standard maintenance recommendations from manufacturers or workshop best practices,
 * but are strictly distinguished from user-created service schedules.
 */

export interface ServiceTemplate {
  id: string;
  name: string;
  categoryCode: string; // FORK, REAR_SHOCK, CHAIN, BRAKES, FRAME, etc.
  intervalHours?: number;
  intervalKm?: number;
  intervalMonths?: number;
  conditionType: "WHICHEVER_FIRST";
  warningThresholdHours?: number;
  warningThresholdKm?: number;
  description: string;
  trustedSource: string;
  sourceUrl?: string;
}

export const PREDEFINED_SERVICE_TEMPLATES: ServiceTemplate[] = [
  // 1. Vidlice
  {
    id: "fork_lower_leg_50h",
    name: "Servis spodních nohou vidlice",
    categoryCode: "FORK",
    intervalHours: 50,
    conditionType: "WHICHEVER_FIRST",
    warningThresholdHours: 10,
    description: "Výměna mazacího oleje ve spodních nohách, vyčištění a promazání prachovek / pěnových kroužků.",
    trustedSource: "Doporučení RockShox / Fox (50h interval)",
  },
  {
    id: "fork_full_service_200h",
    name: "Kompletní servis vidlice (200 h / 12 měsíců)",
    categoryCode: "FORK",
    intervalHours: 200,
    intervalMonths: 12,
    conditionType: "WHICHEVER_FIRST",
    warningThresholdHours: 20,
    description: "Kompletní rozborka, výměna těsnění a oleje v tlumicí patroně (damper Charger / Grip2), servis vzduchové komory.",
    trustedSource: "Doporučení RockShox / Fox (200h / 1 rok)",
  },

  // 2. Zadní tlumič
  {
    id: "shock_air_sleeve_50h",
    name: "Základní servis vzduchové komory tlumiče",
    categoryCode: "REAR_SHOCK",
    intervalHours: 50,
    conditionType: "WHICHEVER_FIRST",
    warningThresholdHours: 10,
    description: "Vyčištění vzduchové komory (Air Can), výměna těsnění a promazání mazacím tukem/olejem.",
    trustedSource: "Doporučení RockShox / Fox (50h interval)",
  },
  {
    id: "shock_full_rebuild_200h",
    name: "Kompletní repase zadního tlumiče",
    categoryCode: "REAR_SHOCK",
    intervalHours: 200,
    intervalMonths: 12,
    conditionType: "WHICHEVER_FIRST",
    warningThresholdHours: 20,
    description: "Kompletní rozebrání tlumiče, vakuové odvzdušnění oleje, repase IFP pístku a dusíkové komory.",
    trustedSource: "Doporučení RockShox / Fox (200h / 1 rok)",
  },

  // 3. Řetěz
  {
    id: "chain_wear_check_1000km",
    name: "Kontrola vytažení řetězu měrkou",
    categoryCode: "CHAIN",
    intervalKm: 1000,
    conditionType: "WHICHEVER_FIRST",
    warningThresholdKm: 150,
    description: "Kontrola vytažení kalibrovanou měrkou (limit 0,5% pro 11/12sp sady). Včasná výměna chrání kazetu a převodník.",
    trustedSource: "Doporučení SRAM / Shimano / ParkTool",
  },

  // 4. Brzdy
  {
    id: "brake_bleed_annual",
    name: "Výměna brzdové kapaliny a odvzdušnění",
    categoryCode: "BRAKES",
    intervalMonths: 12,
    conditionType: "WHICHEVER_FIRST",
    description: "Kompletní proplach novou kapalinou (DOT 5.1 nebo Minerální olej) a dokonalé odvzdušnění systému.",
    trustedSource: "Doporučení SRAM / Shimano / Magura (1× ročně)",
  },

  // 5. Čepy rámu
  {
    id: "frame_pivot_inspection_100h",
    name: "Kontrola a dotažení ložisek čepů zadní stavby",
    categoryCode: "FRAME",
    intervalHours: 100,
    intervalMonths: 12,
    conditionType: "WHICHEVER_FIRST",
    warningThresholdHours: 15,
    description: "Kontrola vůle čepů celoodpruženého rámu, dotažení na předepsaný moment momentovým klíčem, kontrola hladkého chodu průmyslových ložisek.",
    trustedSource: "Dílenská praxe pro celoodpružená MTB kola",
  },

  // 6. Sedlovka
  {
    id: "dropper_service_100h",
    name: "Základní servis teleskopické sedlovky",
    categoryCode: "SEATPOST",
    intervalHours: 100,
    conditionType: "WHICHEVER_FIRST",
    warningThresholdHours: 15,
    description: "Vyčištění prachovky, promazání kluzných pouzder a kontrola tlaku ve vzduchové patroně.",
    trustedSource: "Doporučení OneUp / Fox Transfer / RockShox Reverb",
  },
];

/**
 * Get recommended templates for a specific category or component
 */
export function getTemplatesForCategory(categoryCode?: string): ServiceTemplate[] {
  if (!categoryCode) return PREDEFINED_SERVICE_TEMPLATES;
  return PREDEFINED_SERVICE_TEMPLATES.filter((t) => t.categoryCode === categoryCode);
}
