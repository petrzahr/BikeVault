/**
 * Test Suite for automatic JSON backups into a visible Google Drive folder.
 *
 * Covers the toggle, the 24 h throttle, folder reuse/creation, upload target,
 * retention (only the oldest snapshots beyond the limit are deleted), and that
 * failures never escape tryRunDriveBackup.
 *
 * Run: npx tsx tests/driveBackup.test.ts
 */

import assert from "node:assert";
import {
  DRIVE_BACKUP_FOLDER_NAME,
  DRIVE_BACKUP_MAX_COUNT,
  DRIVE_BACKUP_MIN_INTERVAL_MS,
  getLastDriveBackupAt,
  isDriveBackupEnabled,
  runDriveBackupIfDue,
  setDriveBackupEnabled,
  tryRunDriveBackup,
} from "../src/lib/google/driveBackup";
import { createEmptyVaultData } from "../src/constants/defaultData";
import { BikeVaultData } from "../src/types/vault";

console.log("\n=== RUNNING DRIVE BACKUP TESTS ===\n");

// Minimal in-memory localStorage for node
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: (i: number) => Array.from(store.keys())[i] ?? null,
  get length() {
    return store.size;
  },
} as Storage;

const originalFetch = globalThis.fetch;
const ACCOUNT = "perm-123";

interface RecordedRequest {
  method: string;
  url: string;
  body: string;
}

interface DriveMockOptions {
  existingFolderId?: string | null;
  backupFiles?: Array<{ id: string; name: string }>;
  uploadStatus?: number;
  listStatus?: number;
  searchStatus?: number;
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
}

function mockDrive(opts: DriveMockOptions = {}) {
  const requests: RecordedRequest[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    requests.push({ method, url, body: String(init?.body ?? "") });

    if (opts.searchStatus && method === "GET" && url.includes("mimeType")) return json({}, opts.searchStatus);
    if (method === "GET" && decodeURIComponent(url).includes("mimeType = 'application/vnd.google-apps.folder'")) {
      const files = opts.existingFolderId ? [{ id: opts.existingFolderId, name: DRIVE_BACKUP_FOLDER_NAME }] : [];
      return json({ files });
    }
    if (method === "POST" && url.startsWith("https://www.googleapis.com/drive/v3/files")) {
      return json({ id: "new-folder" });
    }
    if (method === "POST" && url.includes("/upload/drive/v3/files")) {
      return json({ id: "backup-new" }, opts.uploadStatus ?? 200);
    }
    if (method === "GET" && decodeURIComponent(url).includes("in parents")) {
      if (opts.listStatus) return json({}, opts.listStatus);
      return json({ files: opts.backupFiles ?? [] });
    }
    if (method === "DELETE") return new Response(null, { status: 204 });
    return json({ error: "unexpected" }, 500);
  }) as typeof fetch;
  return requests;
}

function resetState() {
  store.clear();
}

function validData(): BikeVaultData {
  return createEmptyVaultData();
}

function backupName(i: number): string {
  // Zero-padded so name-desc order equals age order, like real ISO timestamps
  return `bikevault_zaloha_2026-01-${String(i).padStart(2, "0")}T10-00-00-000Z.json`;
}

