import { z } from "zod";
import { BikeVaultData } from "@/types/vault";
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS } from "@/constants/defaultData";

export const SUPPORTED_VAULT_VERSION = 1;

const text = z.string();
const number = z.number().finite();
const optionalText = text.nullish();
const optionalNumber = number.nullish();

/** V1 readers have historically accepted sparse records. Validate supplied fields,
 * without making today's TypeScript-required fields mandatory retroactively. */
function record(shape: z.ZodRawShape) {
  return z.object(shape).partial().extend({ id: text.min(1) }).passthrough();
}

const setupFields = {
  forkInstallationId: optionalText, shockInstallationId: optionalText,
  frontTireInstallationId: optionalText, rearTireInstallationId: optionalText,
  forkPressurePsi: optionalNumber, forkSagPercent: optionalNumber,
  forkReboundClicks: optionalNumber, forkLscClicks: optionalNumber, forkHscClicks: optionalNumber,
  forkLsrClicks: optionalNumber, forkHsrClicks: optionalNumber,
  forkVolumeSpacers: optionalNumber, forkTravelMm: optionalNumber, forkNotes: optionalText,
  shockPressurePsi: optionalNumber, shockSagPercent: optionalNumber,
  shockReboundClicks: optionalNumber, shockLscClicks: optionalNumber, shockHscClicks: optionalNumber,
  shockLsrClicks: optionalNumber, shockHsrClicks: optionalNumber,
  shockVolumeSpacers: optionalNumber, shockNotes: optionalText,
  frontTirePressureBar: optionalNumber, frontTireInsert: optionalText, frontTireNotes: optionalText,
  rearTirePressureBar: optionalNumber, rearTireInsert: optionalText, rearTireNotes: optionalText,
  generalNotes: optionalText,
};
const option = z.object({ value: text, label: text }).passthrough();
const customLists = z.object({
  bikeCategories: z.array(option).optional(), suspensionTypes: z.array(option).optional(),
  driveTypes: z.array(option).optional(), disciplines: z.record(z.array(option)).optional(),
}).passthrough();

