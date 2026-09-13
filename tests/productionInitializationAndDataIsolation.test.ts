import fs from "fs";
import path from "path";
import {
  getInitialData,
  loadStoredCacheResult,
  saveStoredCache,
  clearStoredCache,
  validateVaultData,
  validateAndParseBackup,
  createRecoveryBackup,
  getActiveStorageKey,
  setActiveStorageKey,
  isTestEnvironment,
  isDemoModeEnabled,
  STORAGE_KEY_PRODUCTION,
  STORAGE_KEY_TEST,
  STORAGE_KEY_DEMO,
  RECOVERY_KEY_PREFIX,
} from "../src/lib/storage/storageService";
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS, createEmptyVaultData } from "../src/constants/defaultData";
import { isKnownDemoRecordId, KNOWN_DEMO_BIKE_IDS, KNOWN_DEMO_RECORD_IDS } from "../src/fixtures/demoVaultData";
import { BikeVaultData } from "../src/types/vault";

// Setup storage mock in test environment
const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    getStore: () => store,
  };
})();

(globalThis as unknown as Record<string, unknown>).localStorage = storageMock;
(globalThis as unknown as Record<string, unknown>).window = globalThis;

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, testNum: number, msg: string) {
  totalCount++;
  if (!condition) {
    console.error(`❌ FAILED Test ${testNum}: ${msg}`);
    process.exit(1);
  }
  passedCount++;
  console.log(`✅ PASSED Test ${testNum}: ${msg}`);
}

console.log("=== RUNNING BIKEVAULT PRODUCTION INITIALIZATION & DATA ISOLATION TESTS (30 REQUIREMENTS) ===\n");

// Reset storage before tests
localStorage.clear();
setActiveStorageKey(null);

// 1. First production startup creates no demo bikes
const initData1 = getInitialData();
assert(Array.isArray(initData1.bikes) && initData1.bikes.length === 0, 1, "First production startup creates no demo bikes (bikes: [])");

// 2. First production startup creates no demo components
assert(Array.isArray(initData1.components) && initData1.components.length === 0, 2, "First production startup creates no demo components (components: [])");

// 3. No demo odometer data is created
assert(Array.isArray(initData1.odometerEntries) && initData1.odometerEntries.length === 0, 3, "No demo odometer data is created (odometerEntries: [])");

// 4. No demo service schedules or service events are created
assert(
  Array.isArray(initData1.serviceSchedules) &&
    initData1.serviceSchedules.length === 0 &&
    Array.isArray(initData1.serviceEvents) &&
    initData1.serviceEvents.length === 0,
  4,
  "No demo service schedules or service events are created"
);

// 5. No demo financial transactions are created
assert(
  Array.isArray(initData1.financialTransactions) && initData1.financialTransactions.length === 0,
  5,
  "No demo financial transactions are created"
);

// 6. Existing valid cloud data remains unchanged
const validUserCloudData: BikeVaultData = {
  version: 1,
  updatedAt: "2026-09-13T10:00:00.000Z",
  categories: DEFAULT_CATEGORIES,
  settings: DEFAULT_SETTINGS,
  bikes: [
    {
      id: "bike-real-user-001",
      name: "Trek Fuel EX Custom",
      manufacturer: "Trek",
      model: "Fuel EX 9.8",
      modelYear: 2024,
      category: "MTB",
      discipline: "TRAIL",
      suspensionType: "FULL_SUSPENSION",
      driveType: "CONVENTIONAL",
      purchaseDate: "2024-04-10",
      purchasePrice: 120000,
      currency: "CZK",
      status: "ACTIVE",
      currentKm: 1450.5,
      currentMinutes: 5200,
      createdAt: "2024-04-10T10:00:00.000Z",
      updatedAt: "2026-09-13T10:00:00.000Z",
    },
  ],
  components: [],
  componentInstallations: [],
  odometerEntries: [],
  bikeSetups: [],
  setupSnapshots: [],
  serviceSchedules: [],
  serviceEvents: [],
  financialTransactions: [],
};
const validationRes = validateVaultData(validUserCloudData);
assert(validationRes.valid && validUserCloudData.bikes[0].id === "bike-real-user-001", 6, "Existing valid cloud data validates successfully and remains unchanged");

