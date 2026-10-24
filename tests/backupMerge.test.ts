/**
 * Tests for restoring a backup file: add-only merge by record id, preview counts, validation.
 */

import assert from "node:assert";
import { createEmptyVaultData } from "../src/constants/defaultData";
import { buildRestorePreview, mergeBackupData, parseBackupForRestore } from "../src/lib/storage/backupMerge";
import { BikeVaultData, Bike, BikeOdometerEntry } from "../src/types/vault";

console.log("\n=== RUNNING BIKEVAULT BACKUP MERGE TESTS ===\n");

const OLD = "2026-01-01T10:00:00.000Z";
const NEW = "2026-06-01T10:00:00.000Z";

function makeBike(id: string, name: string, updatedAt: string): Bike {
  return {
    id,
    name,
    manufacturer: "M",
    model: "X",
    category: "MTB",
    discipline: "TRAIL",
    suspensionType: "FULL_SUSPENSION",
    driveType: "CONVENTIONAL",
    purchaseDate: "2025-01-01",
    purchasePrice: 1000,
    currency: "CZK",
    status: "ACTIVE",
    currentKm: 300,
    currentMinutes: 600,
    createdAt: OLD,
    updatedAt,
  };
}

function makeOdometer(id: string, bikeId: string): BikeOdometerEntry {
  return {
    id,
    bikeId,
    recordedAt: OLD,
    entryDate: "2026-01-01",
    entryType: "RIDE",
    deltaKm: 10,
    deltaMinutes: 30,
    resultingKm: 310,
    resultingMinutes: 630,
    createdAt: OLD,
  };
}

function makeData(patch: Partial<BikeVaultData>): BikeVaultData {
  return { ...createEmptyVaultData(), ...patch };
}

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`✓ ${name}`);
}

const current = makeData({
  bikes: [makeBike("b1", "Current name", NEW)],
  odometerEntries: [makeOdometer("o1", "b1")],
  settings: { ...createEmptyVaultData().settings, currency: "EUR" },
});

const backup = makeData({
  // b1 has an older name in the backup and must not overwrite the current one
  bikes: [makeBike("b1", "Backup name", OLD), makeBike("b2", "Restored bike", OLD)],
  odometerEntries: [makeOdometer("o1", "b1"), makeOdometer("o2", "b2")],
  settings: { ...createEmptyVaultData().settings, currency: "USD" },
});

test("adds only records whose id is missing", () => {
  const merged = mergeBackupData(current, backup);
  assert.deepStrictEqual(merged.bikes.map((b) => b.id), ["b1", "b2"]);
  assert.deepStrictEqual(merged.odometerEntries.map((o) => o.id), ["o1", "o2"]);
});

test("never overwrites existing records, even if the backup copy differs", () => {
  const merged = mergeBackupData(current, backup);
  assert.strictEqual(merged.bikes.find((b) => b.id === "b1")?.name, "Current name");
  assert.strictEqual(merged.bikes.find((b) => b.id === "b1")?.updatedAt, NEW);
});

test("never removes records missing from the backup", () => {
  const emptyBackup = makeData({ categories: [] });
  const merged = mergeBackupData(current, emptyBackup);
  assert.deepStrictEqual(merged.bikes, current.bikes);
  assert.deepStrictEqual(merged.odometerEntries, current.odometerEntries);
  assert.deepStrictEqual(merged.categories, current.categories);
});

test("keeps current settings", () => {
  const merged = mergeBackupData(current, backup);
  assert.strictEqual(merged.settings.currency, "EUR");
});

test("does not mutate inputs", () => {
  const snapshot = JSON.stringify(current);
  mergeBackupData(current, backup);
  assert.strictEqual(JSON.stringify(current), snapshot);
});

test("merges categories by id", () => {
  const custom = { id: "cat-custom", code: "CUSTOM", nameCs: "Vlastní", nameEn: "Custom", isSystem: false, sortOrder: 99 };
  const merged = mergeBackupData(current, makeData({ categories: [...current.categories, custom] }));
  assert.strictEqual(merged.categories.length, current.categories.length + 1);
  assert.ok(merged.categories.some((c) => c.id === "cat-custom"));
});

test("keeps the first duplicate id inside a valid backup", () => {
  const dupBackup = makeData({
    bikes: [makeBike("b3", "First", OLD), makeBike("b3", "Duplicate", OLD)],
  });
  const merged = mergeBackupData(current, dupBackup);
  assert.deepStrictEqual(merged.bikes.map((b) => b.name), ["Current name", "First"]);
  const preview = buildRestorePreview(dupBackup, current);
  assert.deepStrictEqual(preview.groups.find((g) => g.label === "Kola"), { label: "Kola", added: 1, existing: 1 });
});

test("rejects the whole backup instead of skipping a record without id", () => {
  const invalid = makeData({ bikes: [makeBike("b3", "Valid", OLD), makeBike("", "Invalid", OLD)] });
  const original = JSON.stringify(current);
  assert.throws(() => parseBackupForRestore(JSON.stringify(invalid)), /bikes\[1\].id/);
  assert.throws(() => buildRestorePreview(invalid, current), /bikes\[1\].id/);
  assert.throws(() => mergeBackupData(current, invalid), /bikes\[1\].id/);
  assert.strictEqual(JSON.stringify(current), original);
});

test("preview counts match the merge result", () => {
  const preview = buildRestorePreview(backup, current);
  assert.deepStrictEqual(preview.groups.find((g) => g.label === "Kola"), { label: "Kola", added: 1, existing: 1 });
  assert.deepStrictEqual(preview.groups.find((g) => g.label === "Záznamy tachometru"), {
    label: "Záznamy tachometru",
    added: 1,
    existing: 1,
  });
  const merged = mergeBackupData(current, backup);
  const addedTotal =
    merged.bikes.length - current.bikes.length + (merged.odometerEntries.length - current.odometerEntries.length);
  assert.strictEqual(preview.totalAdded, addedTotal);
  assert.ok(!preview.groups.some((g) => g.label === "Servisní záznamy"), "empty groups are omitted");
});

test("restoring the same data again adds nothing", () => {
  const merged = mergeBackupData(current, backup);
  assert.strictEqual(buildRestorePreview(backup, merged).totalAdded, 0);
});

test("parseBackupForRestore accepts a valid backup", () => {
  const parsed = parseBackupForRestore(JSON.stringify(backup));
  assert.strictEqual(parsed.bikes.length, 2);
});

test("parseBackupForRestore rejects invalid JSON and structure", () => {
  assert.throws(() => parseBackupForRestore("not json"));
  assert.throws(() => parseBackupForRestore(JSON.stringify({ version: 1, bikes: [] })), /platnou strukturu/);
});

test("parseBackupForRestore rejects a newer schema version", () => {
  assert.throws(() => parseBackupForRestore(JSON.stringify({ ...backup, version: 99 })), /novější verze/);
});

console.log(`\n${passed} backup merge tests passed.\n`);