const documentSchema = z.object({
  version: z.literal(SUPPORTED_VAULT_VERSION),
  updatedAt: text.optional(),
  bikes: z.array(record({
    name: text, manufacturer: text, model: text, modelYear: optionalNumber, frameSize: optionalText,
    category: text, discipline: text, suspensionType: text, driveType: text,
    serialNumber: optionalText, purchaseDate: text, purchasePrice: number, currency: text,
    status: z.enum(["ACTIVE", "INACTIVE", "SOLD", "ARCHIVED"]),
    soldDate: optionalText, soldPrice: optionalNumber, currentKm: number, currentMinutes: number,
    weightKg: optionalNumber, imageUrl: optionalText, uploadedImage: optionalText,
    uploadedImageData: optionalText, notes: optionalText, stravaGearId: optionalText,
    createdAt: text, updatedAt: text,
  })),
  components: z.array(record({
    categoryId: text, manufacturer: text, model: text, variant: optionalText, serialNumber: optionalText,
    initialKm: number, initialMinutes: number, purchaseDate: optionalText, purchasePrice: optionalNumber,
    currency: text, warrantyUntil: optionalText,
    status: z.enum(["INSTALLED", "IN_STORAGE", "SOLD", "DAMAGED", "DISCARDED"]),
    soldDate: optionalText, soldPrice: optionalNumber, wheelDiameter: optionalText, tireWidth: optionalText,
    tireCasing: optionalText, tireCompound: optionalText, isTubeless: z.boolean(),
    dampingAdjusters: z.array(z.enum(["LSC", "HSC", "LSR", "HSR"])).nullish(),
    customFields: z.record(text).nullish(), notes: optionalText, createdAt: text, updatedAt: text,
  })),
  componentInstallations: z.array(record({
    bikeId: text, componentId: text, slot: text, installedAt: text, installedBikeKm: number,
    installedBikeMinutes: number, removedAt: optionalText, removedBikeKm: optionalNumber,
    removedBikeMinutes: optionalNumber, createdAt: text,
  })),
  odometerEntries: z.array(record({
    bikeId: text, recordedAt: text, entryDate: text, entryType: z.enum(["RIDE", "CORRECTION", "INITIAL"]),
    source: text, deltaKm: number, deltaMinutes: number, resultingKm: number, resultingMinutes: number,
    note: optionalText, createdAt: text,
  })),
  bikeSetups: z.array(record({ bikeId: text, ...setupFields, updatedAt: text })),
  setupSnapshots: z.array(record({
    bikeId: text, profileName: text,
    snapshotData: z.object(setupFields).passthrough(), notes: optionalText, createdAt: text,
  })),
  serviceSchedules: z.array(record({
    bikeId: optionalText, componentId: optionalText, componentCategoryId: optionalText, name: text,
    intervalKm: optionalNumber, intervalHours: optionalNumber, intervalMonths: optionalNumber,
    conditionType: z.enum(["WHICHEVER_FIRST", "ALL_MET"]),
    warningThresholdHours: optionalNumber, warningThresholdKm: optionalNumber, notes: optionalText,
    lastServiceDate: optionalText, lastServiceBikeKm: optionalNumber, lastServiceBikeHours: optionalNumber,
    isActive: z.boolean(), createdAt: text,
  })),
  serviceEvents: z.array(record({
    serviceScheduleId: optionalText, bikeId: text, componentId: optionalText,
    eventType: z.enum(["MAINTENANCE", "REPAIR", "INSPECTION", "UPGRADE"]), serviceDate: text,
    bikeKm: number, bikeMinutes: number, performedBy: z.enum(["SELF", "SHOP"]), shopName: optionalText,
    description: text, laborPrice: number, partsPrice: number, totalPrice: number, currency: text,
    notes: optionalText, createdAt: text,
  })),
  financialTransactions: z.array(record({
    bikeId: optionalText, componentId: optionalText, serviceEventId: optionalText,
    type: z.enum(["EXPENSE", "INCOME"]),
    category: z.enum(["BIKE_PURCHASE", "BIKE_SALE", "COMPONENT_PURCHASE", "COMPONENT_SALE",
      "SERVICE_LABOR", "SERVICE_PARTS", "CONSUMABLES", "UPGRADE", "ACCESSORY", "REFUND", "OTHER"]),
    amount: number, currency: text, transactionDate: text, notes: optionalText, createdAt: text,
  })),
  categories: z.array(record({
    code: text, nameCs: text, nameEn: text, defaultSlot: optionalText, isSystem: z.boolean(), sortOrder: number,
    specFields: z.array(z.object({ key: text, label: text }).passthrough()).nullish(),
  })),
  settings: z.object({
    currency: z.enum(["CZK", "EUR", "USD"]).optional(), distanceUnit: z.enum(["km", "mi"]).optional(),
    language: z.enum(["cs", "en"]).optional(), googleClientId: text.optional(), customLists: customLists.optional(),
  }).passthrough(),
}).passthrough();

function fieldPath(path: (string | number)[]): string {
  return path.reduce<string>((result, part) => typeof part === "number"
    ? `${result}[${part}]` : `${result}${result ? "." : ""}${part}`, "") || "document";
}

export function validateVaultData(data: unknown): { valid: boolean; errors: string[] } {
  const result = documentSchema.safeParse(data);
  if (result.success) return { valid: true, errors: [] };
  // Never include Zod messages: enum errors can contain values from user records.
  return { valid: false, errors: result.error.issues.map((issue) => {
    if (issue.path.length === 1 && issue.path[0] === "version" &&
        typeof (data as { version?: unknown }).version === "number" &&
        (data as { version: number }).version > SUPPORTED_VAULT_VERSION) {
      return "version: Dokument pochází z novější verze BikeVault (podporováno schéma 1).";
    }
    return `${fieldPath(issue.path)}: Neplatná nebo chybějící hodnota (${issue.code}).`;
  }) };
}

/** Return the original document, never Zod's cloned/stripped/transformed output. */
export function interpretVaultDocument(data: unknown): BikeVaultData {
  const validation = validateVaultData(data);
  if (!validation.valid) throw new Error(validation.errors.join("; "));
  return data as BikeVaultData;
}

/** Preserve the existing backup-only defaults and timestamp normalization. */
export function validateAndParseBackup(jsonContent: string): BikeVaultData {
  const parsed: unknown = JSON.parse(jsonContent);
  const validation = validateVaultData(parsed);
  if (!validation.valid) {
    throw new Error(`Záložní soubor neobsahuje platnou strukturu BikeVault: ${validation.errors.join("; ")}`);
  }
  const candidate = parsed as BikeVaultData;
  return {
    ...candidate,
    categories: candidate.categories.length ? candidate.categories : DEFAULT_CATEGORIES,
    settings: { ...DEFAULT_SETTINGS, ...candidate.settings },
    updatedAt: new Date().toISOString(),
  };
}
