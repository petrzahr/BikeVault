/**
 * Test Suite for the interval gauge geometry.
 *
 * Run: npx tsx tests/intervalGauge.test.ts
 */

import assert from "node:assert";
import { getIntervalGaugeReading } from "../src/lib/domain/intervalGauge";

console.log("\n=== RUNNING INTERVAL GAUGE TESTS ===\n");

// No km/hours interval -> no ruler
assert.strictEqual(
  getIntervalGaugeReading({ intervalKm: null, intervalHours: null }, { urgency: "OK", usageSinceKm: 10, usageSinceHours: 1 }),
  null
);
console.log("✅ PASSED: months-only schedule has no gauge");

// Within interval: limit at 1/1.2 of the ruler, pointer before it
const ok = getIntervalGaugeReading({ intervalKm: 3000 }, { urgency: "OK", usageSinceKm: 1500, usageSinceHours: 0 })!;
assert.strictEqual(ok.unit, "km");
assert.strictEqual(ok.limitPct, 83.3);
assert.ok(ok.usedPct < ok.limitPct);
// Default threshold min(100, 15 %) = 100 km -> warn zone starts at 2900 km
assert.strictEqual(ok.warnPct, 80.6);
console.log("✅ PASSED: in-interval layout");

// The more used metric wins (hours at 90 % beat km at 50 %)
const both = getIntervalGaugeReading(
  { intervalKm: 1000, intervalHours: 50 },
  { urgency: "DUE_SOON", usageSinceKm: 500, usageSinceHours: 45 }
)!;
assert.strictEqual(both.unit, "h");
assert.strictEqual(both.used, 45);
console.log("✅ PASSED: most used metric drives the gauge");

// Far overdue: the ruler stretches so the pointer stays on it, limit moves left
const over = getIntervalGaugeReading({ intervalHours: 50 }, { urgency: "OVERDUE", usageSinceKm: 0, usageSinceHours: 100 })!;
assert.ok(over.usedPct <= 100);
assert.ok(over.usedPct > over.limitPct);
assert.ok(over.limitPct < 83.3);
console.log("✅ PASSED: overdue pointer stays on the scale");

// Explicit warning threshold is respected
const thr = getIntervalGaugeReading({ intervalKm: 1000, warningThresholdKm: 200 }, { urgency: "OK", usageSinceKm: 0, usageSinceHours: 0 })!;
assert.strictEqual(thr.warnPct, 66.7);
console.log("✅ PASSED: explicit warning threshold");

console.log("\n=== ALL INTERVAL GAUGE TESTS PASSED ===\n");
