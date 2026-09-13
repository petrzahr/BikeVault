/**
 * Unit test suite for KvTokenStorageAdapter and Upstash Redis / Vercel KV integration
 * Run: npx tsx tests/kvTokenStorageAdapter.test.ts
 */

import assert from "node:assert";
import { 
  KvTokenStorageAdapter, 
  getStorageAdapter, 
  setCustomStorageAdapterForTest,
  StravaIntegrationRecord 
} from "../src/lib/strava/stravaTokenStore";

console.log("\n=== RUNNING KV / UPSTASH TOKEN STORAGE ADAPTER TESTS ===\n");

// Mock global fetch for Upstash Redis REST tests
const originalFetch = globalThis.fetch;

async function runKvTests() {
  const recordedRequests: Array<{ url: string; method: string; headers: Record<string, string>; body: any }> = [];
  const mockResponses: Map<string, any> = new Map();

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input.toString();
    const headers: Record<string, string> = {};
    if (init?.headers) {
      if (typeof (init.headers as any).forEach === "function") {
        (init.headers as any).forEach((v: string, k: string) => {
          headers[k.toLowerCase()] = v;
        });
      } else {
        for (const [k, v] of Object.entries(init.headers as Record<string, string>)) {
          headers[k.toLowerCase()] = v;
        }
      }
    }

    const body = init?.body ? JSON.parse(init.body.toString()) : undefined;
    recordedRequests.push({ url, method: init?.method || "GET", headers, body });

    // Look up mock response by Redis command name
    const commandName = Array.isArray(body) ? body[0] : "DEFAULT";
    const result = mockResponses.has(commandName) ? mockResponses.get(commandName) : "OK";

    if (result && typeof result === "object" && result.__isError) {
      return {
        ok: false,
        status: result.status || 500,
        text: async () => result.message || "Internal Server Error",
        json: async () => ({ error: result.message }),
      } as Response;
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({ result }),
      text: async () => JSON.stringify({ result }),
    } as Response;
  }) as any;

  try {
    // 1. Adapter initializes with baseUrl and token
    const adapter = new KvTokenStorageAdapter("https://mock-db.upstash.io", "mock_token_abc");
    assert.strictEqual(adapter.name, "vercel_kv");
    console.log("✅ PASSED Test 1: KvTokenStorageAdapter initializes correctly.");

    // 2. saveUserAuth sends SET command with correct Redis key and Bearer auth
    recordedRequests.length = 0;
    const testRecord: StravaIntegrationRecord = {
      bikeVaultUserId: "user@example.com",
      stravaAthleteId: 12345,
      athleteName: "Jan Novák",
      accessToken: "access_123",
      refreshToken: "refresh_456",
      expiresAt: 1700000000,
      connectedAt: "2026-01-01T00:00:00Z",
    };

    await adapter.saveUserAuth(testRecord);
    assert.strictEqual(recordedRequests.length, 2, "Should issue SET and SADD");
    assert.strictEqual(recordedRequests[0].url, "https://mock-db.upstash.io");
    assert.strictEqual(recordedRequests[0].headers["authorization"], "Bearer mock_token_abc");
    assert.strictEqual(recordedRequests[0].body[0], "SET");
    assert.strictEqual(recordedRequests[0].body[1], "bikevault:strava:integration:user@example.com");
    assert.strictEqual(recordedRequests[1].body[0], "SADD");
    assert.strictEqual(recordedRequests[1].body[1], "bikevault:strava:all_users");
    assert.strictEqual(recordedRequests[1].body[2], "user@example.com");
    console.log("✅ PASSED Test 2: saveUserAuth issues correct REST SET and SADD commands.");

    // 3. getUserAuth retrieves and parses record
    mockResponses.set("GET", JSON.stringify(testRecord));
    recordedRequests.length = 0;
    const fetched = await adapter.getUserAuth("user@example.com");
    assert.strictEqual(fetched !== null, true);
    assert.strictEqual(fetched?.athleteName, "Jan Novák");
    assert.strictEqual(fetched?.accessToken, "access_123");
    assert.strictEqual(recordedRequests[0].body[0], "GET");
    assert.strictEqual(recordedRequests[0].body[1], "bikevault:strava:integration:user@example.com");
    console.log("✅ PASSED Test 3: getUserAuth retrieves and deserializes user record.");

    // 4. deleteUserAuth issues DEL and SREM
    recordedRequests.length = 0;
    await adapter.deleteUserAuth("user@example.com");
    assert.strictEqual(recordedRequests.length, 2, "Should issue DEL and SREM");
    assert.strictEqual(recordedRequests[0].body[0], "DEL");
    assert.strictEqual(recordedRequests[0].body[1], "bikevault:strava:integration:user@example.com");
    assert.strictEqual(recordedRequests[1].body[0], "SREM");
    assert.strictEqual(recordedRequests[1].body[1], "bikevault:strava:all_users");
    assert.strictEqual(recordedRequests[1].body[2], "user@example.com");
    console.log("✅ PASSED Test 4: deleteUserAuth issues DEL and SREM.");

    // 5. getAllUserIds uses SMEMBERS
    mockResponses.set("SMEMBERS", ["user1@example.com", "user2@example.com"]);
    recordedRequests.length = 0;
    const userIds = await adapter.getAllUserIds();
    assert.strictEqual(userIds.length, 2);
    assert.strictEqual(userIds[0], "user1@example.com");
    assert.strictEqual(userIds[1], "user2@example.com");
    console.log("✅ PASSED Test 5: getAllUserIds retrieves user IDs via SMEMBERS.");

    // 6. saveOAuthState stores state with TTL
    recordedRequests.length = 0;
    await adapter.saveOAuthState("state_token_123", "user@example.com", 600);
    assert.strictEqual(recordedRequests.length, 1);
    assert.strictEqual(recordedRequests[0].body[0], "SET");
    assert.strictEqual(recordedRequests[0].body[1], "bikevault:strava:state:state_token_123");
    assert.strictEqual(recordedRequests[0].body[3], "EX");
    assert.strictEqual(recordedRequests[0].body[4], 600);
    console.log("✅ PASSED Test 6: saveOAuthState stores state with Redis TTL.");

    // 7. consumeOAuthState validates and atomically deletes state
    mockResponses.set("GET", JSON.stringify({
      state: "state_token_123",
      bikeVaultUserId: "user@example.com",
      expiresAt: Date.now() + 300000,
    }));
    recordedRequests.length = 0;
    const stateResult = await adapter.consumeOAuthState("state_token_123");
    assert.strictEqual(stateResult.valid, true);
    assert.strictEqual(stateResult.bikeVaultUserId, "user@example.com");
    assert.strictEqual(recordedRequests.length, 2, "Should issue GET and DEL");
    assert.strictEqual(recordedRequests[0].body[0], "GET");
    assert.strictEqual(recordedRequests[1].body[0], "DEL");
    console.log("✅ PASSED Test 7: consumeOAuthState atomically consumes state.");

    // 8. getStorageAdapter detects KV_REST_API_URL and KV_REST_API_TOKEN
    setCustomStorageAdapterForTest(null);
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    process.env.KV_REST_API_URL = "https://kv-instance.upstash.io";
    process.env.KV_REST_API_TOKEN = "kv_secret_token";

    const resolvedKv = getStorageAdapter();
    assert.strictEqual(resolvedKv instanceof KvTokenStorageAdapter, true);
    assert.strictEqual(resolvedKv.name, "vercel_kv");
    console.log("✅ PASSED Test 8: getStorageAdapter detects KV_REST_API_URL and KV_REST_API_TOKEN.");

    // 9. getStorageAdapter detects UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    process.env.UPSTASH_REDIS_REST_URL = "https://upstash-instance.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "upstash_secret_token";

    const resolvedUpstash = getStorageAdapter();
    assert.strictEqual(resolvedUpstash instanceof KvTokenStorageAdapter, true);
    console.log("✅ PASSED Test 9: getStorageAdapter detects UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.");

    // 10. getStorageAdapter strips quotes and whitespace from env vars
    process.env.KV_REST_API_URL = ' "https://quoted-kv.upstash.io" ';
    process.env.KV_REST_API_TOKEN = ' "quoted_token" ';

    const resolvedQuoted = getStorageAdapter();
    assert.strictEqual(resolvedQuoted instanceof KvTokenStorageAdapter, true);
    console.log("✅ PASSED Test 10: getStorageAdapter cleans quotes and whitespace from environment variables.");

    // 11. In production on Vercel, missing KV credentials throws error and never falls back to filesystem
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    process.env.VERCEL = "1";

    let threw = false;
    try {
      getStorageAdapter();
    } catch (err: any) {
      threw = true;
      assert.strictEqual(err.message.includes("V produkčním prostředí Vercel není nakonfigurováno perzistentní úložiště"), true);
    }
    assert.strictEqual(threw, true, "Production must fail clearly when KV credentials are not set");
    console.log("✅ PASSED Test 11: Production on Vercel safely rejects unconfigured persistence.");

  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.VERCEL;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  }

  console.log("\n🎉 ALL 11 / 11 KV / UPSTASH ADAPTER TESTS PASSED SUCCESSFULLY!\n");
}

runKvTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
