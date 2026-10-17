/**
 * Test Suite for flushing the debounced Drive autosave before logout.
 *
 * Bug: logout cancelled the pending 1500 ms autosave timer before revoking the
 * token, so changes made in the last ~1.5 s never reached Drive and were lost
 * (the local cache is cleared on logout as well).
 *
 * Run: npx tsx tests/logoutFlush.test.ts
 */

import assert from "node:assert";
import { createAutosaveQueue } from "../src/lib/sync/autosaveQueue";
import { uploadVaultData } from "../src/lib/google/driveSync";
import { createEmptyVaultData } from "../src/constants/defaultData";
import { BikeVaultData } from "../src/types/vault";

console.log("\n=== RUNNING LOGOUT AUTOSAVE FLUSH TESTS ===\n");

const originalFetch = globalThis.fetch;
const DELAY_MS = 1500;

interface Job {
  token: string;
  data: BikeVaultData;
  fileId?: string;
}

interface RecordedRequest {
  method: string;
  url: string;
  body: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function mockDrive(opts: { status?: number; delayMs?: number } = {}) {
  const requests: RecordedRequest[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({ method: init?.method ?? "GET", url: String(input), body: String(init?.body ?? "") });
    if (opts.delayMs) await sleep(opts.delayMs);
    const status = opts.status ?? 200;
    const payload = status === 200 ? { id: "file-1", name: "bikevault_data.json" } : { error: "boom" };
    return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  return requests;
}

function makeQueue() {
  const errors: unknown[] = [];
  const queue = createAutosaveQueue<Job>({
    delayMs: DELAY_MS,
    run: async (job) => {
      await uploadVaultData(job.token, job.data, job.fileId);
    },
    onError: (err) => errors.push(err),
  });
  return { queue, errors };
}

function dataWithMarker(marker: string): BikeVaultData {
  return { ...createEmptyVaultData(), updatedAt: marker };
}

async function runTests() {
  try {
    // 1. Reproduce the bug: cancelling the pending autosave (old logout behaviour) loses the write
    {
      const requests = mockDrive();
      const { queue } = makeQueue();
      queue.schedule({ token: "tok", data: dataWithMarker("2026-10-17T10:00:00.000Z"), fileId: "file-1" });
      queue.cancel();
      await sleep(50);
      assert.strictEqual(requests.length, 0, "cancel() must not upload anything (this is the lost write)");
      console.log("✅ PASSED Test 1: cancelling the debounced autosave drops the last change (bug reproduced).");
    }

    // 2. flush() uploads the pending change immediately, with the latest data, exactly once
    {
      const requests = mockDrive();
      const { queue, errors } = makeQueue();
      queue.schedule({ token: "tok", data: dataWithMarker("2026-10-17T10:00:01.000Z"), fileId: "file-1" });
      queue.schedule({ token: "tok", data: dataWithMarker("2026-10-17T10:00:02.000Z"), fileId: "file-1" });
      assert.strictEqual(queue.hasPending(), true);

      const result = await queue.flush();
      assert.deepStrictEqual(result, { ok: true, flushed: true });
      assert.strictEqual(requests.length, 1, "flush() must upload without waiting for the debounce");
      assert.strictEqual(requests[0].method, "PATCH");
      assert.ok(requests[0].url.includes("/files/file-1"));
      assert.ok(requests[0].body.includes("2026-10-17T10:00:02.000Z"), "latest data must be uploaded");
      assert.ok(!requests[0].body.includes("2026-10-17T10:00:01.000Z"), "superseded data must not be uploaded");
      assert.strictEqual(errors.length, 0);
      assert.strictEqual(queue.hasPending(), false);

      // The debounce timer must not fire a second upload afterwards
      await sleep(DELAY_MS + 100);
      assert.strictEqual(requests.length, 1, "flushed job must not be uploaded again by the timer");
      console.log("✅ PASSED Test 2: flush() uploads the latest pending change immediately and only once.");
    }

    // 3. flush() waits for an upload that is already in flight
    {
      const requests = mockDrive({ delayMs: 200 });
      const { queue } = makeQueue();
      queue.schedule({ token: "tok", data: dataWithMarker("2026-10-17T10:00:03.000Z"), fileId: "file-1" });
      await sleep(DELAY_MS + 50); // timer fired, request is in flight
      assert.strictEqual(requests.length, 1);
      assert.strictEqual(queue.hasPending(), true, "in-flight upload counts as pending");

      const started = Date.now();
      const result = await queue.flush();
      assert.deepStrictEqual(result, { ok: true, flushed: true });
      assert.ok(Date.now() - started >= 100, "flush() must wait for the in-flight upload");
      assert.strictEqual(requests.length, 1, "in-flight upload must not be duplicated");
      assert.strictEqual(queue.hasPending(), false);
      console.log("✅ PASSED Test 3: flush() waits for an in-flight upload.");
    }

    // 4. A failed flush is reported, so logout can be aborted instead of losing data
    {
      mockDrive({ status: 500 });
      const { queue, errors } = makeQueue();
      queue.schedule({ token: "tok", data: dataWithMarker("2026-10-17T10:00:04.000Z"), fileId: "file-1" });
      const result = await queue.flush();
      assert.strictEqual(result.ok, false);
      if (!result.ok) {
        assert.ok(result.error instanceof Error);
        assert.ok((result.error as Error).message.includes("HTTP 500"));
      }
      assert.strictEqual(errors.length, 1, "onError must be notified so the sync indicator shows the failure");
      console.log("✅ PASSED Test 4: failed flush returns ok=false with the error.");
    }

    // 5. flush() with nothing pending is a no-op
    {
      const requests = mockDrive();
      const { queue } = makeQueue();
      const result = await queue.flush();
      assert.deepStrictEqual(result, { ok: true, flushed: false });
      assert.strictEqual(requests.length, 0);
      console.log("✅ PASSED Test 5: flush() without a pending change sends nothing.");
    }

    // 6. Uploads stay ordered: a newer write waits for the older in-flight one
    {
      const requests = mockDrive({ delayMs: 200 });
      const { queue } = makeQueue();
      queue.schedule({ token: "tok", data: dataWithMarker("2026-10-17T10:00:05.000Z"), fileId: "file-1" });
      await sleep(DELAY_MS + 50); // first upload in flight
      queue.schedule({ token: "tok", data: dataWithMarker("2026-10-17T10:00:06.000Z"), fileId: "file-1" });
      const flushPromise = queue.flush();
      await sleep(50);
      assert.strictEqual(requests.length, 1, "newer upload must wait for the in-flight one");
      const result = await flushPromise;
      assert.deepStrictEqual(result, { ok: true, flushed: true });
      assert.strictEqual(requests.length, 2);
      assert.ok(requests[1].body.includes("2026-10-17T10:00:06.000Z"));
      console.log("✅ PASSED Test 6: uploads are serialized, newest data written last.");
    }

    console.log("\n🎉 ALL LOGOUT AUTOSAVE FLUSH TESTS PASSED!\n");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

runTests().catch((err) => {
  console.error("❌ TEST FAILED:", err);
  process.exit(1);
});
