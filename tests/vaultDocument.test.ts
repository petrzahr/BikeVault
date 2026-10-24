import assert from "node:assert/strict";
import { createEmptyVaultData, DEFAULT_CATEGORIES, DEFAULT_SETTINGS } from "../src/constants/defaultData";
import { interpretVaultDocument, validateVaultData, validateAndParseBackup } from "../src/lib/storage/vaultDocument";
import { loadStoredCacheResult } from "../src/lib/storage/storageService";
import { CorruptedCloudDataError, downloadVaultData, uploadVaultData } from "../src/lib/google/driveSync";
import { buildRestorePreview, mergeBackupData, parseBackupForRestore } from "../src/lib/storage/backupMerge";
import { BikeVaultData } from "../src/types/vault";
import { DEMO_VAULT_DATA } from "../src/fixtures/demoVaultData";

// Characterized from the original JSON schema (451b47e), subsequent optional
// additions, and sparse-v1 fixtures in productionInitializationAndDataIsolation.
const historical = {
  ...createEmptyVaultData(),
  bikes: [{ id: "b1", name: "Legacy", modelYear: null, notes: null }],
  components: [{ id: "c1", model: "Fork", purchasePrice: null, customFields: null, dampingAdjusters: null }],
  componentInstallations: [{ id: "i1", bikeId: "b1", componentId: "c1", slot: "FORK", removedAt: null }],
  odometerEntries: [{ id: "o1", bikeId: "b1", resultingKm: 500 }],
  bikeSetups: [{ id: "s1", bikeId: "b1", forkReboundClicks: 5, shockReboundClicks: null, forkNotes: null }],
  setupSnapshots: [{ id: "ss1", bikeId: "b1", snapshotData: { forkReboundClicks: 4, shockPressurePsi: null } }],
  serviceSchedules: [{ id: "sch1", bikeId: "b1", componentId: null }],
  serviceEvents: [{ id: "se1", bikeId: "b1" }],
  financialTransactions: [{ id: "tx1", bikeId: "b1", amount: 500 }],
  categories: [{ id: "cat1", specFields: null }],
  settings: {},
};