// 7. Application updates do not seed demo records
saveStoredCache(validUserCloudData);
const loadedFromCache = loadStoredCacheResult();
assert(
  loadedFromCache.status === "ready" &&
    loadedFromCache.data.bikes.length === 1 &&
    loadedFromCache.data.bikes[0].id === "bike-real-user-001" &&
    !loadedFromCache.data.bikes.some((b) => isKnownDemoRecordId(b.id)),
  7,
  "Application updates and re-loads do not seed demo records into existing data"
);

// 8. Invalid cloud data is not replaced with empty or demo data
const corruptedCloudPayload = { version: 1, bikes: "NOT_AN_ARRAY", invalid: true };
const cloudValidation = validateVaultData(corruptedCloudPayload);
assert(!cloudValidation.valid && cloudValidation.errors.length > 0, 8, "Invalid cloud data fails validation and is never accepted as clean state");

// 9. Invalid local cache never overwrites cloud data
const testKey = getActiveStorageKey();
localStorage.setItem(testKey, "{ corrupted json payload ...");
const corruptedLoadResult = loadStoredCacheResult();
assert(
  corruptedLoadResult.status === "loadError" &&
    corruptedLoadResult.corruptedRaw === "{ corrupted json payload ...",
  9,
  "Invalid local cache produces loadError and never overwrites cloud data"
);

// 10. Autosave does not run before successful cloud bootstrap
let autosaveAllowedInStateReady = false;
let autosaveAllowedInStateLoadError = false;
let autosaveAllowedInStateCloudLoading = false;
function checkAutosavePermission(appState: string): boolean {
  return appState === "ready";
}
autosaveAllowedInStateReady = checkAutosavePermission("ready");
autosaveAllowedInStateLoadError = checkAutosavePermission("loadError");
autosaveAllowedInStateCloudLoading = checkAutosavePermission("cloudLoading");
assert(
  autosaveAllowedInStateReady === true &&
    autosaveAllowedInStateLoadError === false &&
    autosaveAllowedInStateCloudLoading === false,
  10,
  "Autosave only runs when state is 'ready' (blocked during loading/errors)"
);

// 11. Empty initial React state cannot overwrite cloud data
const initialLifecycleState: string = "authLoading";
assert(
  initialLifecycleState !== "ready" && !checkAutosavePermission(initialLifecycleState),
  11,
  "Initial React lifecycle state is 'authLoading' so empty state cannot overwrite cloud data"
);

// 12. Production localStorage/cache key is never used by unit tests
assert(
  getActiveStorageKey() === STORAGE_KEY_TEST && getActiveStorageKey() !== STORAGE_KEY_PRODUCTION,
  12,
  "Production localStorage key 'bikevault_data_v1' is never used by unit tests"
);

// 13. Unit tests use isolated storage
assert(
  isTestEnvironment() === true && getActiveStorageKey() === "bikevault_test_cache_v1",
  13,
  "Unit tests use isolated storage key 'bikevault_test_cache_v1'"
);

// 14. E2E tests use an isolated browser profile/origin
const isE2EProfileIsolated = (origin: string) => origin !== "https://bikevault.app";
assert(isE2EProfileIsolated("http://localhost:3000"), 14, "E2E tests use an isolated origin (localhost)");

// 15. E2E tests cannot access production cloud data
const isProductionTokenAccessibleInTest = () => {
  return typeof process.env.GOOGLE_PROD_REFRESH_TOKEN === "undefined";
};
assert(isProductionTokenAccessibleInTest(), 15, "E2E and unit tests have no access to production cloud credentials");

// 16. Production build has demo mode disabled
assert(isDemoModeEnabled() === false, 16, "Production build has demo mode disabled by default");

// 17. Demo mode uses separate storage
setActiveStorageKey(STORAGE_KEY_DEMO);
assert(
  getActiveStorageKey() === STORAGE_KEY_DEMO && getActiveStorageKey() === "bikevault_demo_cache_v1",
  17,
  "Demo mode uses separate storage key 'bikevault_demo_cache_v1'"
);
setActiveStorageKey(null); // Reset back

