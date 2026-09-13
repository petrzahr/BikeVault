import { BikeVaultData, ComponentCategory, UserSettings } from "@/types/vault";

export const DEFAULT_CATEGORIES: ComponentCategory[] = [
  { id: "cat-frame", code: "FRAME", nameCs: "Rám", nameEn: "Frame", defaultSlot: "FRAME", isSystem: true, sortOrder: 1 },
  { id: "cat-fork", code: "FORK", nameCs: "Vidlice", nameEn: "Fork", defaultSlot: "FORK", isSystem: true, sortOrder: 2 },
  { id: "cat-rear-shock", code: "REAR_SHOCK", nameCs: "Tlumič", nameEn: "Rear Shock", defaultSlot: "REAR_SHOCK", isSystem: true, sortOrder: 3 },
  { id: "cat-crankset", code: "CRANKSET", nameCs: "Kliky", nameEn: "Crankset", defaultSlot: "CRANKSET", isSystem: true, sortOrder: 4 },
  { id: "cat-bottom-bracket", code: "BOTTOM_BRACKET", nameCs: "Středové složení", nameEn: "Bottom Bracket", defaultSlot: "BOTTOM_BRACKET", isSystem: true, sortOrder: 5 },
  { id: "cat-rear-derailleur", code: "REAR_DERAILLEUR", nameCs: "Přehazovačka", nameEn: "Rear Derailleur", defaultSlot: "REAR_DERAILLEUR", isSystem: true, sortOrder: 6 },
  { id: "cat-cassette", code: "CASSETTE", nameCs: "Kazeta", nameEn: "Cassette", defaultSlot: "CASSETTE", isSystem: true, sortOrder: 7 },
  { id: "cat-chain", code: "CHAIN", nameCs: "Řetěz", nameEn: "Chain", defaultSlot: "CHAIN", isSystem: true, sortOrder: 8 },
  { id: "cat-shifter", code: "SHIFTER", nameCs: "Řazení", nameEn: "Shifter", defaultSlot: "SHIFTER", isSystem: true, sortOrder: 9 },
  { id: "cat-brakes", code: "BRAKES", nameCs: "Brzdy", nameEn: "Brakes", defaultSlot: "BRAKES", isSystem: true, sortOrder: 10 },
  { id: "cat-brake-rotors", code: "BRAKE_ROTORS", nameCs: "Brzdové kotouče", nameEn: "Brake Rotors", defaultSlot: "BRAKE_ROTORS", isSystem: true, sortOrder: 11 },
  { id: "cat-brake-pads", code: "BRAKE_PADS", nameCs: "Brzdové destičky", nameEn: "Brake Pads", defaultSlot: "BRAKE_PADS", isSystem: true, sortOrder: 12 },
  { id: "cat-wheels", code: "WHEELS", nameCs: "Kola / Výplety", nameEn: "Wheels", defaultSlot: "WHEELS", isSystem: true, sortOrder: 13 },
  { id: "cat-tire-front", code: "TIRE_FRONT", nameCs: "Přední plášť", nameEn: "Front Tire", defaultSlot: "FRONT_TIRE", isSystem: true, sortOrder: 14 },
  { id: "cat-tire-rear", code: "TIRE_REAR", nameCs: "Zadní plášť", nameEn: "Rear Tire", defaultSlot: "REAR_TIRE", isSystem: true, sortOrder: 15 },
  { id: "cat-handlebar", code: "HANDLEBAR", nameCs: "Řídítka", nameEn: "Handlebar", defaultSlot: "HANDLEBAR", isSystem: true, sortOrder: 16 },
  { id: "cat-stem", code: "STEM", nameCs: "Představec", nameEn: "Stem", defaultSlot: "STEM", isSystem: true, sortOrder: 17 },
  { id: "cat-headset", code: "HEADSET", nameCs: "Hlavové složení", nameEn: "Headset", defaultSlot: "HEADSET", isSystem: true, sortOrder: 18 },
  { id: "cat-seatpost", code: "SEATPOST", nameCs: "Sedlovka", nameEn: "Seatpost", defaultSlot: "SEATPOST", isSystem: true, sortOrder: 19 },
  { id: "cat-saddle", code: "SADDLE", nameCs: "Sedlo", nameEn: "Saddle", defaultSlot: "SADDLE", isSystem: true, sortOrder: 20 },
  { id: "cat-pedals", code: "PEDALS", nameCs: "Pedály", nameEn: "Pedals", defaultSlot: "PEDALS", isSystem: true, sortOrder: 21 },
  { id: "cat-other", code: "OTHER", nameCs: "Ostatní", nameEn: "Other", defaultSlot: "OTHER", isSystem: true, sortOrder: 99 },
];

export const DEFAULT_SETTINGS: UserSettings = {
  currency: "CZK",
  distanceUnit: "km",
  language: "cs",
  googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "169480893579-apfcrv1uoe82gasbqgekvmb1874vmm5t.apps.googleusercontent.com",
};

/**
 * Vrací čistou produkční datovou strukturu BikeVault.
 * Nikdy neobsahuje demonstrační kola, komponenty, jízdy, plány ani finance.
 */
export function createEmptyVaultData(): BikeVaultData {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    categories: DEFAULT_CATEGORIES,
    settings: DEFAULT_SETTINGS,
    bikes: [],
    components: [],
    componentInstallations: [],
    odometerEntries: [],
    bikeSetups: [],
    setupSnapshots: [],
    serviceSchedules: [],
    serviceEvents: [],
    financialTransactions: [],
  };
}

/**
 * Výchozí čistý produkční stav bez ukázkových dat.
 */
export const INITIAL_VAULT_DATA: BikeVaultData = createEmptyVaultData();
