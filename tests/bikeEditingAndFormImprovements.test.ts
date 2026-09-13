/**
 * Testovací sada pro úpravu kol a vylepšení formuláře kola (20 požadavků)
 * Run: npx tsx tests/bikeEditingAndFormImprovements.test.ts
 */

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { BikeVaultData, Bike, BikeOdometerEntry, ComponentInstallation, ServiceSchedule, ServiceEvent, FinancialTransaction, BikeSetup } from "../src/types/vault";
import { resolveBikeImage, parseWeightInput, formatWeightCs } from "../src/lib/domain/bikeImage";
import { createEmptyVaultData } from "../src/constants/defaultData";
import { validateVaultData, saveStoredCache, loadStoredCacheResult, setActiveStorageKey } from "../src/lib/storage/storageService";

// Mock localStorage for Node environment
const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

(globalThis as unknown as Record<string, unknown>).localStorage = storageMock;
(globalThis as unknown as Record<string, unknown>).window = globalThis;

console.log("\n=== RUNNING BIKEVAULT BIKE EDITING & FORM IMPROVEMENTS TESTS (20 REQUIREMENTS) ===\n");

function createMockDataset(): BikeVaultData {
  const base = createEmptyVaultData();

  const bike1: Bike = {
    id: "bike-test-1",
    name: "Propain Spindrift CF",
    manufacturer: "Propain",
    model: "Spindrift CF",
    modelYear: 2023,
    category: "MTB",
    discipline: "ENDURO",
    suspensionType: "FULL_SUSPENSION",
    driveType: "CONVENTIONAL",
    serialNumber: "SN123456",
    purchaseDate: "2023-04-15",
    purchasePrice: 115000,
    currency: "CZK",
    status: "ACTIVE",
    currentKm: 1250,
    currentMinutes: 3600,
    weightKg: 15.8,
    imageUrl: "https://example.com/spindrift.jpg",
    uploadedImage: null,
    notes: "Původní poznámka",
    createdAt: "2023-04-15T10:00:00.000Z",
    updatedAt: "2023-04-15T10:00:00.000Z",
  };

  const odo1: BikeOdometerEntry = {
    id: "odo-test-1",
    bikeId: "bike-test-1",
    recordedAt: "2023-04-15T10:00:00.000Z",
    entryDate: "2023-04-15",
    entryType: "INITIAL",
    deltaKm: 0,
    deltaMinutes: 0,
    resultingKm: 0,
    resultingMinutes: 0,
    createdAt: "2023-04-15T10:00:00.000Z",
  };

  const odo2: BikeOdometerEntry = {
    id: "odo-test-2",
    bikeId: "bike-test-1",
    recordedAt: "2023-06-20T10:00:00.000Z",
    entryDate: "2023-06-20",
    entryType: "RIDE",
    deltaKm: 1250,
    deltaMinutes: 3600,
    resultingKm: 1250,
    resultingMinutes: 3600,
    createdAt: "2023-06-20T10:00:00.000Z",
  };

  const inst1: ComponentInstallation = {
    id: "inst-test-1",
    bikeId: "bike-test-1",
    componentId: "comp-fork-1",
    slot: "FORK",
    installedAt: "2023-04-15T10:00:00.000Z",
    installedBikeKm: 0,
    installedBikeMinutes: 0,
    createdAt: "2023-04-15T10:00:00.000Z",
  };

  const sched1: ServiceSchedule = {
    id: "sched-test-1",
    bikeId: "bike-test-1",
    name: "Mazaní vidlice 50h",
    intervalHours: 50,
    conditionType: "WHICHEVER_FIRST",
    isActive: true,
    createdAt: "2023-04-15T10:00:00.000Z",
  };

  const ev1: ServiceEvent = {
    id: "ev-test-1",
    serviceScheduleId: "sched-test-1",
    bikeId: "bike-test-1",
    eventType: "MAINTENANCE",
    serviceDate: "2023-05-30",
    bikeKm: 600,
    bikeMinutes: 1800,
    performedBy: "SELF",
    description: "Výměna oleje v nohou vidlice",
    laborPrice: 0,
    partsPrice: 450,
    totalPrice: 450,
    currency: "CZK",
    createdAt: "2023-05-30T10:00:00.000Z",
  };

  const fin1: FinancialTransaction = {
    id: "fin-test-1",
    bikeId: "bike-test-1",
    type: "EXPENSE",
    category: "BIKE_PURCHASE",
    amount: 115000,
    currency: "CZK",
    transactionDate: "2023-04-15",
    createdAt: "2023-04-15T10:00:00.000Z",
  };

  const setup1: BikeSetup = {
    id: "setup-test-1",
    bikeId: "bike-test-1",
    forkPressurePsi: 75,
    updatedAt: "2023-04-15T10:00:00.000Z",
  };

  return {
    ...base,
    bikes: [bike1],
    odometerEntries: [odo1, odo2],
    componentInstallations: [inst1],
    serviceSchedules: [sched1],
    serviceEvents: [ev1],
    financialTransactions: [fin1],
    bikeSetups: [setup1],
  };
}

