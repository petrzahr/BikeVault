import { BikeVaultData } from "@/types/vault";
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS, createEmptyVaultData } from "@/constants/defaultData";

export const STORAGE_KEY_PRODUCTION = "bikevault_data_v1";
export const STORAGE_KEY_TEST = "bikevault_test_cache_v1";
export const STORAGE_KEY_DEMO = "bikevault_demo_cache_v1";
export const RECOVERY_KEY_PREFIX = "bikevault_cache_recovery_";
export const OPERATION_RECOVERY_KEY = "bikevault_data_recovery_operation";
export const PRE_CLEANUP_BACKUP_KEY = "bikevault_data_backup_pre_cleanup";

export interface LoadCacheResult {
  status: "ready" | "loadError";
  data: BikeVaultData;
  isNewInstall: boolean;
  error?: string;
  recoveryKey?: string;
  corruptedRaw?: string;
}

export function isTestEnvironment(): boolean {
  const g = globalThis as Record<string, unknown>;
  const proc = g.process as { env?: Record<string, string>; argv?: string[] } | undefined;
  if (!proc) return false;
  return Boolean(
    proc.env?.NODE_ENV === "test" ||
    proc.env?.VITEST ||
    proc.env?.BIKEVAULT_TEST === "true" ||
    proc.env?.npm_lifecycle_event === "test" ||
    (Array.isArray(proc.argv) && proc.argv.some((arg) => arg.includes("test") || arg.includes(".test.") || arg.includes(".spec.")))
  );
}

export function isDemoModeEnabled(): boolean {
  const g = globalThis as Record<string, unknown>;
  const proc = g.process as { env?: Record<string, string> } | undefined;
  return Boolean(proc?.env?.NEXT_PUBLIC_ENABLE_DEMO_DATA === "true");
}

let activeStorageKeyOverride: string | null = null;

export function getActiveStorageKey(): string {
  if (activeStorageKeyOverride) return activeStorageKeyOverride;
  if (isTestEnvironment()) return STORAGE_KEY_TEST;
  if (isDemoModeEnabled()) return STORAGE_KEY_DEMO;
  return STORAGE_KEY_PRODUCTION;
}

export function setActiveStorageKey(key: string | null): void {
  activeStorageKeyOverride = key;
}

/**
 * Vrací čistou výchozí produkční datovou strukturu.
 * Nikdy neobsahuje ukázková kola, díly ani servis.
 */
export function getInitialData(): BikeVaultData {
  return createEmptyVaultData();
}

/**
 * Striktní validace schématu BikeVaultData.
 * Ověřuje, zda data obsahují povinné entity a kolekce.
 */
export function validateVaultData(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Data musí být platný JSON objekt."] };
  }

  const candidate = data as Partial<BikeVaultData>;

  if (typeof candidate.version !== "number" || candidate.version < 1) {
    errors.push("Chybí nebo je neplatná verze schématu (pole 'version').");
  }

  if (!Array.isArray(candidate.bikes)) {
    errors.push("Pole 'bikes' musí být pole.");
  }
  if (!Array.isArray(candidate.components)) {
    errors.push("Pole 'components' musí být pole.");
  }
  if (!Array.isArray(candidate.componentInstallations)) {
    errors.push("Pole 'componentInstallations' musí být pole.");
  }
  if (!Array.isArray(candidate.odometerEntries)) {
    errors.push("Pole 'odometerEntries' musí být pole.");
  }
  if (!Array.isArray(candidate.bikeSetups)) {
    errors.push("Pole 'bikeSetups' musí být pole.");
  }
  if (!Array.isArray(candidate.setupSnapshots)) {
    errors.push("Pole 'setupSnapshots' musí být pole.");
  }
  if (!Array.isArray(candidate.serviceSchedules)) {
    errors.push("Pole 'serviceSchedules' musí být pole.");
  }
  if (!Array.isArray(candidate.serviceEvents)) {
    errors.push("Pole 'serviceEvents' musí být pole.");
  }
  if (!Array.isArray(candidate.financialTransactions)) {
    errors.push("Pole 'financialTransactions' musí být pole.");
  }
  if (!Array.isArray(candidate.categories)) {
    errors.push("Pole 'categories' musí být pole.");
  }
  if (!candidate.settings || typeof candidate.settings !== "object") {
    errors.push("Chybí nebo je neplatný objekt uživatelského nastavení 'settings'.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Uloží poškozený obsah pod záložní recovery klíč do localStorage
 */
export function createRecoveryBackup(rawContent: string, prefix = RECOVERY_KEY_PREFIX): string {
  const recoveryKey = `${prefix}${Date.now()}`;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(recoveryKey, rawContent);
      console.info(`[BikeVault Recovery] Poškozená data byla uložena pod klíčem: ${recoveryKey}`);
    }
  } catch (err) {
    console.warn("Nepodařilo se vytvořit recovery záznam v úložišti:", err);
  }
  return recoveryKey;
}

