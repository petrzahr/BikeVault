import { BikeVaultData } from "../../types/vault";
import { createEmptyVaultData } from "../../constants/defaultData";
import { getStoredAuth, isStoredTokenValid, hasDriveScope, loginToGoogle, logoutFromGoogle, fetchGoogleUserProfile, GoogleUser, InsufficientDriveScopeError } from "../google/googleAuth";
import { findVaultFile, downloadVaultData, uploadVaultData, CorruptedCloudDataError } from "../google/driveSync";
import { loadStoredCacheResult, saveStoredCache, clearStoredCache, setActiveStorageKey, STORAGE_KEY_DEMO } from "../storage/storageService";
import { getLastDriveBackupAt, tryRunDriveBackup } from "../google/driveBackup";
import { isDevAuthBypassEnabled, DEV_BYPASS_USER } from "../devAuthBypass";
import { createAutosaveQueue } from "./autosaveQueue";

export type SyncStatus = "synced" | "saving" | "offline" | "error";
export type AppState = "authLoading" | "cloudLoading" | "ready" | "loadError" | "syncError" | "scopeInsufficient";
export type LogoutResult = { ok: true } | { ok: false; error: string };
export interface VaultSyncState {
  data: BikeVaultData;
  appState: AppState;
  syncStatus: SyncStatus;
  syncError: string | null;
  loadErrorDetail: string | null;
  corruptedRawPayload: string | null;
  user: GoogleUser | null;
  lastSyncedAt: Date | null;
  lastDriveBackupAt: Date | null;
  isLoaded: boolean;
  isAuthenticated: boolean;
  isInitialSyncDone: boolean;
}

const defaultEffects = {
  getStoredAuth, isStoredTokenValid, hasDriveScope, loginToGoogle, logoutFromGoogle,
  fetchGoogleUserProfile, findVaultFile, downloadVaultData, uploadVaultData,
  loadStoredCacheResult, saveStoredCache, clearStoredCache, setActiveStorageKey,
  getLastDriveBackupAt, tryRunDriveBackup, isDevAuthBypassEnabled,
};
export type VaultSyncEffects = typeof defaultEffects;
const message = (error: unknown) => error instanceof Error ? error.message : String(error);
const scopeError = (error: unknown) => error instanceof InsufficientDriveScopeError ||
  /ACCESS_TOKEN_SCOPE_INSUFFICIENT|insufficient_scope|insufficientPermissions|Insufficient Permission/.test(message(error));
const scopeMessage = "BikeVault potřebuje znovu povolit přístup ke svým datům na Google Disku.";

