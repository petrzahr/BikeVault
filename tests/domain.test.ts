import { recordOdometerSnapshot, calculateInstallationUsage } from "../src/lib/domain/odometer";
import { calculateTco, calculateUpgradeCost } from "../src/lib/domain/finance";
import { evaluateServiceSchedule } from "../src/lib/domain/maintenance";
import { formatClicksFromClosed, hasFrontSuspension, hasRearSuspension } from "../src/lib/domain/setup";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${msg}`);
}

console.log("=== RUNNING BIKEVAULT DOMAIN UNIT TESTS ===\n");

// 1. CUMULATIVE ODOMETER SNAPSHOT TESTS
console.log("-- Cumulative Odometer Snapshot tests --");
const currentOdometer = { currentKm: 2500.0, currentMinutes: 10200 }; // 170 h

// Valid increasing snapshot
const snapshotResult = recordOdometerSnapshot(currentOdometer, {
  totalKm: 2847.0,
  totalMinutes: 11160, // 186 h
  entryDate: "2026-09-08",
  note: "Pravidelný odečet po sezóně",
});
assert(snapshotResult.resultingKm === 2847.0, "recordOdometerSnapshot sets resultingKm correctly");
assert(snapshotResult.resultingMinutes === 11160, "recordOdometerSnapshot sets resultingMinutes correctly");
assert(snapshotResult.deltaKm === 347.0, "deltaKm is calculated (+347.0 km)");
assert(snapshotResult.deltaMinutes === 960, "deltaMinutes is calculated (+16 h)");
assert(snapshotResult.isCorrection === false, "isCorrection is false for increasing snapshot");

// Decreasing snapshot without allowCorrection must throw
let threwDecreasing = false;
try {
  recordOdometerSnapshot(currentOdometer, {
    totalKm: 2400.0,
    totalMinutes: 9800,
    entryDate: "2026-09-09",
    allowCorrection: false,
  });
} catch (e) {
  threwDecreasing = true;
}
assert(threwDecreasing === true, "Decreasing snapshot throws when allowCorrection is false");

// Decreasing snapshot with allowCorrection: true succeeds
const correctionResult = recordOdometerSnapshot(currentOdometer, {
  totalKm: 2400.0,
  totalMinutes: 9800,
  entryDate: "2026-09-09",
  allowCorrection: true,
  note: "Korekce překlepu",
});
assert(correctionResult.resultingKm === 2400.0, "correction resultingKm set");
assert(correctionResult.deltaKm === -100.0, "negative deltaKm computed accurately");
assert(correctionResult.isCorrection === true, "isCorrection is true when decreasing");

const usage = calculateInstallationUsage(2000.0, 7000, null, null, 2847.0, 11160);
assert(usage.usageKm === 847.0, "active component usage km calculated correctly");
assert(usage.usageMinutes === 4160, "active component usage minutes calculated correctly");

// 2. FINANCE & TCO TESTS
console.log("\n-- Finance & TCO tests --");
const tco = calculateTco({
  transactions: [
    { type: "EXPENSE", amount: 120000 }, // Bike purchase
    { type: "EXPENSE", amount: 14000 },  // Fork upgrade
    { type: "EXPENSE", amount: 2500 },   // Service
    { type: "INCOME", amount: 6000 },    // Sold old fork
  ],
  currentKm: 2847.0,
  currentMinutes: 11160, // 186 hours
  purchaseDate: "2024-01-01",
});

assert(tco.totalExpenses === 136500, "total expenses summed correctly");
assert(tco.totalIncomes === 6000, "total incomes summed correctly");
assert(tco.netOwnershipCost === 130500, "net ownership cost is expenses minus incomes");
assert(tco.costPerKm !== null && tco.costPerKm > 0, "cost per km is calculated");
assert(tco.costPerHour !== null && tco.costPerHour > 0, "cost per hour is calculated");
assert(calculateUpgradeCost(14000, 6000) === 8000, "upgrade cost calculated accurately");

// 3. MAINTENANCE TESTS
console.log("\n-- Maintenance tests --");
// Fork lower service: every 50 hours. Last serviced at 180 h. Current 186 h -> 6 hours ridden, 44 hours remaining -> OK
const forkSchedule = {
  intervalHours: 50,
  lastServiceBikeHours: 180,
};
const evalOk = evaluateServiceSchedule(forkSchedule, 2847, 11160); // 186 hours
assert(evalOk.urgency === "OK", "Schedule with 44h left is OK");
assert(evalOk.remainingHours === 44, "Remaining hours is 44");

// Fork lower service overdue: interval 50h, last at 130h -> current 186h -> 56h ridden -> 6h overdue
const forkOverdue = {
  intervalHours: 50,
  lastServiceBikeHours: 130,
};
const evalOverdue = evaluateServiceSchedule(forkOverdue, 2847, 11160);
assert(evalOverdue.urgency === "OVERDUE", "Schedule with 56h since last service is OVERDUE");
assert(evalOverdue.summaryTextCs.includes("po termínu"), "Summary text contains 'po termínu'");

// Baseline and target calculation example from prompt:
// Component: RockShox ZEB Ultimate, Interval: 50 h, Last service: 150 h, Current bike: 186 h
// Calculated: Od servisu: 36 h, Zbývá: 14 h, Next service: 200 h
const baselineTest = evaluateServiceSchedule(
  {
    intervalHours: 50,
    lastServiceBikeHours: 150,
    lastServiceBikeKm: 2100,
  },
  2847, // current bike km
  11160 // 186 hours * 60
);
assert(baselineTest.usageSinceHours === 36, "Od servisu is 36 h");
assert(baselineTest.remainingHours === 14, "Zbývá is 14 h");
assert(baselineTest.nextTargetHours === 200, "Next service is 200 h");

// Combined interval test: 50 h OR 1000 km (whichever first)
const combinedSchedule = {
  intervalHours: 50,
  intervalKm: 1000,
  lastServiceBikeHours: 150,
  lastServiceBikeKm: 2000,
};
// If current is 186h (36h used, 14h left) and 3100km (1100km used -> 100km overdue on km!)
const combinedEval = evaluateServiceSchedule(combinedSchedule, 3100, 11160);
assert(combinedEval.urgency === "OVERDUE", "Combined schedule triggers OVERDUE when km condition is exceeded first");
assert(combinedEval.remainingKm === -100, "Remaining km is -100");
assert(combinedEval.remainingHours === 14, "Remaining hours is 14");

// Predefined service templates test
import { PREDEFINED_SERVICE_TEMPLATES, getTemplatesForCategory } from "../src/lib/domain/serviceTemplates";
assert(PREDEFINED_SERVICE_TEMPLATES.length >= 6, "Predefined service templates exist");
const forkTemplates = getTemplatesForCategory("FORK");
assert(forkTemplates.some((t) => t.id === "fork_lower_leg_50h"), "Fork lower leg 50h template exists");


// 4. SETUP TESTS
console.log("\n-- Setup tests --");
assert(hasFrontSuspension("FULL_SUSPENSION") === true, "Full suspension has front suspension");
assert(hasRearSuspension("FRONT_SUSPENSION") === false, "Hardtail does not have rear suspension");
assert(formatClicksFromClosed(1) === "1 klik od zavřené polohy", "1 click grammar");
assert(formatClicksFromClosed(4) === "4 kliky od zavřené polohy", "4 clicks grammar");
assert(formatClicksFromClosed(7) === "7 kliků od zavřené polohy", "7 clicks grammar");

// 5. REPLACEMENT IDENTITY TESTS
console.log("\n-- Replacement identity tests --");
import { 
  computeReplacementKey, 
  areComponentsEquivalentReplacement, 
  findStorageReplacements 
} from "../src/lib/domain/replacement";

const installedChain = {
  manufacturer: "SRAM",
  model: "XX T-Type",
  variant: "126 článků",
  categoryId: "cat-chain-uuid",
};

const matchingStorageChain = {
  manufacturer: "SRAM",
  model: "XX T-Type",
  variant: "126 článků",
  categoryId: "cat-chain-uuid",
  status: "IN_STORAGE",
};

const differentModelChain = {
  manufacturer: "SRAM",
  model: "GX T-Type",
  variant: "126 článků",
  categoryId: "cat-chain-uuid",
  status: "IN_STORAGE",
};

const alreadyInstalledChain = {
  manufacturer: "SRAM",
  model: "XX T-Type",
  variant: "126 článků",
  categoryId: "cat-chain-uuid",
  status: "INSTALLED",
};

assert(
  areComponentsEquivalentReplacement(installedChain, "CHAIN", matchingStorageChain, "CHAIN") === true,
  "Matching SRAM XX T-Type chain in storage is equivalent"
);

assert(
  areComponentsEquivalentReplacement(installedChain, "CHAIN", differentModelChain, "CHAIN") === false,
  "SRAM GX chain is NOT equivalent to SRAM XX chain"
);

assert(
  areComponentsEquivalentReplacement(installedChain, "CHAIN", alreadyInstalledChain, "CHAIN") === false,
  "Already installed chain is NOT eligible as storage replacement"
);

// Tire replacement tests
const installedTire = {
  manufacturer: "Maxxis",
  model: "Minion DHR II",
  variant: "3C MaxxTerra",
  wheelDiameter: "29",
  tireWidth: "2.40 WT",
  tireCasing: "EXO+",
  tireCompound: "MaxxTerra",
};

const matchingTireStorage = {
  manufacturer: "Maxxis",
  model: "Minion DHR II",
  variant: "3C MaxxTerra",
  wheelDiameter: "29",
  tireWidth: "2.40 WT",
  tireCasing: "EXO+",
  tireCompound: "MaxxTerra",
  status: "IN_STORAGE",
};

const differentCompoundTire = {
  manufacturer: "Maxxis",
  model: "Minion DHR II",
  variant: "3C MaxxGrip",
  wheelDiameter: "29",
  tireWidth: "2.40 WT",
  tireCasing: "DoubleDown",
  tireCompound: "MaxxGrip",
  status: "IN_STORAGE",
};

assert(
  areComponentsEquivalentReplacement(installedTire, "TIRE_REAR", matchingTireStorage, "TIRE_FRONT") === true,
  "Matching tire in storage is equivalent across tire front/rear category"
);

assert(
  areComponentsEquivalentReplacement(installedTire, "TIRE_REAR", differentCompoundTire, "TIRE_REAR") === false,
  "Tire with different compound/casing is NOT equivalent"
);

// Storage array filter test
const candidatePool = [
  { component: matchingStorageChain, category: { code: "CHAIN", nameCs: "Řetěz" } },
  { component: differentModelChain, category: { code: "CHAIN", nameCs: "Řetěz" } },
  { component: alreadyInstalledChain, category: { code: "CHAIN", nameCs: "Řetěz" } },
  { component: matchingTireStorage, category: { code: "TIRE_FRONT", nameCs: "Přední plášť" } },
];

const foundReplacements = findStorageReplacements(installedChain, "CHAIN", candidatePool);
assert(foundReplacements.length === 1, "findStorageReplacements found exactly 1 matching replacement");
assert(foundReplacements[0].component.model === "XX T-Type", "Found candidate is the XX T-Type chain");

const foundTireReplacements = findStorageReplacements(installedTire, "TIRE_REAR", candidatePool);
assert(foundTireReplacements.length === 1, "findStorageReplacements found matching tire");

console.log("\n🎉 ALL DOMAIN UNIT TESTS PASSED SUCCESSFULLY!");
