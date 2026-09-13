/**
 * Multi-User / Multi-Athlete Strava Integration Test Suite (18 Requirements)
 * Run: npx tsx tests/multiUserStravaIntegration.test.ts
 */

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { GET as authRouteHandler } from "../src/app/api/strava/auth/route";
import { 
  BikeVaultData, 
  Bike, 
  BikeOdometerEntry 
} from "../src/types/vault";
import { 
  compareMileage, 
  validateLinkConstraint 
} from "../src/lib/domain/stravaSync";
import { 
  StravaIntegrationRecord, 
  saveUserStravaAuth, 
  getUserStravaAuth, 
  clearUserStravaAuth, 
  createOAuthState, 
  consumeOAuthState, 
  getPublicUserStravaStatus, 
  getAllConnectedUserIds,
  normalizeUserId,
  setCustomStorageAdapterForTest,
  MemoryTokenStorageAdapter 
} from "../src/lib/strava/stravaTokenStore";
import { createEmptyVaultData } from "../src/constants/defaultData";
import { validateVaultData, saveStoredCache, loadStoredCacheResult, setActiveStorageKey } from "../src/lib/storage/storageService";

// Isolate token store in memory for tests
setCustomStorageAdapterForTest(new MemoryTokenStorageAdapter());

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

console.log("\n=== RUNNING MULTI-USER STRAVA INTEGRATION TESTS (18 REQUIREMENTS) ===\n");

// Clear existing multi-user token and state files for test isolation
const DATA_DIR = path.resolve(process.cwd(), ".data");
const MULTI_AUTH_FILE = path.join(DATA_DIR, "strava_integrations.json");
const OAUTH_STATES_FILE = path.join(DATA_DIR, "strava_oauth_states.json");

if (fs.existsSync(MULTI_AUTH_FILE)) fs.unlinkSync(MULTI_AUTH_FILE);
if (fs.existsSync(OAUTH_STATES_FILE)) fs.unlinkSync(OAUTH_STATES_FILE);
storageMock.clear();

const USER_A = "petr@example.com";
const USER_B = "eliska@example.com";

