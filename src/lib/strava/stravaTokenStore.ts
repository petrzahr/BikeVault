import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export interface StravaIntegrationRecord {
  bikeVaultUserId?: string; // e.g. "petr@example.com" or Google sub
  stravaAthleteId: number | string;
  athleteName?: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in seconds
  connectedAt: string; // ISO 8601
  lastSyncAt?: string; // ISO 8601
}

// Backwards compatibility alias
export type StravaAuthData = StravaIntegrationRecord;

export interface PublicStravaStatus {
  connected: boolean;
  athleteName?: string;
  athleteId?: string;
  lastSyncAt?: string;
  bikeVaultUserId?: string;
}

interface OAuthPendingState {
  state: string;
  bikeVaultUserId: string;
  createdAt: number;
  expiresAt: number;
}

const DATA_DIR = path.resolve(process.cwd(), ".data");
const MULTI_AUTH_FILE = path.join(DATA_DIR, "strava_integrations.json");
const LEGACY_AUTH_FILE = path.join(DATA_DIR, "strava_auth.json");
const OAUTH_STATES_FILE = path.join(DATA_DIR, "strava_oauth_states.json");

export const DEFAULT_USER_ID = "default_user";

export function normalizeUserId(userId?: string | null): string {
  if (!userId || typeof userId !== "string") return DEFAULT_USER_ID;
  const clean = userId.trim().toLowerCase();
  return clean || DEFAULT_USER_ID;
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// --- MULTI-USER STORAGE HELPERS ---

function readAllIntegrations(): Record<string, StravaIntegrationRecord> {
  ensureDataDir();
  try {
    if (fs.existsSync(MULTI_AUTH_FILE)) {
      const raw = fs.readFileSync(MULTI_AUTH_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, StravaIntegrationRecord>;
      }
    } else if (fs.existsSync(LEGACY_AUTH_FILE)) {
      // Migrate legacy single-user auth to default user
      const raw = fs.readFileSync(LEGACY_AUTH_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && parsed.accessToken) {
        const migrated: Record<string, StravaIntegrationRecord> = {
          [DEFAULT_USER_ID]: {
            ...parsed,
            bikeVaultUserId: DEFAULT_USER_ID,
            stravaAthleteId: parsed.athleteId || "unknown",
          },
        };
        writeAllIntegrations(migrated);
        return migrated;
      }
    }
  } catch (err) {
    console.error("[StravaTokenStore] Error reading integrations store:", err);
  }
  return {};
}

function writeAllIntegrations(store: Record<string, StravaIntegrationRecord>): void {
  ensureDataDir();
  fs.writeFileSync(MULTI_AUTH_FILE, JSON.stringify(store, null, 2), "utf-8");
}

/**
 * Gets Strava integration data for a specific BikeVault user.
 */
export function getUserStravaAuth(bikeVaultUserId?: string | null): StravaIntegrationRecord | null {
  const userId = normalizeUserId(bikeVaultUserId);
  const all = readAllIntegrations();
  const record = all[userId];
  if (!record || !record.accessToken || !record.refreshToken) {
    return null;
  }
  return record;
}

/**
 * Saves Strava integration data for a specific BikeVault user.
 */
export function saveUserStravaAuth(record: StravaIntegrationRecord): void {
  const userId = normalizeUserId(record.bikeVaultUserId);
  const all = readAllIntegrations();
  all[userId] = {
    ...record,
    bikeVaultUserId: userId,
  };
  writeAllIntegrations(all);

  // If default user, also mirror to legacy file for backward compatibility
  if (userId === DEFAULT_USER_ID) {
    try {
      fs.writeFileSync(LEGACY_AUTH_FILE, JSON.stringify(record, null, 2), "utf-8");
    } catch {
      // ignore
    }
  }
}

/**
 * Removes Strava integration data for a specific BikeVault user.
 */
export function clearUserStravaAuth(bikeVaultUserId?: string | null): void {
  const userId = normalizeUserId(bikeVaultUserId);
  const all = readAllIntegrations();
  if (all[userId]) {
    delete all[userId];
    writeAllIntegrations(all);
  }

  if (userId === DEFAULT_USER_ID && fs.existsSync(LEGACY_AUTH_FILE)) {
    try {
      fs.unlinkSync(LEGACY_AUTH_FILE);
    } catch {
      // ignore
    }
  }
}

/**
 * Updates lastSyncAt timestamp for a specific user's integration.
 */
export function updateUserLastSyncTime(
  bikeVaultUserId?: string | null,
  isoDate = new Date().toISOString()
): void {
  const userId = normalizeUserId(bikeVaultUserId);
  const current = getUserStravaAuth(userId);
  if (current) {
    current.lastSyncAt = isoDate;
    saveUserStravaAuth(current);
  }
}

/**
 * Checks if an access token is expired or expires within 60 seconds.
 */
export function isTokenExpired(record: { expiresAt: number }): boolean {
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return record.expiresAt <= nowInSeconds + 60;
}

/**
 * Returns safe public status for a specific BikeVault user (no tokens or secrets).
 */
export function getPublicUserStravaStatus(bikeVaultUserId?: string | null): PublicStravaStatus {
  const userId = normalizeUserId(bikeVaultUserId);
  const auth = getUserStravaAuth(userId);
  if (!auth) {
    return { connected: false, bikeVaultUserId: userId };
  }
  return {
    connected: true,
    athleteName: auth.athleteName,
    athleteId: String(auth.stravaAthleteId),
    lastSyncAt: auth.lastSyncAt,
    bikeVaultUserId: userId,
  };
}

/**
 * Lists all BikeVault user IDs that have an active Strava connection.
 */
export function getAllConnectedUserIds(): string[] {
  const all = readAllIntegrations();
  return Object.keys(all).filter((id) => Boolean(all[id]?.accessToken));
}

// --- OAUTH STATE REGISTRY ---

function readOAuthStates(): OAuthPendingState[] {
  ensureDataDir();
  try {
    if (fs.existsSync(OAUTH_STATES_FILE)) {
      const raw = fs.readFileSync(OAUTH_STATES_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const now = Date.now();
        // filter out expired states
        return parsed.filter((s) => s.expiresAt > now);
      }
    }
  } catch (err) {
    console.error("[StravaTokenStore] Error reading oauth states:", err);
  }
  return [];
}

function writeOAuthStates(states: OAuthPendingState[]): void {
  ensureDataDir();
  fs.writeFileSync(OAUTH_STATES_FILE, JSON.stringify(states, null, 2), "utf-8");
}

/**
 * Creates a cryptographically secure random state token strictly bound to bikeVaultUserId.
 * Valid for 10 minutes.
 */
export function createOAuthState(bikeVaultUserId?: string | null): string {
  const userId = normalizeUserId(bikeVaultUserId);
  const state = crypto.randomBytes(24).toString("hex");
  const now = Date.now();
  const entry: OAuthPendingState = {
    state,
    bikeVaultUserId: userId,
    createdAt: now,
    expiresAt: now + 10 * 60 * 1000, // 10 minutes
  };

  const current = readOAuthStates();
  current.push(entry);
  writeOAuthStates(current);
  return state;
}

/**
 * Consumes and validates a one-time OAuth state token.
 * Returns the bound bikeVaultUserId if valid, or an error.
 */
export function consumeOAuthState(state?: string | null): {
  valid: boolean;
  bikeVaultUserId?: string;
  error?: string;
} {
  if (!state || typeof state !== "string" || !state.trim()) {
    return { valid: false, error: "Chybí bezpečnostní OAuth parametr 'state'." };
  }

  const cleanState = state.trim();
  const states = readOAuthStates();
  const index = states.findIndex((s) => s.state === cleanState);

  if (index === -1) {
    return {
      valid: false,
      error: "Neplatný nebo již použitý bezpečnostní OAuth stav (state). Zkuste autorizaci znovu.",
    };
  }

  const matched = states[index];
  // Remove consumed state (strictly one-time use)
  states.splice(index, 1);
  writeOAuthStates(states);

  if (matched.expiresAt <= Date.now()) {
    return {
      valid: false,
      error: "Platnost autorizační relace vypršela. Spusťte prosím propojení se Stravou znovu.",
    };
  }

  return {
    valid: true,
    bikeVaultUserId: matched.bikeVaultUserId,
  };
}

// --- BACKWARD COMPATIBILITY SINGLE-USER ALIASES ---

export function getStravaAuth(): StravaIntegrationRecord | null {
  return getUserStravaAuth(DEFAULT_USER_ID);
}

export function saveStravaAuth(auth: Partial<StravaIntegrationRecord> & { accessToken: string; refreshToken: string; expiresAt: number }): void {
  saveUserStravaAuth({
    bikeVaultUserId: auth.bikeVaultUserId || DEFAULT_USER_ID,
    stravaAthleteId: auth.stravaAthleteId || (auth as Record<string, unknown>).athleteId as number | string || "unknown",
    athleteName: auth.athleteName,
    accessToken: auth.accessToken,
    refreshToken: auth.refreshToken,
    expiresAt: auth.expiresAt,
    connectedAt: auth.connectedAt || new Date().toISOString(),
    lastSyncAt: auth.lastSyncAt,
  });
}

export function clearStravaAuth(): void {
  clearUserStravaAuth(DEFAULT_USER_ID);
}

export function updateLastSyncTime(isoDate = new Date().toISOString()): void {
  updateUserLastSyncTime(DEFAULT_USER_ID, isoDate);
}

export function getPublicStravaStatus(): PublicStravaStatus {
  return getPublicUserStravaStatus(DEFAULT_USER_ID);
}
