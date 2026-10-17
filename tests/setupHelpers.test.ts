/**
 * Test Suite for bike setup helpers (bar -> psi, SAG in mm, click stepper).
 *
 * Run: npx tsx tests/setupHelpers.test.ts
 */

import assert from "node:assert";
import { barToPsi, sagMm, stepClicks } from "../src/lib/domain/setup";

console.log("\n=== RUNNING SETUP HELPER TESTS ===\n");

assert.strictEqual(barToPsi(1.55), 22.5);
assert.strictEqual(barToPsi("1.85"), 26.8);
assert.strictEqual(barToPsi(""), null);
assert.strictEqual(barToPsi(null), null);
assert.strictEqual(barToPsi("abc"), null);
assert.strictEqual(barToPsi(-1), null);
console.log("✅ PASSED: barToPsi");

assert.strictEqual(sagMm(180, 28), 50.4);
assert.strictEqual(sagMm("65", "30"), 19.5);
assert.strictEqual(sagMm(180, ""), null);
assert.strictEqual(sagMm(null, 28), null);
assert.strictEqual(sagMm(0, 28), null);
assert.strictEqual(sagMm(180, 120), null);
console.log("✅ PASSED: sagMm");

// Stepper never goes below 0 and an empty field only changes on an explicit press
assert.strictEqual(stepClicks("8", 1), "9");
assert.strictEqual(stepClicks("8", -1), "7");
assert.strictEqual(stepClicks("0", -1), "0");
assert.strictEqual(stepClicks("", 1), "1");
assert.strictEqual(stepClicks("", -1), "0");
console.log("✅ PASSED: stepClicks");

console.log("\n=== ALL SETUP HELPER TESTS PASSED ===\n");
