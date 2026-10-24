import assert from "node:assert/strict";
import { createEmptyVaultData } from "../src/constants/defaultData";
import { Bike, BikeVaultData, Component, ComponentInstallation } from "../src/types/vault";
import { installComponent, removeComponent, transferComponent, quickReplaceComponent } from "../src/lib/domain/installations";

const BEFORE = "2026-01-01T10:00:00.000Z";
const runtime = { now: "2026-10-23T10:00:00.000Z", id: "new-record" };

function bike(id: string, currentKm: number, currentMinutes: number): Bike {
  return { id, name: id, manufacturer: "M", model: "X", category: "MTB", discipline: "TRAIL",
    suspensionType: "FULL_SUSPENSION", driveType: "CONVENTIONAL", purchaseDate: "2025-01-01",
    purchasePrice: 1000, currency: "CZK", status: "ACTIVE", currentKm, currentMinutes,
    createdAt: BEFORE, updatedAt: BEFORE };
}
function component(id: string, status: Component["status"]): Component {
  return { id, categoryId: "cat", manufacturer: "M", model: "X", initialKm: 12, initialMinutes: 34,
    currency: "CZK", status, createdAt: BEFORE, updatedAt: BEFORE };
}
function installation(id: string, componentId: string, bikeId = "source", slot = "fork"): ComponentInstallation {
  return { id, componentId, bikeId, slot, installedAt: BEFORE, installedBikeKm: 100,
    installedBikeMinutes: 200, createdAt: BEFORE };
}
function fixture(): BikeVaultData {
  const data = createEmptyVaultData();
  data.bikes = [bike("source", 350, 720), bike("target", 900, 1500)];
  data.components = [component("old", "INSTALLED"), component("replacement", "IN_STORAGE"), component("occupied", "INSTALLED")];
  data.componentInstallations = [installation("active", "old"), installation("occupied-inst", "occupied", "target")];
  data.bikeSetups = [
    { id: "setup", bikeId: "source", forkInstallationId: "active", shockInstallationId: "active",
      frontTireInstallationId: "active", rearTireInstallationId: "active", forkPressurePsi: 70, updatedAt: BEFORE },
    { id: "other", bikeId: "target", forkInstallationId: "occupied-inst", updatedAt: BEFORE },
  ];
  data.odometerEntries = [{ id: "odo", bikeId: "source", recordedAt: BEFORE, entryDate: "2026-01-01",
    entryType: "INITIAL", deltaKm: 100, deltaMinutes: 200, resultingKm: 100, resultingMinutes: 200, createdAt: BEFORE }];
  data.setupSnapshots = [{ id: "snapshot", bikeId: "source", profileName: "Original", snapshotData: { forkPressurePsi: 70 }, createdAt: BEFORE }];
  data.financialTransactions = [{ id: "purchase", bikeId: "source", componentId: "old", type: "EXPENSE",
    category: "COMPONENT_PURCHASE", amount: 500, currency: "CZK", transactionDate: "2026-01-01", createdAt: BEFORE }];
  return data;
}
function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function rejected(data: BikeVaultData, operation: () => unknown, message: RegExp): void {
  const before = structuredClone(data);
  freeze(data);
  assert.throws(operation, message);
  assert.deepEqual(data, before, "Rejection must leave the entire input unchanged");
}
function snapshots(result: BikeVaultData, sourceKm: number, sourceMinutes: number, targetKm: number, targetMinutes: number) {
  const closed = result.componentInstallations.find((i) => i.id === "active")!;
  const opened = result.componentInstallations[0];
  assert.equal(closed.removedAt, runtime.now);
  assert.equal(closed.removedBikeKm, sourceKm);
  assert.equal(closed.removedBikeMinutes, sourceMinutes);
  assert.equal(closed.installedBikeKm, 100);
  assert.equal(closed.installedBikeMinutes, 200);
  assert.equal(closed.installedAt, BEFORE);
  assert.equal(opened.installedBikeKm, targetKm);
  assert.equal(opened.installedBikeMinutes, targetMinutes);
  assert.equal(opened.installedAt, runtime.now);
}

