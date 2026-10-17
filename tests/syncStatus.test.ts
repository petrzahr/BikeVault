/**
 * Test Suite for the shared Drive sync status mapping (state -> tone -> label).
 *
 * Run: npx tsx tests/syncStatus.test.ts
 */

import assert from "node:assert";
import { SYNC_LABELS, getSyncDisplayState, getSyncTone } from "../src/lib/syncStatus";

console.log("\n=== RUNNING SYNC STATUS INDICATOR TESTS ===\n");

// Basic status -> tone mapping
assert.strictEqual(getSyncTone(getSyncDisplayState("synced", "ready")), "ok");
assert.strictEqual(getSyncTone(getSyncDisplayState("saving", "ready")), "busy");
assert.strictEqual(getSyncTone(getSyncDisplayState("error", "ready")), "problem");
// Offline must not look like "synced" (it used to fall through to the green state)
assert.strictEqual(getSyncTone(getSyncDisplayState("offline", "ready")), "pending");
assert.notStrictEqual(SYNC_LABELS[getSyncDisplayState("offline")], SYNC_LABELS.synced);
console.log("✅ PASSED: status -> tone mapping");

// Missing Drive scope overrides a stale "synced" status and reads as a problem
assert.strictEqual(getSyncDisplayState("synced", "scopeInsufficient"), "scopeInsufficient");
assert.strictEqual(getSyncTone(getSyncDisplayState("synced", "scopeInsufficient")), "problem");
assert.strictEqual(SYNC_LABELS[getSyncDisplayState("error", "scopeInsufficient")], "Chybí oprávnění");
// ...but an in-flight re-consent still shows as busy
assert.strictEqual(getSyncTone(getSyncDisplayState("saving", "scopeInsufficient")), "busy");
console.log("✅ PASSED: scopeInsufficient handling");

// Every display state has a non-empty label
for (const [state, label] of Object.entries(SYNC_LABELS)) {
  assert.ok(label.length > 0, `missing label for ${state}`);
}
console.log("✅ PASSED: labels defined for every state");
