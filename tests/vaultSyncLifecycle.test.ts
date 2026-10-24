import assert from "node:assert/strict";
import { createAutosaveQueue } from "../src/lib/sync/autosaveQueue";
import { createVaultSyncLifecycle, VaultSyncEffects } from "../src/lib/sync/vaultSyncLifecycle";
import { createEmptyVaultData } from "../src/constants/defaultData";
import { BikeVaultData } from "../src/types/vault";
import { StoredAuthData, InsufficientDriveScopeError, GoogleTokenResponse, loginToGoogle, logoutFromGoogle,
  fetchGoogleUserProfile, getStoredAuth, saveStoredAuth, clearStoredAuth } from "../src/lib/google/googleAuth";
import { CorruptedCloudDataError, findVaultFile, downloadVaultData, uploadVaultData } from "../src/lib/google/driveSync";

// Characterize the existing queue contract before moving orchestration out of React.
async function characterizeQueue() {
  const writes: number[] = [];
  const queue = createAutosaveQueue<number>({ delayMs: 1500, run: async (value) => { writes.push(value); } });
  queue.schedule(1);
  queue.schedule(2);
  assert.deepEqual(await queue.flush(), { ok: true, flushed: true });
  assert.deepEqual(writes, [2]);
  assert.deepEqual(await queue.flush(), { ok: true, flushed: false });
  const failure = new Error("write failed");
  const failing = createAutosaveQueue<number>({ delayMs: 1500, run: async () => { throw failure; } });
  failing.schedule(1);
  assert.deepEqual(await failing.flush(), { ok: false, error: failure });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const marked = (marker: string) => ({ ...createEmptyVaultData(), updatedAt: marker });
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

async function characterizeAuthSideEffects() {
  const descriptors = new Map(["window", "sessionStorage", "localStorage"].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const originalFetch = globalThis.fetch;
  const storage = () => {
    const values = new Map<string, string>();
    return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key) };
  };
  const callbacks: Array<(response: GoogleTokenResponse) => void> = [];
  let revokeDone: (() => void) | undefined;
  Object.defineProperty(globalThis, "window", { configurable: true, value: { google: { accounts: { oauth2: {
    initTokenClient: (config: { callback: (response: GoogleTokenResponse) => void }) => {
      callbacks.push(config.callback);
      return { requestAccessToken: () => undefined };
    },
    revoke: (_token: string, done: () => void) => { revokeDone = done; },
  } } } } });
  for (const key of ["sessionStorage", "localStorage"]) Object.defineProperty(globalThis, key, { configurable: true, value: storage() });
  const auth = (accessToken: string): StoredAuthData => ({ accessToken, expiresAt: Date.now() + 100000,
    scopes: "https://www.googleapis.com/auth/drive.file", user: { permissionId: accessToken } });
  const response = (access_token: string): GoogleTokenResponse => ({ access_token, expires_in: 3600,
    scope: "https://www.googleapis.com/auth/drive.file", token_type: "Bearer" });
  try {
    // A profile belonging to token A must not be written into token B's auth record.
    saveStoredAuth(auth("a"));
    const profileResponse = deferred<Response>();
    globalThis.fetch = async () => profileResponse.promise;
    const profile = fetchGoogleUserProfile("a");
    saveStoredAuth(auth("b"));
    profileResponse.resolve(new Response(JSON.stringify({ user: { permissionId: "a" } })));
    await profile;
    assert.equal(getStoredAuth()?.user?.permissionId, "b");

    // A revoke completion belonging to token A must not clear a newer token B.
    saveStoredAuth(auth("a"));
    const logout = logoutFromGoogle();
    saveStoredAuth(auth("b"));
    revokeDone!(); await logout;
    assert.equal(getStoredAuth()?.accessToken, "b");

    // An older OAuth popup must not satisfy or overwrite the newer request.
    const older = loginToGoogle();
    const cancelled = assert.rejects(older, /novější relací/);
    await tick();
    const newer = loginToGoogle(); await tick();
    callbacks[0](response("late-a"));
    assert.equal(getStoredAuth()?.accessToken, "b");
    callbacks[1](response("new-b"));
    assert.equal(await newer, "new-b"); await cancelled;
    assert.equal(getStoredAuth()?.accessToken, "new-b");

    const pending = loginToGoogle();
    const rejected = assert.rejects(pending, /novější relací/);
    await tick();
    const loggingOut = logoutFromGoogle(); revokeDone!(); await loggingOut;
    callbacks[2](response("after-logout"));
    await rejected;
    assert.equal(getStoredAuth(), null);

    // Exercise all three real Drive 401 paths after switching the stored token.
    for (const operation of [() => findVaultFile("a"), () => downloadVaultData("a", "file"),
      () => uploadVaultData("a", createEmptyVaultData(), "file")]) {
      saveStoredAuth(auth("a"));
      const reply = deferred<Response>();
      globalThis.fetch = async () => reply.promise;
      const request = operation();
      saveStoredAuth(auth("b"));
      reply.resolve(new Response("expired", { status: 401 }));
      await assert.rejects(request, /vypršela/);
      assert.equal(getStoredAuth()?.accessToken, "b");
    }
    // A current-token 401 must still clear expired credentials normally.
    saveStoredAuth(auth("a"));
    globalThis.fetch = async () => new Response("expired", { status: 401 });
    await assert.rejects(findVaultFile("a"));
    assert.equal(getStoredAuth(), null);
  } finally {
    clearStoredAuth();
    globalThis.fetch = originalFetch;
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
}

function fixture(overrides: Partial<VaultSyncEffects> = {}) {
  const events: string[] = [];
  let cloud = marked("cloud");
  let cache = marked("cache");
  let auth: StoredAuthData | null = { accessToken: "token-a", expiresAt: Date.now() + 100000,
    scopes: "https://www.googleapis.com/auth/drive.file", user: { permissionId: "account-a" } };
  let valid = true;
  const effects: VaultSyncEffects = {
    getStoredAuth: () => auth,
    isStoredTokenValid: () => valid,
    hasDriveScope: (scopes) => scopes === "https://www.googleapis.com/auth/drive.file",
    loginToGoogle: async () => auth!.accessToken,
    logoutFromGoogle: async () => { events.push("revoke"); auth = null; },
    fetchGoogleUserProfile: async () => auth?.user ?? null,
    findVaultFile: async () => { events.push("find"); return { id: "file-a", name: "vault" }; },
    downloadVaultData: async () => { events.push("download"); return cloud; },
    uploadVaultData: async (_token, data) => { events.push("upload"); cloud = data; return { id: "file-a", name: "vault" }; },
    loadStoredCacheResult: () => ({ status: "ready", data: cache, isNewInstall: false }),
    saveStoredCache: (data) => { events.push("cache"); cache = data; },
    clearStoredCache: () => { events.push("clear"); cache = marked("cleared"); },
    setActiveStorageKey: () => { events.push("demo-key"); },
    getLastDriveBackupAt: () => null,
    tryRunDriveBackup: async () => { events.push("backup"); return { ran: false, reason: "disabled" }; },
    isDevAuthBypassEnabled: () => false,
    ...overrides,
  };
  const lifecycle = createVaultSyncLifecycle(marked("initial"), effects);
  return { lifecycle, events, effects, getCache: () => cache, setAuth: (next: StoredAuthData) => { auth = next; },
    setValid: (next: boolean) => { valid = next; } };
}

async function run() {
  await characterizeQueue();
  await characterizeAuthSideEffects();
  // Existing authoritative reads, clean first-run creation, blocked corruption, and independent backups.
  {
    const f = fixture();
    await f.lifecycle.initialize();
    assert.equal(f.lifecycle.getState().data.updatedAt, "cloud");
    assert.equal(f.getCache().updatedAt, "cloud");
    assert.ok(!f.events.includes("upload"), "loading authoritative data must not echo it back to Drive");
    f.lifecycle.dispose();
  }
  {
    const writes: BikeVaultData[] = [];
    const f = fixture({ findVaultFile: async () => null,
      uploadVaultData: async (_token, data) => { writes.push(data); return { id: "new", name: "vault" }; } });
    await f.lifecycle.initialize();
    assert.equal(writes.length, 1);
    assert.deepEqual(writes[0].bikes, []);
    assert.equal(f.lifecycle.getState().appState, "ready");
    f.lifecycle.dispose();
  }
  // No React effect or debounce tick occurs between the edit and the user's next action.
  for (const action of ["sync", "logout"] as const) {
    const f = fixture();
    await f.lifecycle.initialize();
    f.events.length = 0;
    f.lifecycle.mutateData((data) => ({ ...data, bikes: [], settings: { ...data.settings, currency: "EUR" } }));
    const edited = f.lifecycle.getState().data;
    if (action === "sync") {
      await f.lifecycle.syncNow();
      assert.equal(f.lifecycle.getState().data, edited);
      assert.ok(f.events.indexOf("upload") < f.events.indexOf("download"));
    } else {
      assert.deepEqual(await f.lifecycle.logout(), { ok: true });
      assert.ok(f.events.indexOf("upload") < f.events.indexOf("revoke"));
      assert.ok(f.events.indexOf("revoke") < f.events.indexOf("clear"));
    }
    assert.equal(f.events.filter((event) => event === "upload").length, 1);
    f.lifecycle.dispose();
  }
  for (const action of ["sync", "logout"] as const) {
    const f = fixture({ uploadVaultData: async () => { throw new Error("write failed"); } });
    await f.lifecycle.initialize();
    f.events.length = 0;
    f.lifecycle.mutateData((data) => data);
    const edited = f.lifecycle.getState().data;
    if (action === "sync") await f.lifecycle.syncNow();
    else assert.equal((await f.lifecycle.logout()).ok, false);
    assert.equal(f.lifecycle.getState().data, edited);
    assert.equal(f.getCache(), edited);
    assert.equal(f.lifecycle.getState().isAuthenticated, true);
    assert.equal(f.lifecycle.getState().syncStatus, "error");
    assert.ok(!f.events.some((event) => ["find", "download", "revoke", "clear"].includes(event)));
    f.lifecycle.dispose();
  }
  // New edits during a save are flushed before either downloading or revoking.
  for (const action of ["sync", "logout"] as const) {
    const gate = deferred<void>();
    const writes: BikeVaultData[] = [];
    const f = fixture({ uploadVaultData: async (_token, data) => {
      writes.push(data);
      if (writes.length === 1) await gate.promise;
      return { id: "file-a", name: "vault" };
    } });
    await f.lifecycle.initialize();
    f.lifecycle.mutateData((data) => data);
    const operation = action === "sync" ? f.lifecycle.syncNow() : f.lifecycle.logout();
    await tick();
    f.lifecycle.mutateData((data) => data);
    const latest = f.lifecycle.getState().data;
    gate.resolve();
    await operation;
    assert.equal(writes.length, 2);
    assert.equal(writes[1], latest);
    f.lifecycle.dispose();
  }
  // A download must never replace an edit made while the read was in flight.
  {
    const gate = deferred<BikeVaultData>();
    let downloads = 0;
    const g = fixture({ downloadVaultData: async () => ++downloads === 1 ? marked("cloud") : gate.promise });
    await g.lifecycle.initialize();
    const sync = g.lifecycle.syncNow();
    await tick();
    g.lifecycle.mutateData((data) => data);
    const latest = g.lifecycle.getState().data;
    gate.resolve(marked("obsolete"));
    await sync;
    assert.equal(g.lifecycle.getState().data, latest);
    assert.equal(g.getCache(), latest);
    assert.ok(g.events.includes("upload"));
    g.lifecycle.dispose();
  }
  // Exercise the real debounce path and serialize manual sync behind an active autosave.
  {
    const gate = deferred<void>();
    const started = deferred<void>();
    let activeWrites = 0;
    let maxWrites = 0;
    let writes = 0;
    const f = fixture({ uploadVaultData: async () => {
      activeWrites++; maxWrites = Math.max(maxWrites, activeWrites); writes++;
      if (writes === 1) { started.resolve(); await gate.promise; }
      activeWrites--;
      return { id: "file-a", name: "vault" };
    } });
    await f.lifecycle.initialize();
    f.lifecycle.mutateData((data) => data);
    await started.promise;
    f.events.length = 0;
    f.lifecycle.mutateData((data) => data);
    const sync = f.lifecycle.syncNow();
    await tick();
    assert.ok(!f.events.includes("download"));
    gate.resolve();
    await sync;
    assert.equal(maxWrites, 1);
    assert.equal(writes, 2);
    f.lifecycle.dispose();
  }
  for (const error of [new CorruptedCloudDataError("corrupt", "raw-json"), new InsufficientDriveScopeError()]) {
    const f = fixture({ downloadVaultData: async () => { throw error; } });
    await f.lifecycle.initialize();
    assert.equal(f.lifecycle.getState().appState, error instanceof CorruptedCloudDataError ? "loadError" : "scopeInsufficient");
    if (error instanceof CorruptedCloudDataError) assert.equal(f.lifecycle.getState().corruptedRawPayload, "raw-json");
    f.events.length = 0;
    f.lifecycle.mutateData((data) => data);
    await f.lifecycle.syncNow();
    assert.equal((await f.lifecycle.logout()).ok, false);
    assert.ok(!f.events.some((event) => ["upload", "revoke", "clear"].includes(event)));
    f.lifecycle.dispose();
  }
  {
    const f = fixture();
    f.setAuth({ accessToken: "token-a", expiresAt: Date.now() + 100000, scopes: "profile" });
    await f.lifecycle.initialize();
    assert.equal(f.lifecycle.getState().appState, "scopeInsufficient");
    assert.ok(!f.events.includes("find"));
    f.lifecycle.dispose();
  }
  // Forced logout invalidates pending reads, writes, profiles, and backup projections.
  for (const kind of ["read", "write", "profile", "backup"] as const) {
    const gate = deferred<void>();
    const f = fixture(kind === "read" ? { downloadVaultData: async () => { await gate.promise; return marked("late"); } } :
      kind === "write" ? { uploadVaultData: async () => { await gate.promise; return { id: "old", name: "vault" }; } } :
      kind === "profile" ? { fetchGoogleUserProfile: async () => { await gate.promise; return { permissionId: "old" }; } } :
        { tryRunDriveBackup: async () => { await gate.promise; return { ran: true }; } });
    const initial = f.lifecycle.initialize();
    if (kind !== "read") await initial;
    else await tick();
    let operation: Promise<unknown> | undefined;
    if (kind === "write") { f.lifecycle.mutateData((data) => data); operation = f.lifecycle.syncNow(); await tick(); }
    await f.lifecycle.logout({ force: true });
    const afterLogout = f.lifecycle.getState();
    const cacheAfterLogout = f.getCache();
    gate.resolve();
    await initial; await operation; await tick();
    assert.equal(f.lifecycle.getState(), afterLogout);
    assert.equal(f.getCache(), cacheAfterLogout);
    f.lifecycle.dispose();
  }
  {
    const old = deferred<BikeVaultData>();
    let calls = 0;
    const f = fixture({ downloadVaultData: async () => ++calls === 1 ? old.promise : marked("account-b") });
    const initial = f.lifecycle.initialize(); await tick();
    f.setAuth({ accessToken: "token-b", expiresAt: Date.now() + 100000, user: { permissionId: "account-b" } });
    await f.lifecycle.login();
    const state = f.lifecycle.getState();
    old.resolve(marked("account-a")); await initial;
    assert.equal(f.lifecycle.getState(), state);
    assert.equal(f.getCache().updatedAt, "account-b");
    f.lifecycle.dispose();
  }
  // Token expiry must retain edits; same-account consent can safely retry them.
  {
    const f = fixture();
    await f.lifecycle.initialize();
    f.lifecycle.mutateData((data) => data);
    const edited = f.lifecycle.getState().data;
    f.setValid(false);
    f.events.length = 0;
    assert.equal((await f.lifecycle.logout()).ok, false);
    assert.equal(f.lifecycle.getState().data, edited);
    assert.ok(!f.events.includes("revoke"));
    f.setValid(true);
    await f.lifecycle.reauthorizeGoogleDrive();
    assert.ok(f.events.indexOf("upload") < f.events.indexOf("download"));
    assert.equal(f.lifecycle.getState().data, edited);
    f.lifecycle.dispose();
  }
  // Unsaved data must never be uploaded to a newly selected account.
  {
    const f = fixture();
    await f.lifecycle.initialize();
    f.lifecycle.mutateData((data) => data);
    const edited = f.lifecycle.getState().data;
    f.events.length = 0;
    f.setAuth({ accessToken: "token-b", expiresAt: Date.now() + 100000, user: { permissionId: "account-b" } });
    await assert.rejects(f.lifecycle.login(), /původnímu účtu/);
    assert.equal(f.lifecycle.getState().data, edited);
    assert.equal(f.getCache(), edited);
    assert.ok(!f.events.some((event) => ["upload", "find", "download", "clear"].includes(event)));
    f.lifecycle.dispose();
  }
  // Reauthorization to the same account must wait for the older in-flight write.
  {
    const gate = deferred<void>();
    const started = deferred<void>();
    let writes = 0;
    let active = 0;
    const f = fixture({ uploadVaultData: async () => {
      assert.equal(active++, 0, "same-account writes must stay serialized across reauthorization");
      if (++writes === 1) { started.resolve(); await gate.promise; }
      active--;
      return { id: "file-a", name: "vault" };
    } });
    await f.lifecycle.initialize();
    f.lifecycle.mutateData((data) => data);
    const firstSync = f.lifecycle.syncNow(); await started.promise;
    f.lifecycle.mutateData((data) => data);
    const consent = f.lifecycle.reauthorizeGoogleDrive(); await tick();
    assert.equal(writes, 1);
    gate.resolve();
    await firstSync; await consent;
    assert.equal(writes, 2);
    f.lifecycle.dispose();
  }
  // Late write errors from a previous account cannot change the new session's status.
  {
    const gate = deferred<void>();
    const f = fixture({ uploadVaultData: async () => { await gate.promise; throw new Error("old failure"); } });
    await f.lifecycle.initialize();
    f.lifecycle.mutateData((data) => data);
    const write = f.lifecycle.syncNow(); await tick();
    await f.lifecycle.logout({ force: true });
    f.setAuth({ accessToken: "token-b", expiresAt: Date.now() + 100000, user: { permissionId: "account-b" } });
    await f.lifecycle.login();
    const state = f.lifecycle.getState();
    gate.resolve(); await write;
    assert.equal(f.lifecycle.getState(), state);
    f.lifecycle.dispose();
  }
  {
    const gate = deferred<BikeVaultData>();
    let reads = 0;
    let activeReads = 0;
    const f = fixture({ downloadVaultData: async () => {
      assert.equal(activeReads++, 0);
      const result = ++reads === 2 ? await gate.promise : marked("cloud");
      activeReads--;
      return result;
    } });
    await f.lifecycle.initialize();
    const first = f.lifecycle.syncNow(); const second = f.lifecycle.syncNow();
    await tick();
    assert.equal(reads, 2, "the second manual sync must wait for the first read");
    gate.resolve(marked("cloud")); await first; await second;
    assert.equal(reads, 3);
    f.lifecycle.dispose();
  }
  {
    const f = fixture({ tryRunDriveBackup: async () => { throw new Error("backup failed"); } });
    await f.lifecycle.initialize(); await tick();
    assert.equal(f.lifecycle.getState().syncStatus, "synced");
    assert.equal(f.lifecycle.getState().appState, "ready");
    f.lifecycle.dispose();
  }
  {
    const f = fixture({ isDevAuthBypassEnabled: () => true });
    await f.lifecycle.initialize();
    f.lifecycle.mutateData((data) => data);
    await f.lifecycle.syncNow();
    assert.equal((await f.lifecycle.logout()).ok, true);
    assert.ok(f.events.includes("demo-key"));
    assert.ok(!f.events.some((event) => ["find", "download", "upload", "backup"].includes(event)));
    f.lifecycle.dispose();
  }
  console.log("Vault sync lifecycle tests passed");
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
