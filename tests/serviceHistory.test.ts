/**
 * Test Suite for the bike service history rows (/bikes/[id]/service).
 *
 * Bug: BikeServiceClient treated getBikeServiceEvents() results as
 * { event, component } wrappers and read partsCost/laborCost/otherCost, but the
 * data is a flat ServiceEvent[] with partsPrice/laborPrice/totalPrice. Any bike
 * with a service event crashed with "Cannot read properties of undefined
 * (reading 'partsCost')".
 *
 * Run: npx tsx tests/serviceHistory.test.ts
 */

import assert from "node:assert";
import { toServiceHistoryRows } from "../src/lib/domain/serviceHistory";
import { DEMO_VAULT_DATA } from "../src/fixtures/demoVaultData";
import { ServiceEvent } from "../src/types/vault";

console.log("\n=== RUNNING SERVICE HISTORY TESTS ===\n");

const BIKE_ID = "bike-propain-spindrift";

// Same shape getBikeServiceEvents() returns: flat ServiceEvent[]
const bikeEvents = DEMO_VAULT_DATA.serviceEvents.filter((e) => e.bikeId === BIKE_ID);
assert.ok(bikeEvents.length > 0, "fixture bike should have a service event");

// 1. Flat events map to rows with resolved component and prices
{
  const rows = toServiceHistoryRows(bikeEvents, DEMO_VAULT_DATA.components);
  assert.strictEqual(rows.length, bikeEvents.length);
  const row = rows.find((r) => r.event.id === "se-zeb-lower-legs");
  assert.ok(row, "row for fixture event exists");
  assert.strictEqual(row.event.bikeId, BIKE_ID);
  assert.ok(row.component, "component resolved via componentId");
  assert.strictEqual(row.component.id, "comp-zeb");
  assert.strictEqual(row.partsPrice, 850);
  assert.strictEqual(row.laborPrice, 0);
  assert.strictEqual(row.totalPrice, 850);
  console.log("✓ maps flat ServiceEvent[] with component and prices");
}

const baseEvent: ServiceEvent = {
  id: "se-test",
  bikeId: BIKE_ID,
  eventType: "REPAIR",
  serviceDate: "2025-01-01",
  bikeKm: 100,
  bikeMinutes: 60,
  performedBy: "SHOP",
  description: "Test",
  laborPrice: 300,
  partsPrice: 200,
  totalPrice: 500,
  currency: "CZK",
  createdAt: "2025-01-01T00:00:00.000Z",
};

// 2. Missing / unknown component yields null instead of crashing
{
  const rows = toServiceHistoryRows(
    [
      { ...baseEvent, id: "a", componentId: null },
      { ...baseEvent, id: "b", componentId: "comp-deleted" },
    ],
    DEMO_VAULT_DATA.components
  );
  assert.strictEqual(rows[0].component, null);
  assert.strictEqual(rows[1].component, null);
  console.log("✓ events without a known component resolve to null");
}

// 3. Missing totalPrice falls back to parts + labor
{
  const legacy = { ...baseEvent } as Partial<ServiceEvent>;
  delete legacy.totalPrice;
  const [row] = toServiceHistoryRows([legacy as ServiceEvent], []);
  assert.strictEqual(row.totalPrice, 500);
  assert.strictEqual(row.partsPrice, 200);
  assert.strictEqual(row.laborPrice, 300);
  console.log("✓ totalPrice falls back to parts + labor");
}

console.log("\n=== ALL SERVICE HISTORY TESTS PASSED ===\n");