async function runTests() {
  try {
    // 1. Enabled by default, toggle persists
    {
      resetState();
      assert.strictEqual(isDriveBackupEnabled(), true, "backups must be enabled by default");
      setDriveBackupEnabled(false);
      assert.strictEqual(isDriveBackupEnabled(), false);
      setDriveBackupEnabled(true);
      assert.strictEqual(isDriveBackupEnabled(), true);
      console.log("✅ PASSED Test 1: toggle defaults to on and persists.");
    }

    // 2. Disabled toggle skips the automatic run, force still runs
    {
      resetState();
      setDriveBackupEnabled(false);
      const requests = mockDrive({ existingFolderId: "folder-1" });
      const skipped = await runDriveBackupIfDue("tok", ACCOUNT, validData());
      assert.deepStrictEqual(skipped, { ran: false, reason: "disabled" });
      assert.strictEqual(requests.length, 0);
      const forced = await runDriveBackupIfDue("tok", ACCOUNT, validData(), { force: true });
      assert.strictEqual(forced.ran, true);
      console.log("✅ PASSED Test 2: disabled toggle skips automatic run, manual run still works.");
    }

    // 3. First run creates the folder and uploads into it with a distinct file name
    {
      resetState();
      const requests = mockDrive({ existingFolderId: null });
      const result = await runDriveBackupIfDue("tok", ACCOUNT, validData());
      assert.strictEqual(result.ran, true);
      const createFolder = requests.find((r) => r.method === "POST" && !r.url.includes("/upload/"));
      assert.ok(createFolder, "folder must be created when missing");
      assert.ok(createFolder!.body.includes(DRIVE_BACKUP_FOLDER_NAME));
      const upload = requests.find((r) => r.url.includes("/upload/"));
      assert.ok(upload, "snapshot must be uploaded");
      assert.ok(upload!.body.includes('"parents":["new-folder"]'), "snapshot must go into the backup folder");
      assert.ok(/"name":"bikevault_zaloha_[^"]+\.json"/.test(upload!.body));
      assert.ok(!upload!.body.includes('"name":"bikevault_data.json"'), "must never reuse the main data file name");
      assert.ok(getLastDriveBackupAt(ACCOUNT), "last run must be recorded");
      console.log("✅ PASSED Test 3: folder created, snapshot uploaded into it, last run recorded.");
    }

    // 4. Existing folder is reused, throttle blocks a second run within 24 h
    {
      resetState();
      const requests = mockDrive({ existingFolderId: "folder-1" });
      await runDriveBackupIfDue("tok", ACCOUNT, validData());
      assert.ok(!requests.some((r) => r.method === "POST" && !r.url.includes("/upload/")), "existing folder must be reused");
      const countAfterFirst = requests.length;
      const second = await runDriveBackupIfDue("tok", ACCOUNT, validData());
      assert.deepStrictEqual(second, { ran: false, reason: "throttled" });
      assert.strictEqual(requests.length, countAfterFirst, "throttled run must not touch Drive");

      // Throttle is per account
      const other = await runDriveBackupIfDue("tok", "other-account", validData());
      assert.strictEqual(other.ran, true);

      // After the interval it runs again
      store.set(`bikevault_drive_backup_last_run_v1:${ACCOUNT}`, String(Date.now() - DRIVE_BACKUP_MIN_INTERVAL_MS - 1000));
      const third = await runDriveBackupIfDue("tok", ACCOUNT, validData());
      assert.strictEqual(third.ran, true);
      console.log("✅ PASSED Test 4: folder reused, 24 h throttle per account works.");
    }

    // 5. Retention deletes only the oldest snapshots beyond the limit, never foreign files
    {
      resetState();
      const files = Array.from({ length: DRIVE_BACKUP_MAX_COUNT + 3 }, (_, i) => ({
        id: `b${i + 1}`,
        name: backupName(i + 1),
      })).reverse(); // name desc, as Drive returns it
      files.splice(5, 0, { id: "foreign", name: "my_notes.txt" });
      const requests = mockDrive({ existingFolderId: "folder-1", backupFiles: files });
      await runDriveBackupIfDue("tok", ACCOUNT, validData());
      const deleted = requests.filter((r) => r.method === "DELETE").map((r) => r.url.split("/").pop());
      assert.deepStrictEqual(deleted.sort(), ["b1", "b2", "b3"], "only the 3 oldest snapshots must be deleted");
      console.log("✅ PASSED Test 5: retention keeps the newest 30 and ignores foreign files.");
    }

    // 6. Cleanup failure does not fail the backup
    {
      resetState();
      mockDrive({ existingFolderId: "folder-1", listStatus: 500 });
      const result = await runDriveBackupIfDue("tok", ACCOUNT, validData());
      assert.strictEqual(result.ran, true);
      console.log("✅ PASSED Test 6: failed cleanup keeps the new backup successful.");
    }

    // 7. Upload failure: not recorded as done, tryRunDriveBackup never throws
    {
      resetState();
      mockDrive({ existingFolderId: "folder-1", uploadStatus: 500 });
      const result = await tryRunDriveBackup("tok", ACCOUNT, validData());
      assert.strictEqual(result.ran, false);
      assert.ok(result.reason?.includes("HTTP 500"));
      assert.strictEqual(getLastDriveBackupAt(ACCOUNT), null, "failed upload must not advance the throttle");
      console.log("✅ PASSED Test 7: upload failure is reported and does not advance the throttle.");
    }

    // 8. Expired token (401) is reported, not thrown
    {
      resetState();
      mockDrive({ searchStatus: 401 });
      const result = await tryRunDriveBackup("tok", ACCOUNT, validData());
      assert.strictEqual(result.ran, false);
      assert.ok(result.reason?.includes("vypršela"));
      console.log("✅ PASSED Test 8: 401 is reported as expired sign-in.");
    }

    // 9. Invalid data is never uploaded
    {
      resetState();
      const requests = mockDrive({ existingFolderId: "folder-1" });
      const broken = { ...validData(), bikes: "nope" } as unknown as BikeVaultData;
      const result = await tryRunDriveBackup("tok", ACCOUNT, broken, { force: true });
      assert.strictEqual(result.ran, false);
      assert.strictEqual(requests.length, 0, "invalid data must not reach Drive");
      console.log("✅ PASSED Test 9: invalid data is rejected before any Drive call.");
    }

    console.log("\n🎉 ALL DRIVE BACKUP TESTS PASSED!\n");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

runTests().catch((err) => {
  console.error("❌ TEST FAILED:", err);
  process.exit(1);
});