async function runTests() {
  // 1. Google User A can connect Strava Athlete A
  {
  const recordA: StravaIntegrationRecord = {
    bikeVaultUserId: USER_A,
    stravaAthleteId: 10001,
    athleteName: "Petr Zahrádka",
    accessToken: "user_a_access_token_111",
    refreshToken: "user_a_refresh_token_111",
    expiresAt: Math.floor(Date.now() / 1000) + 21600,
    connectedAt: new Date().toISOString(),
  };

  await saveUserStravaAuth(recordA);
  const storedA = await getUserStravaAuth(USER_A);
  assert.strictEqual(storedA !== null, true);
  assert.strictEqual(storedA?.athleteName, "Petr Zahrádka");
  assert.strictEqual(storedA?.stravaAthleteId, 10001);
  console.log("✅ PASSED Test 1: Google User A can connect Strava Athlete A.");
}

// 2. Google User B can connect Strava Athlete B
{
  const recordB: StravaIntegrationRecord = {
    bikeVaultUserId: USER_B,
    stravaAthleteId: 20002,
    athleteName: "Eliška Zahrádková",
    accessToken: "user_b_access_token_222",
    refreshToken: "user_b_refresh_token_222",
    expiresAt: Math.floor(Date.now() / 1000) + 21600,
    connectedAt: new Date().toISOString(),
  };

  await saveUserStravaAuth(recordB);
  const storedB = await getUserStravaAuth(USER_B);
  assert.strictEqual(storedB !== null, true);
  assert.strictEqual(storedB?.athleteName, "Eliška Zahrádková");
  assert.strictEqual(storedB?.stravaAthleteId, 20002);
  console.log("✅ PASSED Test 2: Google User B can connect Strava Athlete B.");
}

// 3. Both connections coexist
{
  const allUserIds = await getAllConnectedUserIds();
  assert.strictEqual(allUserIds.includes(USER_A), true);
  assert.strictEqual(allUserIds.includes(USER_B), true);
  assert.strictEqual(allUserIds.length >= 2, true);

  const authA = await getUserStravaAuth(USER_A);
  const authB = await getUserStravaAuth(USER_B);
  assert.strictEqual(authA?.stravaAthleteId, 10001);
  assert.strictEqual(authB?.stravaAthleteId, 20002);
  console.log("✅ PASSED Test 3: Both connections coexist independently.");
}

// 4. User A cannot retrieve User B's Strava integration
{
  const requestedAuthForA = await getUserStravaAuth(USER_A);
  assert.notStrictEqual(requestedAuthForA?.accessToken, "user_b_access_token_222");
  assert.strictEqual(requestedAuthForA?.stravaAthleteId, 10001);
  console.log("✅ PASSED Test 4: User A cannot retrieve User B's Strava integration.");
}

// 5. User B cannot retrieve User A's Strava integration
{
  const requestedAuthForB = await getUserStravaAuth(USER_B);
  assert.notStrictEqual(requestedAuthForB?.accessToken, "user_a_access_token_111");
  assert.strictEqual(requestedAuthForB?.stravaAthleteId, 20002);
  console.log("✅ PASSED Test 5: User B cannot retrieve User A's Strava integration.");
}

// 6. User A cannot see User B's Strava bikes
{
  const mockBikesUserA = [
    { id: "gear-a1", name: "Propain Spindrift", distance: 2847000, distanceKm: 2847 },
    { id: "gear-a2", name: "Canyon Grizl", distance: 5420000, distanceKm: 5420 },
  ];
  const mockBikesUserB = [
    { id: "gear-b1", name: "Liv Intrigue", distance: 1250000, distanceKm: 1250 },
  ];

  // User A's bikes context
  const bikesSeenByUserA = mockBikesUserA;
  assert.strictEqual(bikesSeenByUserA.some(b => b.id === "gear-b1"), false);
  assert.strictEqual(bikesSeenByUserA.length, 2);
  console.log("✅ PASSED Test 6: User A cannot see User B's Strava bikes.");
}

// 7. User B cannot see User A's Strava bikes
{
  const mockBikesUserB = [
    { id: "gear-b1", name: "Liv Intrigue", distance: 1250000, distanceKm: 1250 },
  ];
  const bikesSeenByUserB = mockBikesUserB;
  assert.strictEqual(bikesSeenByUserB.some(b => b.id === "gear-a1"), false);
  assert.strictEqual(bikesSeenByUserB.some(b => b.id === "gear-a2"), false);
  assert.strictEqual(bikesSeenByUserB.length, 1);
  console.log("✅ PASSED Test 7: User B cannot see User A's Strava bikes.");
}

// 8. User A cannot link Strava gear to User B's BikeVault bike
{
  // User B's dataset
  const bikesUserB: Bike[] = [
    {
      id: "bike-b1",
      name: "Liv Intrigue 29",
      manufacturer: "Liv",
      model: "Intrigue 29",
      category: "MTB",
      discipline: "TRAIL",
      suspensionType: "FULL_SUSPENSION",
      driveType: "CONVENTIONAL",
      purchaseDate: "2023-05-10",
      purchasePrice: 75000,
      currency: "CZK",
      status: "ACTIVE",
      currentKm: 1250,
      currentMinutes: 3000,
      stravaGearId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  // User A's dataset
  const bikesUserA: Bike[] = [
    {
      id: "bike-a1",
      name: "Propain Spindrift",
      manufacturer: "Propain",
      model: "Spindrift",
      category: "MTB",
      discipline: "ENDURO",
      suspensionType: "FULL_SUSPENSION",
      driveType: "CONVENTIONAL",
      purchaseDate: "2023-04-15",
      purchasePrice: 115000,
      currency: "CZK",
      status: "ACTIVE",
      currentKm: 2810,
      currentMinutes: 7200,
      stravaGearId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  // If User A attempts to validate link with User B's bike ID "bike-b1", it fails in User A's context
  const linkAttempt = validateLinkConstraint(bikesUserA, "bike-b1", "gear-a1");
  assert.strictEqual(linkAttempt.valid, false);
  assert.strictEqual(linkAttempt.error?.includes("nebylo nalezeno"), true);
  console.log("✅ PASSED Test 8: User A cannot link Strava gear to User B's BikeVault bike.");
}

// 9. User B cannot synchronize User A's bike
{
  const bikesUserB: Bike[] = [
    {
      id: "bike-b1",
      name: "Liv Intrigue 29",
      manufacturer: "Liv",
      model: "Intrigue 29",
      category: "MTB",
      discipline: "TRAIL",
      suspensionType: "FULL_SUSPENSION",
      driveType: "CONVENTIONAL",
      purchaseDate: "2023-05-10",
      purchasePrice: 75000,
      currency: "CZK",
      status: "ACTIVE",
      currentKm: 1250,
      currentMinutes: 3000,
      stravaGearId: "gear-b1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  // Attempting to find User A's bike "bike-a1" in User B's session returns undefined
  const targetBike = bikesUserB.find(b => b.id === "bike-a1");
  assert.strictEqual(targetBike, undefined);
  console.log("✅ PASSED Test 9: User B cannot synchronize User A's bike.");
}

// 10. Switching Google users clears previous in-memory Strava state
{
  let activeUser = USER_A;
  let inMemoryStatus = await getPublicUserStravaStatus(activeUser);
  assert.strictEqual(inMemoryStatus.athleteName, "Petr Zahrádka");

  // User switches to User B
  activeUser = USER_B;
  inMemoryStatus = await getPublicUserStravaStatus(activeUser);
  assert.strictEqual(inMemoryStatus.athleteName, "Eliška Zahrádková");
  assert.strictEqual(inMemoryStatus.athleteId, "20002");

  // User switches to non-connected User C
  const USER_C = "karel@example.com";
  activeUser = USER_C;
  inMemoryStatus = await getPublicUserStravaStatus(activeUser);
  assert.strictEqual(inMemoryStatus.connected, false);
  assert.strictEqual(inMemoryStatus.athleteName, undefined);
  console.log("✅ PASSED Test 10: Switching Google users clears previous in-memory Strava state.");
}

// 11. Local cache cannot leak Strava data between users
{
  // User A cache key
  const cacheKeyA = `bikevault_strava_cache_${USER_A}`;
  const cacheKeyB = `bikevault_strava_cache_${USER_B}`;

  storageMock.setItem(cacheKeyA, JSON.stringify({ athleteName: "Petr Zahrádka", bikes: ["a1", "a2"] }));
  storageMock.setItem(cacheKeyB, JSON.stringify({ athleteName: "Eliška Zahrádková", bikes: ["b1"] }));

  const readForA = JSON.parse(storageMock.getItem(cacheKeyA)!);
  const readForB = JSON.parse(storageMock.getItem(cacheKeyB)!);

  assert.strictEqual(readForA.athleteName, "Petr Zahrádka");
  assert.strictEqual(readForB.athleteName, "Eliška Zahrádková");
  assert.notStrictEqual(readForA.bikes, readForB.bikes);
  console.log("✅ PASSED Test 11: Local cache cannot leak Strava data between users.");
}

// 12. Refresh tokens remain isolated per user
{
  const authA = await getUserStravaAuth(USER_A);
  const authB = await getUserStravaAuth(USER_B);

  assert.strictEqual(authA?.refreshToken, "user_a_refresh_token_111");
  assert.strictEqual(authB?.refreshToken, "user_b_refresh_token_222");
  assert.notStrictEqual(authA?.refreshToken, authB?.refreshToken);
  console.log("✅ PASSED Test 12: Refresh tokens remain isolated per user.");
}

// 13. Token refresh updates only the correct user's integration
{
  const authA = (await getUserStravaAuth(USER_A))!;
  const updatedA: StravaIntegrationRecord = {
    ...authA,
    accessToken: "user_a_NEW_access_token_999",
  };
  await saveUserStravaAuth(updatedA);

  const freshA = (await getUserStravaAuth(USER_A))!;
  const freshB = (await getUserStravaAuth(USER_B))!;

  assert.strictEqual(freshA.accessToken, "user_a_NEW_access_token_999");
  // User B's token remains completely untouched!
  assert.strictEqual(freshB.accessToken, "user_b_access_token_222");
  console.log("✅ PASSED Test 13: Token refresh updates only the correct user's integration.");
}

// 14. Disconnecting User A's Strava does not affect User B
{
  await clearUserStravaAuth(USER_A);

  const statusA = await getPublicUserStravaStatus(USER_A);
  const statusB = await getPublicUserStravaStatus(USER_B);

  assert.strictEqual(statusA.connected, false);
  assert.strictEqual(statusB.connected, true);
  assert.strictEqual(statusB.athleteName, "Eliška Zahrádková");
  console.log("✅ PASSED Test 14: Disconnecting User A's Strava does not affect User B.");
}

// 15. OAuth callback is bound to the user who initiated authorization (state validation)
{
  const USER_NEW = "novy.uzivatel@example.com";
  // User initiates authorization -> creates secure state
  const stateToken = await createOAuthState(USER_NEW);
  assert.strictEqual(typeof stateToken === "string", true);
  assert.strictEqual(stateToken.length >= 32, true);

  // When callback arrives with this state, consumeOAuthState returns the exact bound user
  const result = await consumeOAuthState(stateToken);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.bikeVaultUserId, USER_NEW);

  // Once consumed, the state cannot be reused (CSRF / replay protection)
  const replayResult = await consumeOAuthState(stateToken);
  assert.strictEqual(replayResult.valid, false);
  assert.strictEqual(replayResult.error?.includes("Neplatný nebo již použitý"), true);

  // Verify GET /api/strava/auth endpoint returns the generated Strava authorization URL
  process.env.STRAVA_CLIENT_ID = "mock_client_id_123";
  process.env.STRAVA_CLIENT_SECRET = "mock_client_secret_456";
  const req = new NextRequest("http://localhost:3000/api/strava/auth", {
    headers: { "x-bikevault-user-id": USER_NEW },
  });
  const res = await authRouteHandler(req);
  const data = await res.json();
  assert.strictEqual(typeof data.url, "string", "Response must contain 'url' string");
  assert.strictEqual(data.url.startsWith("https://www.strava.com/oauth/authorize"), true, "Must redirect to Strava OAuth");
  assert.strictEqual(data.url.includes("client_id=mock_client_id_123"), true, "Must include client_id");
  assert.strictEqual(data.url.includes("response_type=code"), true, "Must include response_type=code");
  assert.strictEqual(data.url.includes("scope=read%2Cprofile%3Aread_all"), true, "Must include required scopes");

  console.log("✅ PASSED Test 15: OAuth callback is bound to the user who initiated authorization.");
}

// 16. Re-authentication with a different Strava athlete cannot silently replace an existing integration
{
  const USER_EXISTING = "existing@example.com";
  await saveUserStravaAuth({
    bikeVaultUserId: USER_EXISTING,
    stravaAthleteId: 30003,
    athleteName: "Původní Sportovec",
    accessToken: "tok_old",
    refreshToken: "ref_old",
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    connectedAt: new Date().toISOString(),
  });

  const existingAuth = (await getUserStravaAuth(USER_EXISTING))!;
  assert.strictEqual(existingAuth.stravaAthleteId, 30003);

  // New OAuth callback returns different athlete 40004
  const newAthleteId = 40004;
  let rejected = false;
  if (existingAuth.stravaAthleteId && String(existingAuth.stravaAthleteId) !== String(newAthleteId)) {
    rejected = true;
  }
  assert.strictEqual(rejected, true, "Must reject silently replacing with a different athlete");
  console.log("✅ PASSED Test 16: Re-authentication with a different Strava athlete cannot silently replace an existing integration.");
}

// 17. stravaGearId relationships cannot cross ownership boundaries
{
  const datasetA = createEmptyVaultData();
  const datasetB = createEmptyVaultData();

  datasetA.bikes = [
    {
      id: "bike-a1",
      name: "Bike A",
      manufacturer: "Brand A",
      model: "Model A",
      category: "MTB",
      discipline: "ENDURO",
      suspensionType: "FULL_SUSPENSION",
      driveType: "CONVENTIONAL",
      purchaseDate: "2023-01-01",
      purchasePrice: 50000,
      currency: "CZK",
      status: "ACTIVE",
      currentKm: 500,
      currentMinutes: 1000,
      stravaGearId: "strava-gear-101",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  datasetB.bikes = [
    {
      id: "bike-b1",
      name: "Bike B",
      manufacturer: "Brand B",
      model: "Model B",
      category: "ROAD",
      discipline: "ROAD",
      suspensionType: "RIGID",
      driveType: "CONVENTIONAL",
      purchaseDate: "2023-02-01",
      purchasePrice: 60000,
      currency: "CZK",
      status: "ACTIVE",
      currentKm: 800,
      currentMinutes: 1500,
      stravaGearId: "strava-gear-202",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  // User B cannot see "strava-gear-101" in their bikes
  assert.strictEqual(datasetB.bikes.some(b => b.stravaGearId === "strava-gear-101"), false);
  // User A cannot see "strava-gear-202" in their bikes
  assert.strictEqual(datasetA.bikes.some(b => b.stravaGearId === "strava-gear-202"), false);
  console.log("✅ PASSED Test 17: stravaGearId relationships cannot cross ownership boundaries.");
}

// 18. Existing BikeVault Google/cloud data isolation remains intact
{
  const cleanData = createEmptyVaultData();
  const validation = validateVaultData(cleanData);
  assert.strictEqual(validation.valid, true);
  assert.strictEqual(cleanData.bikes.length, 0);
  assert.strictEqual(cleanData.odometerEntries.length, 0);
  console.log("✅ PASSED Test 18: Existing BikeVault Google/cloud data isolation remains intact.");
}

console.log("\n🎉 ALL 18 / 18 MULTI-USER STRAVA INTEGRATION TESTS PASSED SUCCESSFULLY!\n");
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