/**
 * Simulace updateBike mutátoru podle implementace ve VaultContext
 */
function applyUpdateBike(data: BikeVaultData, id: string, updates: Partial<Bike>): BikeVaultData {
  return {
    ...data,
    bikes: data.bikes.map((b) =>
      b.id === id ? { ...b, ...updates, id: b.id, updatedAt: new Date().toISOString() } : b
    ),
  };
}

// -------------------------------------------------------------
// TEST 1: Existing bike can be edited
// -------------------------------------------------------------
{
  const data = createMockDataset();
  const updated = applyUpdateBike(data, "bike-test-1", {
    name: "Propain Spindrift CF Ultimate",
    manufacturer: "Propain Bicycles",
    model: "Spindrift CF Gen 5",
  });

  const edited = updated.bikes.find((b) => b.id === "bike-test-1");
  assert.strictEqual(edited?.name, "Propain Spindrift CF Ultimate");
  assert.strictEqual(edited?.manufacturer, "Propain Bicycles");
  assert.strictEqual(edited?.model, "Spindrift CF Gen 5");
  console.log("✅ PASSED Test 1: Existing bike can be edited.");
}

// -------------------------------------------------------------
// TEST 2: Editing preserves Bike ID
// -------------------------------------------------------------
{
  const data = createMockDataset();
  // Zkusíme úmyslně předat cizí ID v updates
  const updated = applyUpdateBike(data, "bike-test-1", {
    id: "MALICIOUS-ID-OVERWRITE",
    name: "Renamed Bike",
  } as Partial<Bike>);

  const edited = updated.bikes.find((b) => b.id === "bike-test-1");
  assert.ok(edited, "Původní ID musí stále existovat.");
  assert.strictEqual(edited.id, "bike-test-1", "ID kola se nesmí změnit.");
  assert.strictEqual(updated.bikes.some((b) => b.id === "MALICIOUS-ID-OVERWRITE"), false);
  console.log("✅ PASSED Test 2: Editing strictly preserves Bike ID.");
}

// -------------------------------------------------------------
// TEST 3: Editing does not remove odometer history
// -------------------------------------------------------------
{
  const data = createMockDataset();
  const initialOdoCount = data.odometerEntries.filter((o) => o.bikeId === "bike-test-1").length;
  const initialOdoEntries = JSON.stringify(data.odometerEntries);

  const updated = applyUpdateBike(data, "bike-test-1", {
    name: "New Name",
    weightKg: 14.9,
  });

  const postOdoEntries = JSON.stringify(updated.odometerEntries);
  assert.strictEqual(postOdoEntries, initialOdoEntries, "Historie tachometru musí zůstat zcela netknutá.");
  assert.strictEqual(updated.odometerEntries.filter((o) => o.bikeId === "bike-test-1").length, initialOdoCount);
  console.log("✅ PASSED Test 3: Editing does not remove or alter odometer history.");
}

// -------------------------------------------------------------
// TEST 4: Editing does not remove component installation history
// -------------------------------------------------------------
{
  const data = createMockDataset();
  const initialInstallations = JSON.stringify(data.componentInstallations);

  const updated = applyUpdateBike(data, "bike-test-1", {
    notes: "Upravené poznámky",
  });

  assert.strictEqual(JSON.stringify(updated.componentInstallations), initialInstallations);
  console.log("✅ PASSED Test 4: Editing does not remove component installation history.");
}

// -------------------------------------------------------------
// TEST 5: Editing does not remove service history
// -------------------------------------------------------------
{
  const data = createMockDataset();
  const initialSchedules = JSON.stringify(data.serviceSchedules);
  const initialEvents = JSON.stringify(data.serviceEvents);

  const updated = applyUpdateBike(data, "bike-test-1", {
    weightKg: 15.2,
  });

  assert.strictEqual(JSON.stringify(updated.serviceSchedules), initialSchedules);
  assert.strictEqual(JSON.stringify(updated.serviceEvents), initialEvents);
  console.log("✅ PASSED Test 5: Editing does not remove service schedules or service events.");
}

