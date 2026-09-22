/**
 * BikeVault — Unified JSON Data Schema
 * Stored in Google Drive as bikevault_data.json and cached in localStorage.
 */

export interface UserSettings {
  currency: "CZK" | "EUR" | "USD";
  distanceUnit: "km" | "mi";
  language: "cs" | "en";
  googleClientId?: string;
  /** Uživatelem upravené seznamy voleb; chybějící klíč = výchozí seznam. */
  customLists?: CustomLists;
}

export interface ListOption {
  value: string;
  label: string;
}

export interface CustomLists {
  bikeCategories?: ListOption[];
  suspensionTypes?: ListOption[];
  driveTypes?: ListOption[];
  /** Disciplíny podle hodnoty kategorie kola. */
  disciplines?: Record<string, ListOption[]>;
}

export interface Bike {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  modelYear?: number | null;
  frameSize?: string | null;
  category: "MTB" | "GRAVEL" | "ROAD" | "E_BIKE" | "COMMUTER" | string;
  discipline: "ENDURO" | "TRAIL" | "DOWNHILL" | "XC" | "GRAVEL" | "ROAD" | string;
  suspensionType: "FULL_SUSPENSION" | "FRONT_SUSPENSION" | "RIGID" | string;
  driveType: "CONVENTIONAL" | "E_BIKE" | string;
  serialNumber?: string | null;
  purchaseDate: string; // YYYY-MM-DD
  purchasePrice: number;
  currency: string;
  status: "ACTIVE" | "INACTIVE" | "SOLD" | "ARCHIVED";
  soldDate?: string | null;
  soldPrice?: number | null;
  currentKm: number;
  currentMinutes: number;
  weightKg?: number | null;
  imageUrl?: string | null;
  uploadedImage?: string | null;
  uploadedImageData?: string | null;
  notes?: string | null;
  stravaGearId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BikeOdometerEntry {
  id: string;
  bikeId: string;
  recordedAt: string; // ISO string
  entryDate: string; // YYYY-MM-DD
  entryType: "RIDE" | "CORRECTION" | "INITIAL";
  source?: "MANUAL" | "STRAVA" | string;
  deltaKm: number;
  deltaMinutes: number;
  resultingKm: number;
  resultingMinutes: number;
  note?: string | null;
  createdAt: string;
}

/** Vlastní pole specifikace definované per-kategorii (systémová i uživatelská). */
export interface ComponentSpecField {
  /** Unikátní v rámci kategorie. Pro pole zděděná ze staršího pevného schématu (wheelDiameter, tireWidth, tireCasing, tireCompound) se hodnota ukládá přímo do Component, jinak do Component.customFields. */
  key: string;
  label: string;
  placeholder?: string | null;
}

export interface ComponentCategory {
  id: string;
  code: string;
  nameCs: string;
  nameEn: string;
  defaultSlot?: string | null;
  isSystem: boolean;
  sortOrder: number;
  /** Když chybí, použije se výchozí sada polí podle `code` (viz getCategorySpecFields). Prázdné pole = žádná specifická pole. */
  specFields?: ComponentSpecField[] | null;
}

export interface Component {
  id: string;
  categoryId: string;
  manufacturer: string;
  model: string;
  variant?: string | null;
  serialNumber?: string | null;
  initialKm: number;
  initialMinutes: number;
  purchaseDate?: string | null;
  purchasePrice?: number | null;
  currency: string;
  warrantyUntil?: string | null;
  status: "INSTALLED" | "IN_STORAGE" | "SOLD" | "DAMAGED" | "DISCARDED";
  soldDate?: string | null;
  soldPrice?: number | null;
  wheelDiameter?: string | null;
  tireWidth?: string | null;
  tireCasing?: string | null;
  tireCompound?: string | null;
  isTubeless?: boolean;
  /** Hodnoty vlastních polí specifikace mimo pevné schéma výše, klíčované podle ComponentSpecField.key. */
  customFields?: Record<string, string> | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComponentInstallation {
  id: string;
  bikeId: string;
  componentId: string;
  slot: string;
  installedAt: string; // ISO string
  installedBikeKm: number;
  installedBikeMinutes: number;
  removedAt?: string | null;
  removedBikeKm?: number | null;
  removedBikeMinutes?: number | null;
  createdAt: string;
}

export interface ServiceSchedule {
  id: string;
  bikeId?: string | null;
  componentId?: string | null;
  componentCategoryId?: string | null;
  name: string;
  intervalKm?: number | null;
  intervalHours?: number | null;
  intervalMonths?: number | null;
  conditionType: "WHICHEVER_FIRST" | "ALL_MET";
  warningThresholdHours?: number | null;
  warningThresholdKm?: number | null;
  notes?: string | null;
  lastServiceDate?: string | null;
  lastServiceBikeKm?: number | null;
  lastServiceBikeHours?: number | null;
  isActive: boolean;
  createdAt: string;
}

export interface ServiceEvent {
  id: string;
  serviceScheduleId?: string | null;
  bikeId: string;
  componentId?: string | null;
  eventType: "MAINTENANCE" | "REPAIR" | "INSPECTION" | "UPGRADE";
  serviceDate: string; // YYYY-MM-DD
  bikeKm: number;
  bikeMinutes: number;
  performedBy: "SELF" | "SHOP";
  shopName?: string | null;
  description: string;
  laborPrice: number;
  partsPrice: number;
  totalPrice: number;
  currency: string;
  notes?: string | null;
  createdAt: string;
}

export interface BikeSetup {
  id: string;
  bikeId: string;
  forkInstallationId?: string | null;
  shockInstallationId?: string | null;
  frontTireInstallationId?: string | null;
  rearTireInstallationId?: string | null;
  // Vidlice
  forkPressurePsi?: number | null;
  forkSagPercent?: number | null;
  forkLscClicks?: number | null;
  forkHscClicks?: number | null;
  forkLsrClicks?: number | null;
  forkHsrClicks?: number | null;
  forkVolumeSpacers?: number | null;
  forkTravelMm?: number | null;
  // Tlumič
  shockPressurePsi?: number | null;
  shockSagPercent?: number | null;
  shockLscClicks?: number | null;
  shockHscClicks?: number | null;
  shockLsrClicks?: number | null;
  shockHsrClicks?: number | null;
  shockVolumeSpacers?: number | null;
  // Pláště
  frontTirePressureBar?: number | null;
  frontTireInsert?: string | null;
  rearTirePressureBar?: number | null;
  rearTireInsert?: string | null;
  generalNotes?: string | null;
  updatedAt: string;
}

export interface SetupSnapshot {
  id: string;
  bikeId: string;
  profileName: string;
  snapshotData: Record<string, unknown>;
  notes?: string | null;
  createdAt: string;
}

export interface FinancialTransaction {
  id: string;
  bikeId?: string | null;
  componentId?: string | null;
  serviceEventId?: string | null;
  type: "EXPENSE" | "INCOME";
  category: "BIKE_PURCHASE" | "BIKE_SALE" | "COMPONENT_PURCHASE" | "COMPONENT_SALE" | "SERVICE_LABOR" | "SERVICE_PARTS" | "UPGRADE" | "ACCESSORY" | "OTHER";
  amount: number;
  currency: string;
  transactionDate: string; // YYYY-MM-DD
  notes?: string | null;
  createdAt: string;
}

export interface BikeVaultData {
  version: number;
  updatedAt: string;
  bikes: Bike[];
  components: Component[];
  componentInstallations: ComponentInstallation[];
  serviceSchedules: ServiceSchedule[];
  serviceEvents: ServiceEvent[];
  bikeSetups: BikeSetup[];
  setupSnapshots: SetupSnapshot[];
  odometerEntries: BikeOdometerEntry[];
  financialTransactions: FinancialTransaction[];
  categories: ComponentCategory[];
  settings: UserSettings;
}