/** Owns session-local ordering; Drive remains authoritative and the document format is unchanged. */
export function createVaultSyncLifecycle(initialData: BikeVaultData, overrides: Partial<VaultSyncEffects> = {}) {
  const effects = { ...defaultEffects, ...overrides };
  let state: VaultSyncState = {
    data: initialData, appState: "authLoading", syncStatus: "offline", syncError: null,
    loadErrorDetail: null, corruptedRawPayload: null, user: null, lastSyncedAt: null,
    lastDriveBackupAt: null, isLoaded: false, isAuthenticated: false, isInitialSyncDone: false,
  };
  let generation = 0;
  let revision = 0;
  let savedRevision = 0;
  let fileId: string | undefined;
  let token: string | undefined;
  let closing = false;
  let authoritativeLoaded = false;
  let tail: Promise<unknown> = Promise.resolve();
  const listeners = new Set<(state: VaultSyncState) => void>();
  const publish = (patch: Partial<VaultSyncState>) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener(state));
  };
  const current = (session: number) => session === generation;
  const canWrite = () => !closing && state.isAuthenticated && state.isInitialSyncDone && state.appState === "ready";
  const serial = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = tail.then(operation);
    tail = result.catch(() => undefined);
    return result;
  };
  const reportError = (error: unknown, loading = false) => {
    const insufficient = scopeError(error);
    const corrupted = error instanceof CorruptedCloudDataError;
    const text = insufficient ? scopeMessage : message(error);
    publish({ syncStatus: "error", syncError: text,
      ...(insufficient ? { appState: "scopeInsufficient" as const } : {}),
      ...(loading ? { isInitialSyncDone: true,
        appState: corrupted ? "loadError" : insufficient ? "scopeInsufficient" : state.appState === "ready" ? "ready" : "syncError",
        ...(corrupted ? { loadErrorDetail: text,
          corruptedRawPayload: typeof error.rawPayload === "string" ? error.rawPayload : error.rawPayload ? JSON.stringify(error.rawPayload, null, 2) : null } : {}),
      } : {}),
    });
  };
  const save = async (session: number) => {
    while (current(session) && revision !== savedRevision) {
      if (!canWrite()) throw new Error(state.syncError ?? "Zápis na Google Disk je zablokovaný.");
      if (effects.isDevAuthBypassEnabled()) { savedRevision = revision; return; }
      const auth = effects.getStoredAuth();
      if (!auth || !effects.isStoredTokenValid() || auth.accessToken !== token) {
        publish({ syncStatus: "offline" });
        throw new Error("Poslední změny nejsou uložené na Google Disku.");
      }
      if (auth.scopes && !effects.hasDriveScope(auth.scopes)) throw new InsufficientDriveScopeError();
      const writingRevision = revision;
      const writingData = state.data;
      publish({ syncStatus: "saving", syncError: null });
      const result = await effects.uploadVaultData(auth.accessToken, writingData, fileId);
      if (!current(session)) return;
      fileId = result.id;
      savedRevision = writingRevision;
      publish({ lastSyncedAt: new Date(), syncStatus: revision === savedRevision ? "synced" : "saving", syncError: null });
    }
  };
  const queue = createAutosaveQueue<number>({
    delayMs: 1500,
    run: (session) => serial(async () => {
      if (!current(session)) return;
      try { await save(session); } catch (error) { if (current(session)) reportError(error); throw error; }
    }),
  });
  const invalidate = () => {
    generation++;
    queue.cancel();
    // New sessions must not wait for obsolete network requests.
    tail = Promise.resolve();
    closing = false;
    return generation;
  };
  const backup = (session: number, accessToken: string, profile: Promise<GoogleUser | null>, data: BikeVaultData) => {
    void profile.then(async (user) => {
      if (!current(session) || !user?.permissionId) return;
      publish({ lastDriveBackupAt: effects.getLastDriveBackupAt(user.permissionId) });
      const result = await effects.tryRunDriveBackup(accessToken, user.permissionId, data);
      if (current(session) && result.ran) publish({ lastDriveBackupAt: new Date() });
    }).catch(() => undefined);
  };
  const load = async (session: number) => {
    if (!current(session) || !token || effects.isDevAuthBypassEnabled()) return;
    const accessToken = token;
    publish({ syncStatus: "saving", syncError: null, loadErrorDetail: null });
    const profile = effects.fetchGoogleUserProfile(accessToken).then((user) => {
      if (current(session) && user) publish({ user });
      return user;
    }).catch(() => null);
    try {
      const auth = effects.getStoredAuth();
      if (auth?.scopes && !effects.hasDriveScope(auth.scopes)) throw new InsufficientDriveScopeError();
      const startedRevision = revision;
      const file = await effects.findVaultFile(accessToken);
      if (!current(session)) return;
      let cloudData: BikeVaultData;
      if (file) {
        fileId = file.id;
        cloudData = await effects.downloadVaultData(accessToken, file.id);
      } else {
        cloudData = createEmptyVaultData();
        const created = await effects.uploadVaultData(accessToken, cloudData);
        if (!current(session)) return;
        fileId = created.id;
      }
      if (!current(session)) return;
      authoritativeLoaded = true;
      // Edits made while downloading stay local and are saved after the read finishes.
      if (revision === startedRevision) {
        effects.saveStoredCache(cloudData);
        publish({ data: cloudData });
      }
      publish({ appState: "ready", isInitialSyncDone: true, syncStatus: revision === savedRevision ? "synced" : "saving", lastSyncedAt: new Date() });
      if (file) backup(session, accessToken, profile, cloudData);
      await save(session);
    } catch (error) {
      if (current(session) && error instanceof CorruptedCloudDataError) authoritativeLoaded = false;
      if (current(session)) reportError(error, true);
    }
  };
  const synchronize = (session: number) => {
    queue.cancel();
    return serial(async () => {
      if (!current(session)) return;
      try {
        do { await save(session); } while (current(session) && revision !== savedRevision);
      } catch (error) { if (current(session)) reportError(error); return; }
      if (current(session)) await load(session);
    });
  };

  const initialize = async () => {
    const session = invalidate();
    token = undefined;
    fileId = undefined;
    revision = savedRevision = 0;
    authoritativeLoaded = false;
    if (effects.isDevAuthBypassEnabled()) {
      effects.setActiveStorageKey(STORAGE_KEY_DEMO);
      const cache = effects.loadStoredCacheResult();
      publish({ ...(cache.status === "ready" ? { data: cache.data } : {}), user: DEV_BYPASS_USER,
        isAuthenticated: true, appState: "ready", syncStatus: "offline", isLoaded: true, isInitialSyncDone: true });
      return;
    }
    const auth = effects.getStoredAuth();
    if (!auth || !effects.isStoredTokenValid()) {
      publish({ isAuthenticated: false, appState: "authLoading", isLoaded: true, isInitialSyncDone: true, syncStatus: "offline" });
      return;
    }
    token = auth.accessToken;
    publish({ isAuthenticated: true, user: auth.user ?? null, isLoaded: true, isInitialSyncDone: false, appState: "cloudLoading" });
    if (auth.scopes && !effects.hasDriveScope(auth.scopes)) { reportError(new InsufficientDriveScopeError(), true); return; }
    const cache = effects.loadStoredCacheResult();
    if (cache.status === "ready" && !cache.isNewInstall) publish({ data: cache.data });
    else if (cache.status === "loadError" && cache.corruptedRaw) publish({ corruptedRawPayload: cache.corruptedRaw });
    await synchronize(session);
  };
  const login = async (consent = false) => {
    // Preserve unsaved edits on same-account reauthorization, but never send them to another account.
    const previousUser = state.user;
    const previousState = state.appState;
    const previousTail = tail;
    const session = invalidate();
    publish({ syncStatus: "saving", syncError: null, loadErrorDetail: null, appState: "cloudLoading" });
    try {
      const accessToken = await effects.loginToGoogle(consent ? "consent" : undefined);
      if (!current(session)) return;
      const user = await effects.fetchGoogleUserProfile(accessToken);
      if (!current(session)) return;
      const dirty = revision !== savedRevision;
      if (dirty && (!previousUser?.permissionId || previousUser.permissionId !== user?.permissionId)) {
        throw new Error("Neuložené změny patří původnímu účtu. Přihlas se stejným účtem nebo změny nejprve exportuj.");
      }
      if (previousUser?.permissionId && previousUser.permissionId === user?.permissionId) tail = previousTail;
      token = accessToken;
      fileId = dirty ? fileId : undefined;
      if (!dirty) revision = savedRevision = 0;
      publish({ user, isAuthenticated: true, isInitialSyncDone: dirty && authoritativeLoaded,
        appState: dirty && authoritativeLoaded ? "ready" : "cloudLoading" });
      await synchronize(session);
    } catch (error) {
      if (current(session)) {
        publish({ appState: consent ? "scopeInsufficient" : previousState });
        reportError(error);
        throw error;
      }
    }
  };
  const logout = async (options?: { force?: boolean }): Promise<LogoutResult> => {
    const session = generation;
    const finish = async (): Promise<LogoutResult> => {
      if (!current(session)) return { ok: false, error: "Přihlášení se mezitím změnilo." };
      if (!options?.force) {
        try {
          do { await save(session); } while (current(session) && revision !== savedRevision);
        } catch (error) {
          if (current(session)) reportError(error);
          return { ok: false, error: message(error) };
        }
        if (!current(session)) return { ok: false, error: "Přihlášení se mezitím změnilo." };
        if (state.appState === "ready" && (state.syncStatus === "error" || state.syncStatus === "offline") && !effects.isDevAuthBypassEnabled()) {
          return { ok: false, error: state.syncError ?? "Poslední změny nejsou uložené na Google Disku." };
        }
      }
      const logoutSession = invalidate();
      closing = true;
      publish({ appState: "authLoading" });
      await effects.logoutFromGoogle();
      if (!current(logoutSession)) return { ok: true };
      token = undefined;
      fileId = undefined;
      revision = savedRevision = 0;
      effects.clearStoredCache();
      publish({ data: createEmptyVaultData(), user: null, lastDriveBackupAt: null,
        isAuthenticated: false, isInitialSyncDone: true, syncStatus: "offline" });
      return { ok: true };
    };
    queue.cancel();
    return options?.force ? finish() : serial(finish);
  };
  return {
    getState: () => state,
    subscribe(listener: (state: VaultSyncState) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    initialize, login: () => login(), reauthorizeGoogleDrive: () => login(true), logout,
    syncNow: async () => {
      if (effects.isDevAuthBypassEnabled() || closing) return;
      const auth = effects.getStoredAuth();
      if (!auth || !effects.isStoredTokenValid() || auth.accessToken !== token) { await login(); return; }
      await synchronize(generation);
    },
    mutateData(fn: (previous: BikeVaultData) => BikeVaultData) {
      if (closing) return;
      const next = { ...fn(state.data), updatedAt: new Date().toISOString() };
      revision++;
      publish({ data: next });
      if (!canWrite()) return;
      effects.saveStoredCache(next);
      if (effects.isDevAuthBypassEnabled()) { savedRevision = revision; return; }
      publish({ syncStatus: "saving" });
      queue.schedule(generation);
    },
    // React cleanup also invalidates all outstanding asynchronous projections.
    dispose() { invalidate(); },
    setLastDriveBackupAt(value: Date) { publish({ lastDriveBackupAt: value }); },
    getGeneration: () => generation,
  };
}
