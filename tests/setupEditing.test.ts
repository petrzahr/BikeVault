import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { setupContentFromDraft, resolveForkTravel, type SetupDraft } from "../src/lib/domain/setupEditing";
import { getSupportedAdjusters } from "../src/lib/domain/setup";

const draft: SetupDraft = {
  forkPressure: "82.5", forkSag: "22.9", forkLsc: "3", forkHsc: "4",
  forkLsr: "5", forkHsr: "6", forkTokens: "2", forkNotes: "  fork  ",
  shockPressure: "185.5", shockSag: "30.9", shockLsc: "7", shockHsc: "8",
  shockLsr: "9", shockHsr: "10", shockTokens: "1", shockNotes: "  shock  ",
  frontPressure: "1.55", frontInsert: "  front insert  ", frontNotes: "  front  ",
  rearPressure: "1.85", rearInsert: "  rear insert  ", rearNotes: "  rear  ",
  generalNotes: "  trail  ",
};

// Characterized from both original save payloads before extracting the converter.
const expected = {
  forkPressurePsi: 82.5, forkSagPercent: 22, forkLscClicks: 3, forkHscClicks: 4,
  forkLsrClicks: 5, forkHsrClicks: 6, forkVolumeSpacers: 2, forkTravelMm: 160, forkNotes: "fork",
  shockPressurePsi: 185.5, shockSagPercent: 30, shockLscClicks: 7, shockHscClicks: 8,
  shockLsrClicks: 9, shockHsrClicks: 10, shockVolumeSpacers: 1, shockNotes: "shock",
  frontTirePressureBar: 1.55, frontTireInsert: "front insert", frontTireNotes: "front",
  rearTirePressureBar: 1.85, rearTireInsert: "rear insert", rearTireNotes: "rear", generalNotes: "trail",
};
assert.deepEqual(setupContentFromDraft(draft, 160, 140), expected);
assert.deepEqual(draft.forkNotes, "  fork  ");

const empty = Object.fromEntries(Object.keys(draft).map(key => [key, ""])) as unknown as SetupDraft;
const cleared = setupContentFromDraft(empty);
assert.deepEqual(cleared, Object.fromEntries(Object.keys(expected).map(key => [key, null])));
const zero = setupContentFromDraft(Object.fromEntries(Object.keys(draft).map(key => [key, "0"])) as unknown as SetupDraft);
for (const [key, value] of Object.entries(zero)) {
  assert.equal(value, key === "forkTravelMm" ? null : typeof expected[key as keyof typeof expected] === "string" ? "0" : 0, key);
}
assert.equal(setupContentFromDraft({ ...draft, generalNotes: " \n " }).generalNotes, null);

// Visibility never filters saved draft values, even when no adjuster is supported.
assert.deepEqual(getSupportedAdjusters({ dampingAdjusters: [] }), []);
const hidden = setupContentFromDraft(draft);
for (const key of ["forkLscClicks", "forkHscClicks", "forkLsrClicks", "forkHsrClicks", "shockLscClicks", "shockHscClicks", "shockLsrClicks", "shockHsrClicks"] as const) {
  assert.equal(hidden[key], expected[key]);
}

assert.equal(resolveForkTravel(160, 140), 160);
assert.equal(resolveForkTravel(undefined, 140), 140);
assert.equal(resolveForkTravel(null, 140), 140);
assert.equal(resolveForkTravel(0, 140), 140);
assert.equal(resolveForkTravel(undefined, 0), null);
assert.equal(resolveForkTravel(undefined, undefined), null);
assert.equal(setupContentFromDraft(draft, null, 140).forkTravelMm, 140);
assert.equal(setupContentFromDraft(draft, 0, 0).forkTravelMm, null);

// Preserve permissive historical parsing rather than introducing validation.
const partial = setupContentFromDraft({ ...draft, forkPressure: "12.5psi", forkSag: "21.9%", shockPressure: "bad", shockSag: " " });
assert.equal(partial.forkPressurePsi, 12.5);
assert.equal(partial.forkSagPercent, 21);
assert.ok(Number.isNaN(partial.shockPressurePsi));
assert.ok(Number.isNaN(partial.shockSagPercent));

// Verify both React save paths use the production converter and keep metadata separate.
const source = readFileSync("src/app/bikes/[id]/setup/SetupClient.tsx", "utf8");
assert.match(source, /saveSetup\(bike.id, getSetupContent\(\)\)/);
assert.match(source, /const snapshotData = getSetupContent\(\)/);
assert.match(source, /saveSetupSnapshot\(bike.id, snapshotName.trim\(\), snapshotData, snapshotNote.trim\(\) \|\| undefined\)/);
assert.equal(Object.keys(expected).length, Object.keys(cleared).length);
console.log("Setup editing conversion tests passed.");
