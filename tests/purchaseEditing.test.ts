import assert from "node:assert/strict";
import { createEmptyVaultData } from "../src/constants/defaultData";
import { updateBikeInData, updateComponentInData } from "../src/lib/domain/purchaseEditing";
import type { Bike, Component, FinancialTransaction } from "../src/types/vault";

const now = "2026-10-24T10:00:00.000Z";
const common = { manufacturer: "Maker", model: "Model", purchasePrice: 100, purchaseDate: "2025-01-02", currency: "CZK", createdAt: "2025-01-02T00:00:00.000Z", updatedAt: "2025-01-02T00:00:00.000Z" };
const bike: Bike = { ...common, id: "bike", name: "Bike", category: "MTB", discipline: "TRAIL", suspensionType: "RIGID", driveType: "CONVENTIONAL", status: "ACTIVE", currentKm: 12, currentMinutes: 30 };
const component: Component = { ...common, id: "component", categoryId: "fork", initialKm: 0, initialMinutes: 0, status: "INSTALLED" };

for (const kind of ["bike", "component"] as const) {
  const category = kind === "bike" ? "BIKE_PURCHASE" : "COMPONENT_PURCHASE";
  const purchase: FinancialTransaction = { id: "purchase", bikeId: "bike", ...(kind === "component" ? { componentId: "component" } : {}), category, type: "EXPENSE", amount: 100, currency: "CZK", transactionDate: common.purchaseDate, createdAt: common.createdAt, notes: "Keep notes" };
  const unrelated: FinancialTransaction = { ...purchase, id: "service", category: "SERVICE_LABOR" };
  const duplicate = { ...purchase, id: "historical-duplicate", amount: 55 };
  const data = { ...createEmptyVaultData(), bikes: [bike], components: [component], financialTransactions: [unrelated, purchase, duplicate] };
  let generated = 0;
  const options = { now, generateTransactionId: () => { generated++; return "new-purchase"; } };
  const edit = (input: typeof data, updates: Partial<Bike & Component>, id: string = kind) => kind === "bike"
    ? updateBikeInData(input, id, updates, options)
    : updateComponentInData(input, id, updates, options);

  for (const updates of [{ purchasePrice: 250 }, { purchaseDate: "2026-09-01" }, { currency: "EUR" }, { purchasePrice: 75, purchaseDate: "2026-08-01", currency: "USD" }]) {
    const before = structuredClone(data);
    const result = edit(data, updates);
    assert.deepEqual(result.financialTransactions[1], { ...purchase, amount: updates.purchasePrice ?? 100, transactionDate: updates.purchaseDate ?? common.purchaseDate, currency: updates.currency ?? "CZK" });
    assert.equal(result.financialTransactions[0], unrelated);
    assert.equal(result.financialTransactions[2], duplicate);
    const { bikes: ignoredBikes, components: ignoredComponents, financialTransactions: ignoredTransactions, ...history } = result;
    const { bikes: originalBikes, components: originalComponents, financialTransactions: originalTransactions, ...originalHistory } = data;
    assert.deepEqual(history, originalHistory);
    assert.deepEqual(data, before);
    assert.equal(result[kind === "bike" ? "components" : "bikes"], data[kind === "bike" ? "components" : "bikes"]);
  }
  assert.equal(generated, 0);
  const identity = edit(data, { id: "replacement", notes: "Edited" });
  const entity = kind === "bike" ? identity.bikes[0] : identity.components[0];
  assert.equal(entity.id, kind);
  assert.equal(entity.updatedAt, now);
  assert.equal(identity.financialTransactions, data.financialTransactions);
  assert.deepEqual(edit(data, { purchasePrice: 0 }).financialTransactions, [unrelated, duplicate]);
  assert.deepEqual(edit(data, { currency: "EUR" }, "missing"), data);

  const missing = { ...data, financialTransactions: [unrelated] };
  const created = edit(missing, { currency: "EUR" }).financialTransactions[0];
  assert.equal(created.id, "new-purchase");
  assert.equal(created.amount, 100);
  assert.equal(created.currency, "EUR");
  assert.equal(created.transactionDate, common.purchaseDate);
  assert.equal(created.createdAt, now);
  assert.equal(created.category, category);
  assert.equal(created.bikeId, kind === "bike" ? "bike" : undefined);
  assert.equal(created.componentId, kind === "component" ? "component" : undefined);
  assert.deepEqual(edit(missing, { purchasePrice: 0 }).financialTransactions, [unrelated]);
  const fallback = edit(missing, { purchaseDate: "", currency: "" }).financialTransactions[0];
  assert.equal(fallback.transactionDate, "2026-10-24");
  assert.equal(fallback.currency, "CZK");
  assert.equal(edit(data, { purchaseDate: "" }).financialTransactions[1].transactionDate, common.purchaseDate);
}
console.log("Purchase editing tests passed");