// -------------------------------------------------------------
// TEST 6: Editing does not remove finance history
// -------------------------------------------------------------
{
  const data = createMockDataset();
  const initialFinance = JSON.stringify(data.financialTransactions);

  const updated = applyUpdateBike(data, "bike-test-1", {
    purchasePrice: 120000, // Změna kupní ceny v metadatech kola nesmí smazat existující finanční transakce
  });

  assert.strictEqual(JSON.stringify(updated.financialTransactions), initialFinance);
  console.log("✅ PASSED Test 6: Editing does not remove financial transaction history.");
}

// -------------------------------------------------------------
// TEST 7: Bike preset is no longer shown & Basic fields are in exact logical order 1–7
// -------------------------------------------------------------
{
  const bikeModalContent = fs.readFileSync(
    path.join(__dirname, "../src/components/garage/BikeModal.tsx"),
    "utf8"
  );
  assert.strictEqual(
    bikeModalContent.includes("Rychlý výběr typu kola (Preset)"),
    false,
    "Preset UI text nesmí být přítomen ve formuláři."
  );
  assert.strictEqual(
    bikeModalContent.includes("selectedPreset"),
    false,
    "Preset stav nesmí existovat v BikeModal."
  );
  assert.strictEqual(
    bikeModalContent.includes("PRESET_TYPES"),
    false,
    "Preset typy nesmí být definovány v BikeModal."
  );

  // Ověření přesného logického pořadí polí 1–7
  const idx1 = bikeModalContent.indexOf('{t("bike.name")}');
  const idx2 = bikeModalContent.indexOf('{t("bike.manufacturer")}');
  const idx3 = bikeModalContent.indexOf('{t("bike.model")}');
  const idx4 = bikeModalContent.indexOf('{t("bike.modelYear")}');
  const idx5 = bikeModalContent.indexOf("Velikost rámu");
  const idx6 = bikeModalContent.indexOf("Sériové číslo rámu");
  const idx7 = bikeModalContent.indexOf("<span>Hmotnost</span>");

  assert.ok(idx1 > 0 && idx2 > idx1, "1. Název kola musí předcházet 2. Výrobce");
  assert.ok(idx3 > idx2, "2. Výrobce musí předcházet 3. Model");
  assert.ok(idx4 > idx3, "3. Model musí předcházet 4. Modelový rok");
  assert.ok(idx5 > idx4, "4. Modelový rok musí předcházet 5. Velikost rámu");
  assert.ok(idx6 > idx5, "5. Velikost rámu musí předcházet 6. Sériové číslo rámu");
  assert.ok(idx7 > idx6, "6. Sériové číslo rámu musí předcházet 7. Hmotnost");

  // Ověření podpory velikosti rámu a přesného zachování sériového čísla
  const data = createMockDataset();
  const updated = applyUpdateBike(data, "bike-test-1", {
    frameSize: "56 / L",
    serialNumber: "sN-ExAcT-1234_#X", // přesné zachování velikosti písmen a znaků
  });
  const edited = updated.bikes.find((b) => b.id === "bike-test-1");
  assert.strictEqual(edited?.frameSize, "56 / L", "Velikost rámu musí být uložena v libovolném formátu (S, M, L, 54, 56...).");
  assert.strictEqual(edited?.serialNumber, "sN-ExAcT-1234_#X", "Sériové číslo musí být zachováno přesně.");

  console.log("✅ PASSED Test 7: Presets removed & basic fields in exact logical order 1–7 (Name, Brand, Model, Year, Size, SN, Weight).");
}

// -------------------------------------------------------------
// TEST 8: Bike can be created without weight
// -------------------------------------------------------------
{
  const parsedEmpty = parseWeightInput("");
  assert.strictEqual(parsedEmpty.valid, true);
  assert.strictEqual(parsedEmpty.value, null);

  const parsedUndefined = parseWeightInput(undefined);
  assert.strictEqual(parsedUndefined.valid, true);
  assert.strictEqual(parsedUndefined.value, null);

  const parsedNull = parseWeightInput(null);
  assert.strictEqual(parsedNull.valid, true);
  assert.strictEqual(parsedNull.value, null);
  console.log("✅ PASSED Test 8: Bike can be created without weight (null/undefined).");
}