/**
 * Bezpečně načte a zvaliduje data z lokální cache bez rizika přepsání poškozených dat.
 */
export function loadStoredCacheResult(targetKey?: string): LoadCacheResult {
  const key = targetKey || getActiveStorageKey();

  if (typeof localStorage === "undefined") {
    return {
      status: "ready",
      data: getInitialData(),
      isNewInstall: true,
    };
  }

  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return {
        status: "ready",
        data: getInitialData(),
        isNewInstall: true,
      };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (parseErr) {
      console.error("[BikeVault] Chyba parsování JSON v cache:", parseErr);
      const recoveryKey = createRecoveryBackup(raw);
      return {
        status: "loadError",
        data: getInitialData(),
        isNewInstall: false,
        error: "Data v lokální vyrovnávací paměti jsou poškozena (neplatný JSON). Původní data nebyla přepsána.",
        recoveryKey,
        corruptedRaw: raw,
      };
    }

    const validation = validateVaultData(parsed);
    if (!validation.valid) {
      console.error("[BikeVault] Neplatné schéma dat v cache:", validation.errors);
      const recoveryKey = createRecoveryBackup(raw);
      return {
        status: "loadError",
        data: getInitialData(),
        isNewInstall: false,
        error: `Data v lokální vyrovnávací paměti mají neplatnou strukturu: ${validation.errors.join("; ")}`,
        recoveryKey,
        corruptedRaw: raw,
      };
    }

    return {
      status: "ready",
      data: parsed as BikeVaultData,
      isNewInstall: false,
    };
  } catch (err) {
    console.error("Kritická chyba při čtení lokální cache:", err);
    return {
      status: "loadError",
      data: getInitialData(),
      isNewInstall: false,
      error: `Chyba při čtení lokální paměti: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Uloží stav aplikace do lokální cache (localStorage).
 */
export function saveStoredCache(data: BikeVaultData, targetKey?: string): void {
  const key = targetKey || getActiveStorageKey();
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error("[BikeVault] Chyba při zápisu do lokální cache:", err);
  }
}

/**
 * Vymaže lokální cache
 */
export function clearStoredCache(targetKey?: string): void {
  const key = targetKey || getActiveStorageKey();
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn("[BikeVault] Nepodařilo se vymazat lokální cache:", err);
  }
}

/**
 * Export poškozeného raw obsahu do textového JSON souboru
 */
export function exportCorruptedRawData(rawContent: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([rawContent], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const now = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `bikevault_poskozena_data_${now}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validace a načtení JSON souboru se zálohou (Backup).
 * Nikdy nepřidává demo fixtures ani vzorová data.
 */
export function validateAndParseBackup(jsonStr: string): BikeVaultData {
  const parsed = JSON.parse(jsonStr);
  const validation = validateVaultData(parsed);
  if (!validation.valid) {
    throw new Error(`Záložní soubor neobsahuje platnou strukturu BikeVault: ${validation.errors.join("; ")}`);
  }

  const candidate = parsed as BikeVaultData;
  return {
    ...candidate,
    categories: candidate.categories?.length ? candidate.categories : DEFAULT_CATEGORIES,
    settings: { ...DEFAULT_SETTINGS, ...candidate.settings },
    updatedAt: new Date().toISOString(),
  };
}
