/**
 * Unit & Integration Test Suite for Server-Side Google Token Validation & Strava OAuth Security
 * Run: npx tsx tests/googleTokenValidation.test.ts
 */

import assert from "node:assert";
import { NextRequest } from "next/server";
import { GET as authRouteHandler } from "../src/app/api/strava/auth/route";
import { GET as callbackRouteHandler } from "../src/app/api/strava/callback/route";
import { 
  resolveAuthenticatedUserId, 
  UnauthorizedError, 
  clearTokenVerificationCacheForTest 
} from "../src/lib/strava/requestUser";
import { 
  setCustomStorageAdapterForTest, 
  MemoryTokenStorageAdapter, 
  getUserStravaAuth,
  getPublicUserStravaStatus 
} from "../src/lib/strava/stravaTokenStore";

console.log("\n=== RUNNING GOOGLE TOKEN VALIDATION & AUTH SECURITY TESTS ===\n");

const memoryAdapter = new MemoryTokenStorageAdapter();
setCustomStorageAdapterForTest(memoryAdapter);

const originalFetch = globalThis.fetch;

async function runTests() {
  process.env.STRAVA_CLIENT_ID = "mock_strava_client_id_777";
  process.env.STRAVA_CLIENT_SECRET = "mock_strava_client_secret_888";

  // Mock responses for Google API calls
  const mockGoogleDriveResponses = new Map<string, any>();
  const mockGoogleUserInfoResponses = new Map<string, any>();

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input.toString();
    const authHeader = (init?.headers as any)?.["Authorization"] || (init?.headers as any)?.["authorization"];
    const token = authHeader?.replace("Bearer ", "").trim();

    // 1. Google Drive API about.get (primary for BikeVault drive.file scope)
    if (url.includes("googleapis.com/drive/v3/about")) {
      if (token && mockGoogleDriveResponses.has(token)) {
        const resp = mockGoogleDriveResponses.get(token);
        if (resp.status === 200) {
          return {
            ok: true,
            status: 200,
            json: async () => resp.body,
          } as Response;
        }
        return {
          ok: false,
          status: resp.status,
          json: async () => resp.body,
        } as Response;
      }
      return {
        ok: false,
        status: 401,
        json: async () => ({ error: { code: 401, message: "Invalid Credentials" } }),
      } as Response;
    }

    // 2. Google OAuth2 userinfo
    if (url.includes("googleapis.com/oauth2/v3/userinfo")) {
      if (token && mockGoogleUserInfoResponses.has(token)) {
        const resp = mockGoogleUserInfoResponses.get(token);
        if (resp.status === 200) {
          return {
            ok: true,
            status: 200,
            json: async () => resp.body,
          } as Response;
        }
        return {
          ok: false,
          status: resp.status,
          json: async () => resp.body,
        } as Response;
      }
      return {
        ok: false,
        status: 403,
        json: async () => ({ error: "insufficient_scope" }),
      } as Response;
    }

    // 3. Strava OAuth token exchange
    if (url.includes("oauth/token")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          access_token: "strava_mock_access_token_999",
          refresh_token: "strava_mock_refresh_token_999",
          expires_at: Math.floor(Date.now() / 1000) + 21600,
          athlete: {
            id: 888123,
            firstname: "Petr",
            lastname: "Zahrádka",
          },
        }),
      } as Response;
    }

    return originalFetch(input, init);
  }) as any;

  try {
    // 1. Google Drive API about.get successfully validates token with drive.file scope
    {
      clearTokenVerificationCacheForTest();
      mockGoogleDriveResponses.set("valid_drive_token_petr", {
        status: 200,
        body: {
          user: {
            emailAddress: "petr@byzahr.app",
            displayName: "Petr Zahrádka",
          },
        },
      });

      const req = new NextRequest("https://bikevault.byzahr.app/api/strava/auth", {
        headers: { Authorization: "Bearer valid_drive_token_petr" },
      });

      process.env.VERCEL = "1";
      const resolvedUser = await resolveAuthenticatedUserId(req);
      assert.strictEqual(resolvedUser, "petr@byzahr.app");
      console.log("✅ PASSED Test 1: Google Drive API about.get validates token with drive.file scope.");
    }

    // 2. Token verification cache avoids redundant external Google network calls
    {
      // Calling again with the same token uses in-memory cache
      const req = new NextRequest("https://bikevault.byzahr.app/api/strava/auth", {
        headers: { Authorization: "Bearer valid_drive_token_petr" },
      });

      mockGoogleDriveResponses.delete("valid_drive_token_petr"); // Delete mock to prove cache is used
      const resolvedCachedUser = await resolveAuthenticatedUserId(req);
      assert.strictEqual(resolvedCachedUser, "petr@byzahr.app");
      console.log("✅ PASSED Test 2: In-memory token verification cache returns cached user identity.");
    }

    // 3. Fallback to Google OAuth2 userinfo when token has openid/email scope
    {
      clearTokenVerificationCacheForTest();
      mockGoogleUserInfoResponses.set("valid_userinfo_token_eliska", {
        status: 200,
        body: {
          email: "eliska@byzahr.app",
          name: "Eliška Zahrádková",
        },
      });

      const req = new NextRequest("https://bikevault.byzahr.app/api/strava/auth", {
        headers: { Authorization: "Bearer valid_userinfo_token_eliska" },
      });

      process.env.VERCEL = "1";
      const resolvedUser = await resolveAuthenticatedUserId(req);
      assert.strictEqual(resolvedUser, "eliska@byzahr.app");
      console.log("✅ PASSED Test 3: Fallback to Google OAuth2 userinfo validates email scope.");
    }

    // 4. In production, unauthenticated request (no Authorization header) throws UnauthorizedError
    {
      clearTokenVerificationCacheForTest();
      process.env.VERCEL = "1";

      const unauthReq = new NextRequest("https://bikevault.byzahr.app/api/strava/auth");

      let threw = false;
      try {
        await resolveAuthenticatedUserId(unauthReq);
      } catch (err) {
        threw = true;
        assert.strictEqual(err instanceof UnauthorizedError, true);
      }
      assert.strictEqual(threw, true, "Production must reject missing Authorization header");
      console.log("✅ PASSED Test 4: Unauthenticated request in production throws UnauthorizedError.");
    }

    // 5. In production, forged/invalid Google token throws UnauthorizedError
    {
      clearTokenVerificationCacheForTest();
      process.env.VERCEL = "1";

      const invalidReq = new NextRequest("https://bikevault.byzahr.app/api/strava/auth", {
        headers: { Authorization: "Bearer forged_or_expired_google_token" },
      });

      let threw = false;
      try {
        await resolveAuthenticatedUserId(invalidReq);
      } catch (err) {
        threw = true;
        assert.strictEqual(err instanceof UnauthorizedError, true);
      }
      assert.strictEqual(threw, true, "Production must reject invalid or expired Google tokens");
      console.log("✅ PASSED Test 5: Invalid/expired Google token in production is rejected.");
    }

    // 6. Forged x-bikevault-user-id header is ignored in production
    {
      clearTokenVerificationCacheForTest();
      mockGoogleDriveResponses.set("valid_token_user_a", {
        status: 200,
        body: {
          user: {
            emailAddress: "usera@byzahr.app",
          },
        },
      });

      process.env.VERCEL = "1";

      // Attacker attempts to impersonate user B by spoofing header
      const spoofReq = new NextRequest("https://bikevault.byzahr.app/api/strava/auth", {
        headers: {
          Authorization: "Bearer valid_token_user_a",
          "x-bikevault-user-id": "userb@byzahr.app",
        },
      });

      const resolved = await resolveAuthenticatedUserId(spoofReq);
      assert.strictEqual(resolved, "usera@byzahr.app", "Authoritative Google token must override spoofed header");
      assert.notStrictEqual(resolved, "userb@byzahr.app");
      console.log("✅ PASSED Test 6: Spoofed x-bikevault-user-id cannot override verified Google identity.");
    }

    // 7. GET /api/strava/auth returns 401 Unauthorized when signed out
    {
      process.env.VERCEL = "1";

      const req = new NextRequest("https://bikevault.byzahr.app/api/strava/auth");
      const res = await authRouteHandler(req);
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.error.includes("Chybí platné ověření účtu Google"), true);
      console.log("✅ PASSED Test 7: GET /api/strava/auth returns 401 when signed out.");
    }

    // 8. Complete flow: User A authenticates, gets authorize URL, binds state, and callback stores credentials under User A
    {
      clearTokenVerificationCacheForTest();
      memoryAdapter.clear();
      mockGoogleDriveResponses.set("token_petr_flow", {
        status: 200,
        body: {
          user: {
            emailAddress: "petr@byzahr.app",
          },
        },
      });

      // Step 1: User A clicks "Připojit Stravu" -> GET /api/strava/auth
      const authReq = new NextRequest("https://bikevault.byzahr.app/api/strava/auth", {
        headers: { Authorization: "Bearer token_petr_flow" },
      });
      const authRes = await authRouteHandler(authReq);
      assert.strictEqual(authRes.status, 200);
      const authData = await authRes.json();
      assert.strictEqual(typeof authData.url, "string");

      const parsedUrl = new URL(authData.url);
      const stateParam = parsedUrl.searchParams.get("state")!;
      assert.strictEqual(typeof stateParam === "string" && stateParam.length >= 32, true);

      // Step 2: Strava redirects back to /api/strava/callback?code=mock_code&state=...
      const callbackReq = new NextRequest(`https://bikevault.byzahr.app/api/strava/callback?code=mock_code_123&state=${stateParam}`);
      const callbackRes = await callbackRouteHandler(callbackReq);

      // Verify redirect to settings with success
      assert.strictEqual(callbackRes.status, 307); // NextResponse.redirect status
      const redirectLocation = callbackRes.headers.get("location") || "";
      assert.strictEqual(redirectLocation.includes("strava_connected=true"), true);
      assert.strictEqual(redirectLocation.includes("userId=petr%40byzahr.app"), true);

      // Step 3: Check credentials in durable storage are stored strictly under petr@byzahr.app
      const storedAuth = await getUserStravaAuth("petr@byzahr.app");
      assert.strictEqual(storedAuth !== null, true);
      assert.strictEqual(storedAuth?.stravaAthleteId, 888123);
      assert.strictEqual(storedAuth?.athleteName, "Petr Zahrádka");

      // Verify another user (eliska@byzahr.app) has NO access to this integration
      const otherAuth = await getUserStravaAuth("eliska@byzahr.app");
      assert.strictEqual(otherAuth, null);

      console.log("✅ PASSED Test 8: Complete flow (auth -> state bind -> callback -> Redis persist) isolated per user.");
    }

  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.VERCEL;
  }

  console.log("\n🎉 ALL 8 / 8 GOOGLE TOKEN VALIDATION & AUTH SECURITY TESTS PASSED!\n");
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
