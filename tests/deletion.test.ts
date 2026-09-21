/**
 * Tests for BikeVault deletion domain logic (cascading deletes without dangling references).
 */

import assert from "node:assert";
import { createEmptyVaultData } from "../src/constants/defaultData";
import {
  deleteBikeFromData,
  deleteComponentFromData,
  deleteOdometerEntryFromData,
  deleteServiceEventFromData,
  clearVaultData,
} from "../src/lib/domain/deletion";
import { BikeVaultData, Bike, Component } from "../src/types/vault";

console.log("\n=== RUNNING BIKEVAULT DELETION TESTS ===\n");

const NOW = "2026-01-01T10:00:00.000Z";

function makeBike(id: string): Bike {
  return {
    id,
    name: `Bike ${id}`,
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
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function makeComponent(id: string, status: Component["status"]): Component {
  return {
    id,
    categoryId: "cat",
    manufacturer: "C",
    model: id,
    initialKm: 0,
    initialMinutes: 0,
    currency: "CZK",
    status,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

/**
 * bike-1 with comp-1 (installed now), comp-2 (removed earlier, in storage),
 * bike-2 with comp-3. Full set of related records.
 */
function createDataset(): BikeVaultData {
  const data = createEmptyVaultData();
  data.bikes = [makeBike("bike-1"), makeBike("bike-2")];
  data.components = [
    makeComponent("comp-1", "INSTALLED"),
    makeComponent("comp-2", "IN_STORAGE"),
    makeComponent("comp-3", "INSTALLED"),
  ];
  data.componentInstallations = [
    { id: "inst-1", bikeId: "bike-1", componentId: "comp-1", slot: "FORK", installedAt: NOW, installedBikeKm: 0, installedBikeMinutes: 0, createdAt: NOW },
    { id: "inst-2", bikeId: "bike-1", componentId: "comp-2", slot: "SHOCK", installedAt: NOW, installedBikeKm: 0, installedBikeMinutes: 0, removedAt: NOW, removedBikeKm: 100, removedBikeMinutes: 100, createdAt: NOW },
    { id: "inst-3", bikeId: "bike-2", componentId: "comp-3", slot: "FORK", installedAt: NOW, installedBikeKm: 0, installedBikeMinutes: 0, createdAt: NOW },
  ];
  data.odometerEntries = [
    { id: "odo-3", bikeId: "bike-1", recordedAt: NOW, entryDate: "2026-03-01", entryType: "RIDE", deltaKm: 100, deltaMinutes: 200, resultingKm: 300, resultingMinutes: 600, createdAt: "2026-03-01T10:00:00.000Z" },
    { id: "odo-2", bikeId: "bike-1", recordedAt: NOW, entryDate: "2026-02-01", entryType: "RIDE", deltaKm: 150, deltaMinutes: 300, resultingKm: 200, resultingMinutes: 400, createdAt: "2026-02-01T10:00:00.000Z" },
    { id: "odo-1", bikeId: "bike-1", recordedAt: NOW, entryDate: "2026-01-01", entryType: "INITIAL", deltaKm: 0, deltaMinutes: 0, resultingKm: 50, resultingMinutes: 100, createdAt: "2026-01-01T10:00:00.000Z" },
    { id: "odo-b2", bikeId: "bike-2", recordedAt: NOW, entryDate: "2026-01-01", entryType: "INITIAL", deltaKm: 0, deltaMinutes: 0, resultingKm: 0, resultingMinutes: 0, createdAt: NOW },
  ];
  data.serviceSchedules = [
    { id: "sch-bike1", bikeId: "bike-1", name: "Bike 1 service", conditionType: "WHICHEVER_FIRST", isActive: true, createdAt: NOW },
    { id: "sch-comp1", bikeId: "bike-2", componentId: "comp-1", name: "Comp 1 service", conditionType: "WHICHEVER_FIRST", isActive: true, createdAt: NOW },
    { id: "sch-bike2", bikeId: "bike-2", name: "Bike 2 service", conditionType: "WHICHEVER_FIRST", isActive: true, lastServiceDate: "2026-02-10", lastServiceBikeKm: 90, lastServiceBikeHours: 3, createdAt: NOW },
  ];
  data.serviceEvents = [
    { id: "se-1", bikeId: "bike-1", componentId: "comp-1", serviceScheduleId: "sch-comp1", eventType: "MAINTENANCE", serviceDate: "2026-02-01", bikeKm: 10, bikeMinutes: 60, performedBy: "SELF", description: "Fork", laborPrice: 0, partsPrice: 100, totalPrice: 100, currency: "CZK", createdAt: NOW },
    { id: "se-b2-old", bikeId: "bike-2", serviceScheduleId: "sch-bike2", eventType: "MAINTENANCE", serviceDate: "2026-01-10", bikeKm: 50, bikeMinutes: 120, performedBy: "SELF", description: "Old", laborPrice: 0, partsPrice: 0, totalPrice: 0, currency: "CZK", createdAt: "2026-01-10T10:00:00.000Z" },
    { id: "se-b2-new", bikeId: "bike-2", serviceScheduleId: "sch-bike2", eventType: "MAINTENANCE", serviceDate: "2026-02-10", bikeKm: 90, bikeMinutes: 180, performedBy: "SELF", description: "New", laborPrice: 0, partsPrice: 200, totalPrice: 200, currency: "CZK", createdAt: "2026-02-10T10:00:00.000Z" },
  ];
  data.bikeSetups = [
    { id: "setup-1", bikeId: "bike-1", forkInstallationId: "inst-1", shockInstallationId: "inst-2", updatedAt: NOW },
    { id: "setup-2", bikeId: "bike-2", forkInstallationId: "inst-3", updatedAt: NOW },
  ];
  data.setupSnapshots = [
    { id: "snap-1", bikeId: "bike-1", profileName: "P", snapshotData: {}, createdAt: NOW },
    { id: "snap-2", bikeId: "bike-2", profileName: "P", snapshotData: {}, createdAt: NOW },
  ];
  data.financialTransactions = [
    { id: "fin-bike-1", bikeId: "bike-1", type: "EXPENSE", category: "BIKE_PURCHASE", amount: 1000, currency: "CZK", transactionDate: "2025-01-01", createdAt: NOW },
    { id: "fin-comp-1", bikeId: "bike-1", componentId: "comp-1", type: "EXPENSE", category: "COMPONENT_PURCHASE", amount: 500, currency: "CZK", transactionDate: "2025-01-02", createdAt: NOW },
    { id: "fin-se-1", bikeId: "bike-1", componentId: "comp-1", serviceEventId: "se-1", type: "EXPENSE", category: "SERVICE_PARTS", amount: 100, currency: "CZK", transactionDate: "2026-02-01", createdAt: NOW },
    { id: "fin-se-b2-new", bikeId: "bike-2", serviceEventId: "se-b2-new", type: "EXPENSE", category: "SERVICE_PARTS", amount: 200, currency: "CZK", transactionDate: "2026-02-10", createdAt: NOW },
  ];
  return data;
}

// 1. Deleting a bike (STORAGE) removes its records and returns installed components to storage
{
  const next = deleteBikeFromData(createDataset(), "bike-1", "STORAGE");
  assert.deepStrictEqual(next.bikes.map((b) => b.id), ["bike-2"]);
  assert.strictEqual(next.odometerEntries.every((o) => o.bikeId !== "bike-1"), true);
  assert.strictEqual(next.componentInstallations.every((i) => i.bikeId !== "bike-1"), true);
  assert.strictEqual(next.serviceSchedules.some((s) => s.id === "sch-bike1"), false);
  assert.strictEqual(next.serviceEvents.some((e) => e.id === "se-1"), false);
  assert.deepStrictEqual(next.bikeSetups.map((s) => s.id), ["setup-2"]);
  assert.deepStrictEqual(next.setupSnapshots.map((s) => s.id), ["snap-2"]);
  assert.strictEqual(next.components.find((c) => c.id === "comp-1")?.status, "IN_STORAGE");
  assert.strictEqual(next.components.find((c) => c.id === "comp-2")?.status, "IN_STORAGE");
  assert.strictEqual(next.components.find((c) => c.id === "comp-3")?.status, "INSTALLED", "Other bikes are untouched");
  console.log("✅ PASSED Test 1: Bike deleted, installed components returned to storage.");
}

// 2. In STORAGE mode component purchase survives (unlinked from the bike), bike/service costs are removed
{
  const next = deleteBikeFromData(createDataset(), "bike-1", "STORAGE");
  const ids = next.financialTransactions.map((t) => t.id).sort();
  assert.deepStrictEqual(ids, ["fin-comp-1", "fin-se-b2-new"]);
  assert.strictEqual(next.financialTransactions.find((t) => t.id === "fin-comp-1")?.bikeId, null);
  console.log("✅ PASSED Test 2: Component purchase is kept, bike-bound transactions removed.");
}

// 3. Deleting a bike (DELETE) also removes installed components and their dependants
{
  const next = deleteBikeFromData(createDataset(), "bike-1", "DELETE");
  assert.strictEqual(next.components.some((c) => c.id === "comp-1"), false);
  assert.strictEqual(next.components.some((c) => c.id === "comp-2"), true, "Historically installed component is kept");
  assert.strictEqual(next.serviceSchedules.some((s) => s.id === "sch-comp1"), false, "Component schedule on other bike removed");
  assert.strictEqual(next.financialTransactions.some((t) => t.id === "fin-comp-1"), false);
  console.log("✅ PASSED Test 3: Bike deleted together with its installed components.");
}

// 4. Deleting a component removes installations/schedules/purchases, keeps service events unlinked, nulls setup refs
{
  const next = deleteComponentFromData(createDataset(), "comp-1");
  assert.strictEqual(next.components.some((c) => c.id === "comp-1"), false);
  assert.strictEqual(next.componentInstallations.some((i) => i.componentId === "comp-1"), false);
  assert.strictEqual(next.serviceSchedules.some((s) => s.componentId === "comp-1"), false);
  const event = next.serviceEvents.find((e) => e.id === "se-1");
  assert.ok(event, "Service event stays in bike history");
  assert.strictEqual(event?.componentId, null);
  assert.strictEqual(event?.serviceScheduleId, null, "Reference to the removed schedule is cleared");
  assert.strictEqual(next.financialTransactions.some((t) => t.id === "fin-comp-1"), false, "Purchase removed");
  assert.strictEqual(next.financialTransactions.find((t) => t.id === "fin-se-1")?.componentId, null, "Service cost stays, unlinked");
  assert.strictEqual(next.bikeSetups.find((s) => s.id === "setup-1")?.forkInstallationId, null);
  assert.strictEqual(next.bikeSetups.find((s) => s.id === "setup-1")?.shockInstallationId, "inst-2", "Other slots untouched");
  console.log("✅ PASSED Test 4: Component deleted with cascade and no dangling references.");
}

// 5. Only the latest odometer entry can be deleted and it rolls the bike back
{
  const data = createDataset();
  const ok = deleteOdometerEntryFromData(data, "odo-3");
  assert.strictEqual(ok.success, true);
  assert.strictEqual(ok.data.odometerEntries.some((o) => o.id === "odo-3"), false);
  const bike = ok.data.bikes.find((b) => b.id === "bike-1");
  assert.strictEqual(bike?.currentKm, 200);
  assert.strictEqual(bike?.currentMinutes, 400);

  const older = deleteOdometerEntryFromData(data, "odo-2");
  assert.strictEqual(older.success, false, "Older entry cannot be deleted");
  assert.strictEqual(older.data, data);

  const initial = deleteOdometerEntryFromData(data, "odo-1");
  assert.strictEqual(initial.success, false, "Initial state cannot be deleted");

  const missing = deleteOdometerEntryFromData(data, "nope");
  assert.strictEqual(missing.success, false);
  console.log("✅ PASSED Test 5: Odometer entry deletion is limited to the latest entry and rolls counters back.");
}

// 6. Deleting a service event removes its transaction and recomputes the schedule's last service
{
  const next = deleteServiceEventFromData(createDataset(), "se-b2-new");
  assert.strictEqual(next.serviceEvents.some((e) => e.id === "se-b2-new"), false);
  assert.strictEqual(next.financialTransactions.some((t) => t.serviceEventId === "se-b2-new"), false);
  const schedule = next.serviceSchedules.find((s) => s.id === "sch-bike2");
  assert.strictEqual(schedule?.lastServiceDate, "2026-01-10");
  assert.strictEqual(schedule?.lastServiceBikeKm, 50);
  assert.strictEqual(schedule?.lastServiceBikeHours, 2);

  const last = deleteServiceEventFromData(next, "se-b2-old");
  const cleared = last.serviceSchedules.find((s) => s.id === "sch-bike2");
  assert.strictEqual(cleared?.lastServiceDate, null, "No events left, schedule resets");
  assert.strictEqual(cleared?.lastServiceBikeKm, null);

  const unknown = createDataset();
  assert.strictEqual(deleteServiceEventFromData(unknown, "nope"), unknown);
  console.log("✅ PASSED Test 6: Service event deleted with its payment, schedule recomputed.");
}

// 7. Clearing all data keeps categories and settings
{
  const data = createDataset();
  const cleared = clearVaultData(data);
  assert.strictEqual(cleared.bikes.length, 0);
  assert.strictEqual(cleared.components.length, 0);
  assert.strictEqual(cleared.componentInstallations.length, 0);
  assert.strictEqual(cleared.odometerEntries.length, 0);
  assert.strictEqual(cleared.serviceSchedules.length, 0);
  assert.strictEqual(cleared.serviceEvents.length, 0);
  assert.strictEqual(cleared.bikeSetups.length, 0);
  assert.strictEqual(cleared.setupSnapshots.length, 0);
  assert.strictEqual(cleared.financialTransactions.length, 0);
  assert.strictEqual(cleared.categories, data.categories);
  assert.strictEqual(cleared.settings, data.settings);
  console.log("✅ PASSED Test 7: Clear all removes user data, keeps categories and settings.");
}

console.log("\n🎉 ALL 7 / 7 DELETION TESTS PASSED SUCCESSFULLY!\n");