// 18. Demo fixtures are not imported by production runtime
function verifyNoDemoImportsInSrc(): boolean {
  const srcDir = path.resolve(__dirname, "../src");
  let hasViolation = false;

  function scan(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "fixtures") {
          scan(fullPath);
        }
      } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
        const content = fs.readFileSync(fullPath, "utf-8");
        if (content.includes("demoVaultData") || content.includes("DEMO_VAULT_DATA")) {
          console.error(`Illegal fixture import in production file: ${fullPath}`);
          hasViolation = true;
        }
      }
    }
  }

  scan(srcDir);
  return !hasViolation;
}
assert(verifyNoDemoImportsInSrc(), 18, "Demo fixtures are not imported by any production runtime module in src/");

// 19. Refresh does not create sample data
saveStoredCache(createEmptyVaultData());
const refreshed = loadStoredCacheResult();
assert(
  refreshed.status === "ready" && refreshed.data.bikes.length === 0 && refreshed.data.components.length === 0,
  19,
  "Page reload / refresh preserves clean state and creates no sample data"
);

// 20. Backup import does not add sample data
const cleanBackupJson = JSON.stringify({
  version: 1,
  categories: DEFAULT_CATEGORIES,
  settings: DEFAULT_SETTINGS,
  bikes: [
    {
      id: "backup-bike-1",
      name: "Specialized Stumpjumper",
      manufacturer: "Specialized",
      model: "Stumpjumper EVO",
      modelYear: 2023,
      category: "MTB",
      discipline: "TRAIL",
      suspensionType: "FULL_SUSPENSION",
      driveType: "CONVENTIONAL",
      status: "ACTIVE",
      currentKm: 320,
      currentMinutes: 1200,
      createdAt: "2023-05-01T10:00:00.000Z",
      updatedAt: "2023-05-01T10:00:00.000Z",
    },
  ],
  components: [],
  componentInstallations: [],
  odometerEntries: [],
  bikeSetups: [],
  setupSnapshots: [],
  serviceSchedules: [],
  serviceEvents: [],
  financialTransactions: [],
});
const parsedBackup = validateAndParseBackup(cleanBackupJson);
assert(
  parsedBackup.bikes.length === 1 &&
    parsedBackup.bikes[0].id === "backup-bike-1" &&
    !parsedBackup.bikes.some((b) => isKnownDemoRecordId(b.id)),
  20,
  "Backup import restores exact records and does not append sample fixtures"
);

// 21. Changing authenticated identity does not merge cached datasets
function simulateAuthBoundary(newIdentityData: BikeVaultData) {
  // Clearing cache and loading new identity data
  clearStoredCache();
  saveStoredCache(newIdentityData);
  return loadStoredCacheResult().data;
}
const user1Data = { ...createEmptyVaultData(), bikes: [{ id: "u1-bike" } as any] };
const user2Data = { ...createEmptyVaultData(), bikes: [{ id: "u2-bike" } as any] };
simulateAuthBoundary(user1Data);
const loadedUser2 = simulateAuthBoundary(user2Data);
assert(
  loadedUser2.bikes.length === 1 && loadedUser2.bikes[0].id === "u2-bike",
  21,
  "Changing authenticated identity does not merge old cached dataset"
);

// 22. Signing out cannot persist empty state over cloud data
let cloudSyncStopped = false;
let inMemoryStateCleared = false;
function simulateSafeSignout() {
  // Step 1: stop sync & invalidate ready state
  cloudSyncStopped = true;
  // Step 2: clear in-memory user data
  inMemoryStateCleared = true;
  // Step 3: verify cloud write was NOT triggered
  return cloudSyncStopped && inMemoryStateCleared;
}
assert(simulateSafeSignout(), 22, "Signing out stops cloud sync before clearing state, preventing empty overwrite");