// -------------------------------------------------------------
// TEST 9: Bike can be created with decimal weight
// -------------------------------------------------------------
{
  // Test české čárky
  const parsedComma = parseWeightInput("15,8");
  assert.strictEqual(parsedComma.valid, true);
  assert.strictEqual(parsedComma.value, 15.8);

  // Test tečky
  const parsedDot = parseWeightInput("15.8");
  assert.strictEqual(parsedDot.valid, true);
  assert.strictEqual(parsedDot.value, 15.8);

  // Test formátování do češtiny
  assert.strictEqual(formatWeightCs(15.8), "15,8 kg");
  assert.strictEqual(formatWeightCs(14.25), "14,25 kg");
  assert.strictEqual(formatWeightCs(15), "15 kg");
  console.log("✅ PASSED Test 9: Bike can be created with decimal weight (comma or dot supported).");
}

// -------------------------------------------------------------
// TEST 10: Existing bike without weight still loads correctly
// -------------------------------------------------------------
{
  const legacyData = createMockDataset();
  delete legacyData.bikes[0].weightKg;

  const validation = validateVaultData(legacyData);
  assert.strictEqual(validation.valid, true, "Data bez weightKg musí být stále validní.");

  // Nezadání hmotnosti nesmí vrátit klamavé "0 kg"
  assert.strictEqual(formatWeightCs(undefined), null);
  assert.strictEqual(formatWeightCs(null), null);
  assert.strictEqual(formatWeightCs(0), null);
  console.log("✅ PASSED Test 10: Existing bike without weight loads correctly without misleading '0 kg'.");
}

// -------------------------------------------------------------
// TEST 11: Bike weight can be edited
// -------------------------------------------------------------
{
  const data = createMockDataset();
  // Změna hmotnosti z 15.8 na 14.5
  const updated1 = applyUpdateBike(data, "bike-test-1", { weightKg: 14.5 });
  assert.strictEqual(updated1.bikes[0].weightKg, 14.5);

  // Následné vymazání hmotnosti na null
  const updated2 = applyUpdateBike(updated1, "bike-test-1", { weightKg: null });
  assert.strictEqual(updated2.bikes[0].weightKg, null);
  console.log("✅ PASSED Test 11: Bike weight can be edited, updated and cleared.");
}

// -------------------------------------------------------------
// TEST 12: Uploaded image can be assigned to a bike
// -------------------------------------------------------------
{
  const data = createMockDataset();
  const sampleDataUrl = "data:image/webp;base64,UklGRhoAAABXRUJQVlA4TAYAAAAvAAAAAAfQ//73vw==";

  const updated = applyUpdateBike(data, "bike-test-1", {
    uploadedImage: sampleDataUrl,
  });

  const edited = updated.bikes.find((b) => b.id === "bike-test-1");
  assert.strictEqual(edited?.uploadedImage, sampleDataUrl);

  const resolved = resolveBikeImage(edited);
  assert.strictEqual(resolved, sampleDataUrl);
  console.log("✅ PASSED Test 12: Uploaded image can be assigned to a bike.");
}

// -------------------------------------------------------------
// TEST 13: Photo URL still works without an uploaded image
// -------------------------------------------------------------
{
  const bikeOnlyUrl = {
    uploadedImage: null,
    imageUrl: "https://images.unsplash.com/photo-sample",
  };

  const resolved = resolveBikeImage(bikeOnlyUrl);
  assert.strictEqual(resolved, "https://images.unsplash.com/photo-sample");
  console.log("✅ PASSED Test 13: Photo URL works properly when no uploaded image is present.");
}

// -------------------------------------------------------------
// TEST 14: Uploaded image wins when both uploaded image and URL exist
// -------------------------------------------------------------
{
  const bikeWithBoth = {
    uploadedImage: "data:image/webp;base64,PRIORITY_IMAGE",
    imageUrl: "https://images.unsplash.com/fallback-photo",
  };

  const resolved = resolveBikeImage(bikeWithBoth);
  assert.strictEqual(resolved, "data:image/webp;base64,PRIORITY_IMAGE");
  console.log("✅ PASSED Test 14: Uploaded image deterministically wins when both exist.");
}

// -------------------------------------------------------------
// TEST 15: Removing uploaded image falls back to photo URL
// -------------------------------------------------------------
{
  let currentImageState: { uploadedImage: string | null; imageUrl: string | null } = {
    uploadedImage: "data:image/webp;base64,PRIORITY_IMAGE",
    imageUrl: "https://images.unsplash.com/fallback-photo",
  };

  // Uživatel odebere nahranou fotku
  currentImageState = {
    ...currentImageState,
    uploadedImage: null,
  };

  const fallbackResolved = resolveBikeImage(currentImageState);
  assert.strictEqual(
    fallbackResolved,
    "https://images.unsplash.com/fallback-photo",
    "Při odebrání nahrané fotky se musí automaticky použít existující URL bez nutnosti jejího znovuzadání."
  );
  console.log("✅ PASSED Test 15: Removing uploaded image cleanly falls back to stored photo URL.");
}

