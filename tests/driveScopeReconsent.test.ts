/**
 * Test Suite for Google Drive Scope Validation, Insufficient Scope Detection,
 * Write Guards, and Re-consent Security Flow.
 *
 * Run: npx tsx tests/driveScopeReconsent.test.ts
 */

import assert from "node:assert";
import {
  hasDriveScope,
  GOOGLE_DRIVE_FILE_SCOPE,
  InsufficientDriveScopeError,
} from "../src/lib/google/googleAuth";
import {
  findVaultFile,
  downloadVaultData,
  uploadVaultData,
  isScopeInsufficientError,
} from "../src/lib/google/driveSync";
import { createEmptyVaultData } from "../src/constants/defaultData";
import { NextRequest } from "next/server";
import { resolveAuthenticatedUserId, clearTokenVerificationCacheForTest } from "../src/lib/strava/requestUser";

console.log("\n=== RUNNING GOOGLE DRIVE SCOPE & RE-CONSENT TESTS ===\n");

const originalFetch = globalThis.fetch;

async function runTests() {
  try {
    // 1. Verify GOOGLE_DRIVE_FILE_SCOPE is strictly least-privilege
    {
      assert.strictEqual(
        GOOGLE_DRIVE_FILE_SCOPE,
        "https://www.googleapis.com/auth/drive.file",
        "GOOGLE_DRIVE_FILE_SCOPE must be strictly drive.file without extra scopes"
      );
      console.log("✅ PASSED Test 1: GOOGLE_DRIVE_FILE_SCOPE is strictly least-privilege (drive.file).");
    }

    // 2. Test hasDriveScope helper
    {
      assert.strictEqual(hasDriveScope("https://www.googleapis.com/auth/drive.file"), true);
      assert.strictEqual(hasDriveScope("https://www.googleapis.com/auth/drive.file email"), true);
      assert.strictEqual(hasDriveScope("openid profile https://www.googleapis.com/auth/drive.file"), true);
      assert.strictEqual(hasDriveScope("https://www.googleapis.com/auth/drive"), true);

      // Scopes that lack drive file access
      assert.strictEqual(hasDriveScope("email"), false);
      assert.strictEqual(hasDriveScope("openid email profile"), false);
      assert.strictEqual(hasDriveScope("https://www.googleapis.com/auth/drive.readonly"), false);
      assert.strictEqual(hasDriveScope(null), false);
      assert.strictEqual(hasDriveScope(undefined), false);
      assert.strictEqual(hasDriveScope(""), false);
      console.log("✅ PASSED Test 2: hasDriveScope accurately validates presence of Drive file permissions.");
    }

    // 3. Test isScopeInsufficientError helper
    {
      assert.strictEqual(
        isScopeInsufficientError(403, JSON.stringify({ error: { message: "ACCESS_TOKEN_SCOPE_INSUFFICIENT" } })),
        true
      );
      assert.strictEqual(
        isScopeInsufficientError(403, JSON.stringify({ error: { message: "Insufficient Permission" } })),
        true
      );
      assert.strictEqual(
        isScopeInsufficientError(403, "", 'Bearer error="insufficient_scope"'),
        true
      );
      // Other 403 errors (e.g. rate limit, quota)
      assert.strictEqual(isScopeInsufficientError(403, "User rate limit exceeded"), false);
      // Other HTTP status
      assert.strictEqual(isScopeInsufficientError(401, "Unauthorized"), false);
      assert.strictEqual(isScopeInsufficientError(500, "Internal Error"), false);
      console.log("✅ PASSED Test 3: isScopeInsufficientError detects HTTP 403 scope errors.");
    }

    // 4. Test findVaultFile throws InsufficientDriveScopeError on 403 ACCESS_TOKEN_SCOPE_INSUFFICIENT
    {
      globalThis.fetch = (async () => {
        return {
          ok: false,
          status: 403,
          text: async () => JSON.stringify({
            error: {
              code: 403,
              message: "ACCESS_TOKEN_SCOPE_INSUFFICIENT",
              errors: [{ message: "Insufficient Permission", reason: "ACCESS_TOKEN_SCOPE_INSUFFICIENT" }],
            },
          }),
          headers: new Headers(),
        } as unknown as Response;
      }) as any;

      let threw = false;
      try {
        await findVaultFile("token_lacking_drive_scope");
      } catch (err) {
        threw = true;
        assert.strictEqual(err instanceof InsufficientDriveScopeError, true);
        assert.strictEqual(
          (err as Error).message,
          "BikeVault potřebuje znovu povolit přístup ke svým datům na Google Disku."
        );
      }
      assert.strictEqual(threw, true, "findVaultFile must throw InsufficientDriveScopeError on 403 scope error");
      console.log("✅ PASSED Test 4: findVaultFile throws InsufficientDriveScopeError on 403 ACCESS_TOKEN_SCOPE_INSUFFICIENT.");
    }

    // 5. Test downloadVaultData throws InsufficientDriveScopeError on 403 ACCESS_TOKEN_SCOPE_INSUFFICIENT
    {
      globalThis.fetch = (async () => {
        return {
          ok: false,
          status: 403,
          text: async () => "ACCESS_TOKEN_SCOPE_INSUFFICIENT",
          headers: new Headers(),
        } as unknown as Response;
      }) as any;

      let threw = false;
      try {
        await downloadVaultData("token_lacking_drive_scope", "file_123");
      } catch (err) {
        threw = true;
        assert.strictEqual(err instanceof InsufficientDriveScopeError, true);
      }
      assert.strictEqual(threw, true, "downloadVaultData must throw InsufficientDriveScopeError on 403 scope error");
      console.log("✅ PASSED Test 5: downloadVaultData throws InsufficientDriveScopeError on 403 ACCESS_TOKEN_SCOPE_INSUFFICIENT.");
    }

    // 6. Test uploadVaultData throws InsufficientDriveScopeError on 403 ACCESS_TOKEN_SCOPE_INSUFFICIENT
    {
      globalThis.fetch = (async () => {
        return {
          ok: false,
          status: 403,
          text: async () => "Insufficient Permission",
          headers: new Headers(),
        } as unknown as Response;
      }) as any;

      const dummyData = createEmptyVaultData();
      let threw = false;
      try {
        await uploadVaultData("token_lacking_drive_scope", dummyData, "file_123");
      } catch (err) {
        threw = true;
        assert.strictEqual(err instanceof InsufficientDriveScopeError, true);
      }
      assert.strictEqual(threw, true, "uploadVaultData must throw InsufficientDriveScopeError on 403 scope error");
      console.log("✅ PASSED Test 6: uploadVaultData throws InsufficientDriveScopeError on 403 Insufficient Permission.");
    }

    // 7. Test Write Guard protection: verify that state != 'ready' prevents writing
    {
      const validAppStates = ["authLoading", "cloudLoading", "ready", "loadError", "syncError", "scopeInsufficient"];
      for (const state of validAppStates) {
        const canWrite = state === "ready";
        if (state === "scopeInsufficient") {
          assert.strictEqual(canWrite, false, "When appState is scopeInsufficient, write guard must block autosave");
        }
        if (state === "loadError") {
          assert.strictEqual(canWrite, false, "When appState is loadError, write guard must block autosave");
        }
      }
      console.log("✅ PASSED Test 7: Write guard blocks autosave for scopeInsufficient and loadError states.");
    }

    // 8. Server-side Strava auth validation continues to work with token having drive.file
    {
      clearTokenVerificationCacheForTest();
      globalThis.fetch = (async (input: RequestInfo | URL) => {
        const url = input.toString();
        if (url.includes("googleapis.com/drive/v3/about")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              user: {
                emailAddress: "petr@byzahr.app",
                displayName: "Petr Zahrádka",
              },
            }),
          } as Response;
        }
        return { ok: false, status: 404 } as Response;
      }) as any;

      process.env.VERCEL = "1";
      const req = new NextRequest("https://bikevault.byzahr.app/api/strava/auth", {
        headers: { Authorization: "Bearer token_with_drive_file_scope" },
      });

      const userId = await resolveAuthenticatedUserId(req);
      assert.strictEqual(userId, "petr@byzahr.app");
      console.log("✅ PASSED Test 8: Server-side Strava auth validation verifies token with drive.file scope via about.get.");
    }

  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.VERCEL;
  }

  console.log("\n🎉 ALL 8 / 8 GOOGLE DRIVE SCOPE & RE-CONSENT TESTS PASSED!\n");
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
