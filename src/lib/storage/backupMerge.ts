import { BikeVaultData } from "@/types/vault";
import { createEmptyVaultData } from "@/constants/defaultData";
import { validateAndParseBackup } from "@/lib/storage/storageService";

/** Collections a restore merges, keyed by record `id`. Settings are never touched. */
type RecordCollectionKey = Exclude<keyof BikeVaultData, "version" | "updatedAt" | "settings">;

const GROUPS: { key: RecordCollectionKey; label: string }[] = [
  { key: "bikes", label: "Kola" },
  { key: "components", label: "Komponenty" },
  { key: "componentInstallations", label: "Montáže komponent" },
  { key: "odometerEntries", label: "Záznamy tachometru" },
  { key: "serviceSchedules", label: "Servisní plány" },
  { key: "serviceEvents", label: "Servisní záznamy" },
  { key: "bikeSetups", label: "Nastavení odpružení a plášťů" },
  { key: "setupSnapshots", label: "Uložené profily nastavení" },
  { key: "financialTransactions", label: "Finanční transakce" },
  { key: "categories", label: "Kategorie komponent" },
];

export interface RestorePreviewGroup {
  label: string;
  added: number;
  existing: number;
}

export interface RestorePreview {
  groups: RestorePreviewGroup[];
  totalAdded: number;
}

type WithId = { id: string };

function hasValidId(record: unknown): record is WithId {
  return !!record && typeof record === "object" && typeof (record as WithId).id === "string" && (record as WithId).id !== "";
}

/** Backup records that would be added: valid id, not in current data, first occurrence only. */
function recordsToAdd<T>(current: readonly T[], incoming: readonly T[]): T[] {
  const seen = new Set((current as readonly unknown[]).filter(hasValidId).map((r) => r.id));
  const added: T[] = [];
  for (const record of incoming) {
    if (!hasValidId(record) || seen.has(record.id)) continue;
    seen.add(record.id);
    added.push(record);
  }
  return added;
}

/**
 * Parses and validates a backup file for restore. Rejects files written by a newer schema
 * version than this app understands, so their data are never merged half-understood.
 */
export function parseBackupForRestore(jsonContent: string): BikeVaultData {
  const backup = validateAndParseBackup(jsonContent);
  const supportedVersion = createEmptyVaultData().version;
  if (backup.version > supportedVersion) {
    throw new Error(
      `Záloha pochází z novější verze BikeVault (schéma ${backup.version}, podporováno ${supportedVersion}).`
    );
  }
  return backup;
}

/** Counts what mergeBackupData would do, per collection. Groups with no records are omitted. */
export function buildRestorePreview(backup: BikeVaultData, current: BikeVaultData): RestorePreview {
  const groups = GROUPS.map(({ key, label }) => {
    const incoming = (backup[key] as unknown[]).filter(hasValidId);
    const added = recordsToAdd(current[key] as unknown[], incoming).length;
    return { label, added, existing: incoming.length - added };
  }).filter((g) => g.added > 0 || g.existing > 0);
  return { groups, totalAdded: groups.reduce((sum, g) => sum + g.added, 0) };
}

/**
 * Add-only merge of a backup into current data: a backup record is appended only when its id
 * is not present yet. Existing records are never overwritten or removed and settings stay as they are.
 */
export function mergeBackupData(current: BikeVaultData, backup: BikeVaultData): BikeVaultData {
  const next: BikeVaultData = { ...current };
  for (const { key } of GROUPS) {
    const added = recordsToAdd(current[key] as unknown[], backup[key] as unknown[]);
    if (added.length > 0) {
      (next as unknown as Record<RecordCollectionKey, unknown[]>)[key] = [...(current[key] as unknown[]), ...added];
    }
  }
  return next;
}