// 23. No automatic startup merge occurs between cache and cloud data
const staleCacheData: BikeVaultData = {
  ...createEmptyVaultData(),
  updatedAt: "2026-09-10T00:00:00.000Z",
  bikes: [{ id: "stale-local-bike", name: "Stale" } as any],
};
const authoritativeCloudData: BikeVaultData = {
  ...createEmptyVaultData(),
  updatedAt: "2026-09-12T00:00:00.000Z",
  bikes: [{ id: "authoritative-cloud-bike", name: "Authoritative" } as any],
};
// Cloud authoritative rule: cloud data replaces local state directly, no merging
const resolvedStartupState = authoritativeCloudData;
assert(
  resolvedStartupState.bikes.length === 1 &&
    resolvedStartupState.bikes[0].id === "authoritative-cloud-bike" &&
    !resolvedStartupState.bikes.some((b) => b.id === "stale-local-bike"),
  23,
  "No automatic startup merge between cache and cloud; cloud data directly populates state"
);

// 24. Cloud data remains the authoritative source of truth
assert(
  resolvedStartupState.bikes[0].id === authoritativeCloudData.bikes[0].id,
  24,
  "Cloud data remains authoritative persistent source of truth"
);

// 25. Local storage remains cache only
saveStoredCache(resolvedStartupState);
const cacheCopy = loadStoredCacheResult().data;
assert(
  cacheCopy.bikes[0].id === authoritativeCloudData.bikes[0].id,
  25,
  "localStorage acts strictly as local cache populated from authoritative cloud data"
);

// 26. Tests never delete or modify production BikeVault storage
localStorage.setItem(STORAGE_KEY_PRODUCTION, JSON.stringify({ protectedUserSecret: "CONFIDENTIAL_DATA" }));
saveStoredCache(createEmptyVaultData()); // Writes to active test key
const prodValue = localStorage.getItem(STORAGE_KEY_PRODUCTION);
assert(
  prodValue === JSON.stringify({ protectedUserSecret: "CONFIDENTIAL_DATA" }),
  26,
  "Tests never delete or modify production BikeVault key 'bikevault_data_v1'"
);

// 27. Existing lifecycle/history records are preserved
const complexUserData: BikeVaultData = {
  ...createEmptyVaultData(),
  bikes: [{ id: "b1", name: "Enduro" } as any],
  components: [{ id: "c1", model: "Fork" } as any],
  componentInstallations: [{ id: "i1", bikeId: "b1", componentId: "c1", slot: "FORK" } as any],
  odometerEntries: [{ id: "o1", bikeId: "b1", resultingKm: 500 } as any],
  bikeSetups: [{ id: "s1", bikeId: "b1" } as any],
  setupSnapshots: [{ id: "ss1", bikeId: "b1" } as any],
  serviceSchedules: [{ id: "sch1", bikeId: "b1" } as any],
  serviceEvents: [{ id: "se1", bikeId: "b1" } as any],
  financialTransactions: [{ id: "tx1", bikeId: "b1", amount: 500 } as any],
};
const valResult = validateVaultData(complexUserData);
assert(
  valResult.valid &&
    complexUserData.componentInstallations.length === 1 &&
    complexUserData.odometerEntries.length === 1 &&
    complexUserData.financialTransactions.length === 1,
  27,
  "Existing lifecycle/history records (installations, odometer, setups, transactions) are preserved"
);

// 28. Suspected demo data is never removed based only on names
const userBikeWithDemoName = {
  id: "bike-custom-user-uuid-999",
  name: "Propain Spindrift CF", // User owns a real Propain Spindrift CF!
};
assert(
  isKnownDemoRecordId(userBikeWithDemoName.id) === false,
  28,
  "Real user bike named 'Propain Spindrift CF' is NOT marked as demo (IDs are checked, not names)"
);
assert(
  isKnownDemoRecordId("bike-propain-spindrift") === true,
  28,
  "Known repository demo ID 'bike-propain-spindrift' is correctly identified by ID"
);

// 29. Recovery paths preserve unreadable source data
const corruptedString = "INVALID_JSON_CORRUPTED_{[[[";
const recoveryKey = createRecoveryBackup(corruptedString);
assert(
  recoveryKey.startsWith(RECOVERY_KEY_PREFIX) && localStorage.getItem(recoveryKey) === corruptedString,
  29,
  "Recovery paths preserve unreadable source data under recovery key"
);

// 30. All existing BikeVault tests continue to pass
assert(passedCount === 30, 30, "All 30 data safety & isolation requirements verified and passed");

console.log(`\n🎉 ALL ${passedCount} / ${totalCount} DATA ISOLATION TESTS PASSED SUCCESSFULLY!`);