async function main() {
  const originalFetch = globalThis.fetch;
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
  } });
  try {
    assert.equal(interpretVaultDocument(historical), historical);
    assert.equal(validateVaultData(createEmptyVaultData()).valid, true);
    assert.equal(validateVaultData(DEMO_VAULT_DATA).valid, true);
    const missingTimestamp = { ...historical } as Partial<typeof historical>;
    delete missingTimestamp.updatedAt;
    assert.equal(validateVaultData(missingTimestamp).valid, true);

    const extended = {
      ...historical, extension: { payload: [1, null] },
      bikes: [{ ...historical.bikes[0], extension: { nested: true } }],
      categories: [{ id: "cat1", extension: true, specFields: [{ key: "x", label: "X", placeholder: null, extra: 1 }] }],
      settings: { extra: 2, customLists: { extra: 3, bikeCategories: [{ value: "CUSTOM", label: "Custom", extra: 4 }] } },
      setupSnapshots: [{ id: "ss1", snapshotData: { forkPressurePsi: null, extra: { opaque: true } } }],
    };
    const raw = JSON.stringify(extended);
    assert.equal(JSON.stringify(interpretVaultDocument(JSON.parse(raw))), raw);
    const restored = validateAndParseBackup(raw);
    assert.deepEqual({ ...restored, updatedAt: extended.updatedAt }, {
      ...extended, settings: { ...DEFAULT_SETTINGS, ...extended.settings },
    });
    const normalized = validateAndParseBackup(JSON.stringify({ ...historical, categories: [] }));
    assert.deepEqual(normalized.categories, DEFAULT_CATEGORIES);
    assert.deepEqual(normalized.settings, DEFAULT_SETTINGS);
    assert.ok(!Number.isNaN(Date.parse(normalized.updatedAt)));

    for (const [key, value] of Object.entries(historical)) {
      if (!Array.isArray(value)) continue;
      const document = { ...historical, [key]: value.map((item) => ({ ...item, extension: { opaque: [null, true] } })) };
      const json = JSON.stringify(document);
      assert.equal(JSON.stringify(interpretVaultDocument(JSON.parse(json))), json, key);
    }

    const malformed = '{ "private": "DO_NOT_LOG", invalid JSON';
    store.set("test-vault", malformed);
    const parseFailure = loadStoredCacheResult("test-vault");
    assert.equal(parseFailure.status, "loadError");
    assert.equal(parseFailure.corruptedRaw, malformed);
    assert.equal(store.get("test-vault"), malformed);
    assert.equal(store.get(parseFailure.recoveryKey!), malformed);

    // Invalid known fields at every collection, including nested extension structures.
    const invalidCases: [string, unknown][] = [
      ["bikes[0].name", { bikes: [{ id: "b", name: 2 }] }],
      ["components[0].id", { components: [{ id: 2 }] }],
      ["components[0].id", { components: [{ model: "No id" }] }],
      ["components[0].id", { components: [{ id: "" }] }],
      ["components[0].customFields.x", { components: [{ id: "c", customFields: { x: 2 } }] }],
      ["components[0].dampingAdjusters[0]", { components: [{ id: "c", dampingAdjusters: ["PRIVATE_VALUE"] }] }],
      ["componentInstallations[0].installedBikeKm", { componentInstallations: [{ id: "i", installedBikeKm: "bad" }] }],
      ["odometerEntries[0].deltaKm", { odometerEntries: [{ id: "o", deltaKm: null }] }],
      ["bikeSetups[0].forkPressurePsi", { bikeSetups: [{ id: "s", forkPressurePsi: "bad" }] }],
      ["setupSnapshots[0].snapshotData.shockLsrClicks", { setupSnapshots: [{ id: "s", snapshotData: { shockLsrClicks: [] } }] }],
      ["serviceSchedules[0].isActive", { serviceSchedules: [{ id: "s", isActive: 1 }] }],
      ["serviceEvents[0].laborPrice", { serviceEvents: [{ id: "s", laborPrice: {} }] }],
      ["financialTransactions[0].amount", { financialTransactions: [{ id: "t", amount: "bad" }] }],
      ["categories[0].specFields[0].key", { categories: [{ id: "c", specFields: [{ key: 1, label: "X" }] }] }],
      ["settings.customLists.disciplines.MTB[0].label", { settings: { customLists: { disciplines: { MTB: [{ value: "X", label: false }] } } } }],
      ["version", { version: 99 }], ["version", { version: 1.5 }], ["version", { version: 0 }],
      ["settings", { settings: [] }], ["components[0]", { components: [null] }],
    ];
    const current = createEmptyVaultData();
    const currentRaw = JSON.stringify(current);
    for (const [path, patch] of invalidCases) {
      const invalid = { ...historical, ...patch as object };
      const invalidRaw = JSON.stringify(invalid);
      const validation = validateVaultData(invalid);
      assert.equal(validation.valid, false, path);
      assert.ok(validation.errors.some((error) => error.startsWith(`${path}:`)), path);
      assert.ok(!validation.errors.join().includes("PRIVATE_VALUE"));
      assert.throws(() => interpretVaultDocument(invalid));
      assert.throws(() => validateAndParseBackup(invalidRaw));
      assert.throws(() => parseBackupForRestore(invalidRaw));
      assert.throws(() => buildRestorePreview(invalid as BikeVaultData, current));
      assert.throws(() => mergeBackupData(current, invalid as BikeVaultData));
      assert.equal(JSON.stringify(current), currentRaw);

      store.clear();
      store.set("test-vault", invalidRaw);
      const result = loadStoredCacheResult("test-vault");
      assert.equal(result.status, "loadError");
      assert.equal(result.isNewInstall, false);
      assert.equal(result.corruptedRaw, invalidRaw);
      assert.equal(store.get("test-vault"), invalidRaw);
      assert.equal(store.get(result.recoveryKey!), invalidRaw);

      let requests = 0;
      globalThis.fetch = async (_input, init) => {
        requests++;
        assert.equal(init?.method ?? "GET", "GET");
        return new Response(invalidRaw, { status: 200 });
      };
      await assert.rejects(downloadVaultData("test-token", "test-file"), (error: unknown) => {
        assert.ok(error instanceof CorruptedCloudDataError);
        assert.deepEqual(error.rawPayload, invalid);
        assert.ok(error.message.includes(path));
        return true;
      });
      await assert.rejects(uploadVaultData("test-token", invalid as BikeVaultData));
      await assert.rejects(uploadVaultData("test-token", invalid as BikeVaultData, "existing-file"));
      assert.equal(requests, 1, "invalid upload must never call Drive");
    }
    store.set("test-vault", raw);
    assert.equal(JSON.stringify(loadStoredCacheResult("test-vault").data), raw);
    globalThis.fetch = async () => new Response(raw);
    assert.equal(JSON.stringify(await downloadVaultData("test-token", "test-file")), raw);
    const merged = mergeBackupData(current, restored);
    assert.deepEqual(merged.bikes, extended.bikes);
    assert.deepEqual(merged.setupSnapshots, extended.setupSnapshots);
    assert.equal(validateVaultData({ ...historical, financialTransactions: [{ id: "x", amount: Infinity }] }).valid, false);
    console.log("Vault document compatibility, validation and boundary tests passed.");
  } finally {
    globalThis.fetch = originalFetch;
    if (storageDescriptor) Object.defineProperty(globalThis, "localStorage", storageDescriptor);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
