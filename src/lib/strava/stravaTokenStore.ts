import fs from "node:fs";
import path from "node:path";

export interface StravaAuthData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in seconds
  athleteId: number | string;
  athleteName?: string;
  connectedAt: string; // ISO 8601
  lastSyncAt?: string; // ISO 8601
}

export interface PublicStravaStatus {
  connected: boolean;
  athleteName?: string;
  athleteId?: string;
  lastSyncAt?: string;
}

const DATA_DIR = path.resolve(process.cwd(), ".data");
const AUTH_FILE = path.join(DATA_DIR, "strava_auth.json");

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Reads Strava authentication data from server-side secure storage (.data/strava_auth.json).
 * Never exposes tokens to client-side code.
 */
export function getStravaAuth(): StravaAuthData | null {
  try {
    if (!fs.existsSync(AUTH_FILE)) {
      return null;
    }
    const raw = fs.readFileSync(AUTH_FILE, "utf-8");
    const parsed = JSON.parse(raw) as StravaAuthData;
    if (!parsed || !parsed.accessToken || !parsed.refreshToken) {
      return null;
    }
    return parsed;
  } catch (err) {
    console.error("[StravaTokenStore] Error reading Strava auth store:", err);
    return null;
  }
}

/**
 * Saves Strava authentication data to server-side storage (.data/strava_auth.json).
 */
export function saveStravaAuth(auth: StravaAuthData): void {
  ensureDataDir();
  fs.writeFileSync(AUTH_FILE, JSON.stringify(auth, null, 2), "utf-8");
}

/**
 * Removes Strava authentication data upon disconnection.
 */
export function clearStravaAuth(): void {
  try {
    if (fs.existsSync(AUTH_FILE)) {
      fs.unlinkSync(AUTH_FILE);
    }
  } catch (err) {
    console.error("[StravaTokenStore] Error clearing Strava auth store:", err);
  }
}

/**
 * Updates lastSyncAt timestamp in the token store.
 */
export function updateLastSyncTime(isoDate = new Date().toISOString()): void {
  const current = getStravaAuth();
  if (current) {
    current.lastSyncAt = isoDate;
    saveStravaAuth(current);
  }
}

/**
 * Checks if the stored access token is expired or expires within 60 seconds.
 */
export function isTokenExpired(auth: StravaAuthData): boolean {
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return auth.expiresAt <= nowInSeconds + 60;
}

/**
 * Returns safe public status without any tokens or secrets.
 */
export function getPublicStravaStatus(): PublicStravaStatus {
  const auth = getStravaAuth();
  if (!auth) {
    return { connected: false };
  }
  return {
    connected: true,
    athleteName: auth.athleteName,
    athleteId: String(auth.athleteId),
    lastSyncAt: auth.lastSyncAt,
  };
}