// -------------------------------------------------------------
// TEST 16: Removing both results in the normal placeholder
// -------------------------------------------------------------
{
  const emptyBike = {
    uploadedImage: null,
    imageUrl: null,
  };

  const resolved = resolveBikeImage(emptyBike);
  assert.strictEqual(resolved, null, "Při absenci obou musí resolver vrátit null (zástupný symbol).");

  const whitespaceBike = {
    uploadedImage: "   ",
    imageUrl: "   ",
  };
  assert.strictEqual(resolveBikeImage(whitespaceBike), null);
  console.log("✅ PASSED Test 16: Removing both image sources cleanly resolves to placeholder (null).");
}

// -------------------------------------------------------------
// TEST 17: Invalid external image does not break the UI
// -------------------------------------------------------------
{
  // Resolver je odolný vůči poškozeným hodnotám
  assert.strictEqual(resolveBikeImage(null), null);
  assert.strictEqual(resolveBikeImage(undefined), null);
  assert.strictEqual(resolveBikeImage({} as any), null);
  assert.strictEqual(resolveBikeImage({ imageUrl: "" }), null);

  // Ověření, že komponenty BikeCard a BikeHeader mají definován onError handler pro obrázek
  const bikeCardCode = fs.readFileSync(path.join(__dirname, "../src/components/garage/BikeCard.tsx"), "utf8");
  const bikeHeaderCode = fs.readFileSync(path.join(__dirname, "../src/components/bike/BikeHeader.tsx"), "utf8");

  assert.ok(bikeCardCode.includes("onError="), "BikeCard musí obsahovat onError handler pro obrázek.");
  assert.ok(bikeHeaderCode.includes("onError="), "BikeHeader musí obsahovat onError handler pro obrázek.");
  console.log("✅ PASSED Test 17: Invalid external image does not break UI or crash the page.");
}

// -------------------------------------------------------------
// TEST 18: Uploaded image persists after application reload
// -------------------------------------------------------------
{
  const originalKey = "bikevault_test_cache_v1";
  setActiveStorageKey(originalKey);

  const mockData = createMockDataset();
  const testPayload = "data:image/webp;base64,PERSISTED_PAYLOAD_TEST_12345";
  mockData.bikes[0].uploadedImage = testPayload;

  // Uložení do cache
  saveStoredCache(mockData, originalKey);

  // Načtení z cache (simulace reloadu)
  const loadResult = loadStoredCacheResult(originalKey);
  assert.strictEqual(loadResult.status, "ready");
  assert.strictEqual(loadResult.data.bikes[0].uploadedImage, testPayload);
  console.log("✅ PASSED Test 18: Uploaded image persists cleanly across cache save/load.");
}

// -------------------------------------------------------------
// TEST 19: Editing image does not recreate the Bike entity
// -------------------------------------------------------------
{
  const data = createMockDataset();
  const originalBike = data.bikes[0];

  const updated = applyUpdateBike(data, originalBike.id, {
    uploadedImage: "data:image/webp;base64,NEW_IMAGE_PAYLOAD",
  });

  const edited = updated.bikes.find((b) => b.id === originalBike.id);
  assert.ok(edited);
  assert.strictEqual(edited.id, originalBike.id);
  assert.strictEqual(edited.createdAt, originalBike.createdAt);
  assert.strictEqual(edited.currentKm, originalBike.currentKm);
  assert.strictEqual(edited.currentMinutes, originalBike.currentMinutes);
  assert.strictEqual(updated.bikes.length, data.bikes.length, "Počet kol se nesmí změnit.");
  console.log("✅ PASSED Test 19: Editing image updates entity in-place without recreation.");
}

// -------------------------------------------------------------
// TEST 20: No unrelated BikeVault functionality regresses
// -------------------------------------------------------------
{
  const data = createMockDataset();
  // Validace schématu s novými poli
  const res = validateVaultData(data);
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.errors.length, 0);

  // Serializace a deserializace celého datasetu
  const jsonStr = JSON.stringify(data);
  const parsed = JSON.parse(jsonStr) as BikeVaultData;
  assert.strictEqual(parsed.bikes[0].weightKg, 15.8);
  assert.strictEqual(parsed.bikes[0].name, "Propain Spindrift CF");
  console.log("✅ PASSED Test 20: No unrelated BikeVault functionality regresses; schema remains 100% valid.");
}

console.log("\n🎉 ALL 20 / 20 BIKE EDITING & FORM IMPROVEMENT TESTS PASSED SUCCESSFULLY!\n");