// Characterize installation displacement, history and unrelated records.
{
  const data = freeze(fixture());
  const result = installComponent(data, runtime, "source", "replacement", "fork");
  snapshots(result, 350, 720, 350, 720);
  assert.equal(result.components.find((c) => c.id === "old")!.status, "IN_STORAGE");
  assert.equal(result.components.find((c) => c.id === "replacement")!.status, "INSTALLED");
  assert.equal(result.components[0].initialKm, 12);
  assert.equal(result.components[0].initialMinutes, 34);
  assert.equal(result.bikeSetups, data.bikeSetups);
  assert.equal(result.financialTransactions, data.financialTransactions);
  assert.equal(result.odometerEntries, data.odometerEntries);
  assert.equal(result.version, data.version);
}
{
  const data = freeze(fixture());
  const result = transferComponent(data, runtime, "active", "target", "rear");
  snapshots(result, 350, 720, 900, 1500);
  assert.equal(result.componentInstallations[0].slot, "rear");
  assert.equal(result.componentInstallations[0].bikeId, "target");
  assert.equal(result.components[0].status, "INSTALLED");
  assert.equal(result.bikeSetups, data.bikeSetups);
  assert.equal(result.financialTransactions, data.financialTransactions);
  assert.equal(result.odometerEntries, data.odometerEntries);
}
{
  const data = fixture();
  rejected(data, () => transferComponent(data, runtime, "active", "target", "fork"), /obsazena/);
}
{
  const data = fixture();
  rejected(data, () => transferComponent(data, runtime, "active", "source", "fork"), /obsazena/);
}
for (const operation of [
  (data: BikeVaultData) => transferComponent(data, runtime, "active", "target", "rear"),
  (data: BikeVaultData) => removeComponent(data, runtime, "active", "SOLD", 100),
  (data: BikeVaultData) => quickReplaceComponent(data, runtime, "source", "active", "replacement"),
]) {
  const data = fixture();
  data.componentInstallations[0].removedAt = BEFORE;
  rejected(data, () => operation(data), /aktivní/);
}
for (const status of ["INSTALLED", "IN_STORAGE"] as const) {
  const data = fixture();
  data.components[1].status = status;
  data.componentInstallations.push(installation("already-installed", "replacement", "target", "rear"));
  rejected(data, () => installComponent(data, runtime, "source", "replacement", "fork"), /skladu/);
  rejected(data, () => quickReplaceComponent(data, runtime, "source", "active", "replacement"), /skladu/);
}
for (const disposition of ["IN_STORAGE", "SOLD", "DAMAGED", "DISCARDED"] as const) {
  const data = freeze(fixture());
  const result = removeComponent(data, runtime, "active", disposition, 125, "2026-10-22");
  assert.equal(result.componentInstallations.length, data.componentInstallations.length);
  assert.equal(result.componentInstallations[0].removedBikeKm, 350);
  assert.equal(result.componentInstallations[0].removedBikeMinutes, 720);
  assert.equal(result.components[0].status, disposition);
  assert.equal(result.bikeSetups, data.bikeSetups);
  assert.equal(result.financialTransactions.at(-1), data.financialTransactions[0]);
  assert.equal(result.financialTransactions.length, disposition === "SOLD" ? 2 : 1);
  assert.equal(result.components[0].soldPrice, disposition === "SOLD" ? 125 : undefined);
  if (disposition === "SOLD") {
    assert.deepEqual(result.financialTransactions[0], { id: runtime.id, bikeId: "source", componentId: "old",
      type: "INCOME", category: "COMPONENT_SALE", amount: 125, currency: "CZK", transactionDate: "2026-10-22",
      notes: "Prodej demontovaného komponentu", createdAt: runtime.now });
  }
}
for (const price of [undefined, 0, -1]) {
  const result = removeComponent(freeze(fixture()), runtime, "active", "SOLD", price);
  assert.equal(result.financialTransactions.length, 1);
}
{
  const result = removeComponent(freeze(fixture()), runtime, "active", "SOLD", 50);
  assert.equal(result.financialTransactions[0].transactionDate, "2026-10-23");
  assert.equal(result.components[0].soldDate, undefined);
}
{
  const data = freeze(fixture());
  const result = quickReplaceComponent(data, runtime, "source", "active", "replacement");
  snapshots(result, 350, 720, 350, 720);
  assert.equal(result.components[0].status, "DISCARDED");
  assert.equal(result.components[1].status, "INSTALLED");
  for (const field of ["forkInstallationId", "shockInstallationId", "frontTireInstallationId", "rearTireInstallationId"] as const) {
    assert.equal(result.bikeSetups[0][field], runtime.id);
  }
  assert.equal(result.bikeSetups[0].forkPressurePsi, 70);
  assert.equal(result.bikeSetups[0].updatedAt, runtime.now);
  assert.equal(result.bikeSetups[1], data.bikeSetups[1]);
  assert.equal(result.financialTransactions, data.financialTransactions);
  assert.equal(result.setupSnapshots, data.setupSnapshots);
}
{
  const data = fixture();
  data.bikeSetups[0].shockInstallationId = "historical";
  const result = quickReplaceComponent(freeze(data), runtime, "source", "active", "replacement");
  assert.equal(result.bikeSetups[0].shockInstallationId, "historical");
}
{
  const data = fixture();
  rejected(data, () => quickReplaceComponent(data, runtime, "target", "active", "replacement"), /tomto kole/);
}
{
  const data = fixture();
  data.components[1].model = "Different";
  rejected(data, () => quickReplaceComponent(data, runtime, "source", "active", "replacement"), /neodpovídá/);
}
// A historical target installation does not occupy the slot.
{
  const data = fixture();
  data.componentInstallations[1].removedAt = BEFORE;
  const result = transferComponent(freeze(data), runtime, "active", "target", "fork");
  assert.equal(result.componentInstallations[0].bikeId, "target");
  assert.equal(result.componentInstallations.at(-1), data.componentInstallations[1]);
}
for (const operation of [
  (data: BikeVaultData) => installComponent(data, runtime, "missing", "replacement", "fork"),
  (data: BikeVaultData) => installComponent(data, runtime, "source", "missing", "fork"),
  (data: BikeVaultData) => removeComponent(data, runtime, "missing", "IN_STORAGE"),
  (data: BikeVaultData) => transferComponent(data, runtime, "active", "missing", "fork"),
  (data: BikeVaultData) => transferComponent(data, runtime, "missing", "target", "fork"),
  (data: BikeVaultData) => quickReplaceComponent(data, runtime, "source", "active", "missing"),
]) {
  const data = fixture();
  rejected(data, () => operation(data), /nebyl/);
}
{
  const data = fixture();
  data.components[1].status = "INSTALLED";
  rejected(data, () => installComponent(data, runtime, "source", "replacement", "fork"), /skladu/);
}
console.log("Installation lifecycle tests passed");
