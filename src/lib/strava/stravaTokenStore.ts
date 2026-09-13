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

export interface OAuthPendingState {
  state: string;
  bikeVaultUserId: string;
  createdAt: number;
  expiresAt: number;
}

export const DEFAULT_USER_ID = "default_user";

export function normalizeUserId(userId?: string | null): string {
  if (!userId || typeof userId !== "string") return DEFAULT_USER_ID;
  const clean = userId.trim().toLowerCase();
  return clean || DEFAULT_USER_ID;
}

/**
 * Pluggable server-side storage adapter contract for Strava tokens and OAuth state.
 */
export interface StravaTokenStorageAdapter {
  name: string;
  getUserAuth(bikeVaultUserId: string): Promise<StravaIntegrationRecord | null>;
  saveUserAuth(record: StravaIntegrationRecord): Promise<void>;
  deleteUserAuth(bikeVaultUserId: string): Promise<void>;
  getAllUserIds(): Promise<string[]>;
  saveOAuthState(state: string, bikeVaultUserId: string, ttlSeconds: number): Promise<void>;
  consumeOAuthState(state: string): Promise<{ valid: boolean; bikeVaultUserId?: string; error?: string }>;
}

// --- VERCEL KV / UPSTASH REDIS REST ADAPTER ---

export class KvTokenStorageAdapter implements StravaTokenStorageAdapter {
  public readonly name = "vercel_kv";
  private baseUrl: string;
  private token: string;
  private keyPrefix = "bikevault:strava";

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.token = token.trim();
  }

  private async executeCommand(command: (string | number)[]): Promise<unknown> {
    const res = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`[KvTokenStorageAdapter] REST command failed (${res.status}): ${text}`);
    }

    const data = await res.json();
    if (data && typeof data === "object" && "error" in data && data.error) {
      throw new Error(`[KvTokenStorageAdapter] Redis error: ${data.error}`);
    }
    return data.result;
  }

  async getUserAuth(bikeVaultUserId: string): Promise<StravaIntegrationRecord | null> {
    const key = `${this.keyPrefix}:integration:${bikeVaultUserId}`;
    const raw = await this.executeCommand(["GET", key]);
    if (!raw) return null;
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (parsed && parsed.accessToken && parsed.refreshToken) {
        return parsed as StravaIntegrationRecord;
      }
    } catch {
      return null;
    }
    return null;
  }

  async saveUserAuth(record: StravaIntegrationRecord): Promise<void> {
    const userId = normalizeUserId(record.bikeVaultUserId);
    const key = `${this.keyPrefix}:integration:${userId}`;
    const payload = JSON.stringify({
      ...record,
      bikeVaultUserId: userId,
    });
    await this.executeCommand(["SET", key, payload]);
    try {
      await this.executeCommand(["SADD", `${this.keyPrefix}:all_users`, userId]);
    } catch {
      // Non-critical if set tracking fails
    }
  }

  async deleteUserAuth(bikeVaultUserId: string): Promise<void> {
    const key = `${this.keyPrefix}:integration:${bikeVaultUserId}`;
    await this.executeCommand(["DEL", key]);
    try {
      await this.executeCommand(["SREM", `${this.keyPrefix}:all_users`, bikeVaultUserId]);
    } catch {
      // Non-critical if set removal fails
    }
  }

  async getAllUserIds(): Promise<string[]> {
    try {
      const members = (await this.executeCommand(["SMEMBERS", `${this.keyPrefix}:all_users`])) as string[] | null;
      if (Array.isArray(members) && members.length > 0) {
        return members.filter(Boolean);
      }
    } catch {
      // Fallback to KEYS if SMEMBERS not available
    }

    try {
      const pattern = `${this.keyPrefix}:integration:*`;
      const keys = (await this.executeCommand(["KEYS", pattern])) as string[] | null;
      if (!Array.isArray(keys)) return [];
      const prefixLen = `${this.keyPrefix}:integration:`.length;
      return keys.map((k) => k.substring(prefixLen)).filter(Boolean);
    } catch {
      return [];
    }
  }

  async saveOAuthState(state: string, bikeVaultUserId: string, ttlSeconds: number): Promise<void> {
    const key = `${this.keyPrefix}:state:${state}`;
    const payload = JSON.stringify({
      state,
      bikeVaultUserId,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    // Store with TTL in seconds
    await this.executeCommand(["SET", key, payload, "EX", ttlSeconds]);
  }

  async consumeOAuthState(state: string): Promise<{ valid: boolean; bikeVaultUserId?: string; error?: string }> {
    const key = `${this.keyPrefix}:state:${state}`;
    const raw = await this.executeCommand(["GET", key]);
    if (!raw) {
      return {
        valid: false,
        error: "Neplatný, expirovaný nebo již použitý bezpečnostní OAuth stav (state). Zkuste autorizaci znovu.",
      };
    }

    // Atomic / immediate deletion (strictly one-time use)
    await this.executeCommand(["DEL", key]);

    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (parsed && parsed.bikeVaultUserId) {
        if (parsed.expiresAt && parsed.expiresAt <= Date.now()) {
          return { valid: false, error: "Platnost autorizační relace vypršela. Spusťte prosím propojení znovu." };
        }
        return { valid: true, bikeVaultUserId: parsed.bikeVaultUserId };
      }
    } catch {
      // JSON parse error
    }

    return { valid: false, error: "Poškozená data autorizační relace." };
  }
}

// --- LOCAL FILE ADAPTER (DEVELOPMENT ONLY) ---

export class FileTokenStorageAdapter implements StravaTokenStorageAdapter {
  public readonly name = "local_file";
  private dataDir: string;
  private multiAuthFile: string;
  private oauthStatesFile: string;

  constructor() {
    this.dataDir = path.resolve(process.cwd(), ".data");
    this.multiAuthFile = path.join(this.dataDir, "strava_integrations.json");
    this.oauthStatesFile = path.join(this.dataDir, "strava_oauth_states.json");
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private readAllIntegrations(): Record<string, StravaIntegrationRecord> {
    this.ensureDataDir();
    try {
      if (fs.existsSync(this.multiAuthFile)) {
        const raw = fs.readFileSync(this.multiAuthFile, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          return parsed as Record<string, StravaIntegrationRecord>;
        }
      }
    } catch (err) {
      console.error("[FileTokenStorageAdapter] Error reading integrations store:", err);
    }
    return {};
  }

  private writeAllIntegrations(store: Record<string, StravaIntegrationRecord>): void {
    this.ensureDataDir();
    fs.writeFileSync(this.multiAuthFile, JSON.stringify(store, null, 2), "utf-8");
  }

  private readOAuthStates(): OAuthPendingState[] {
    this.ensureDataDir();
    try {
      if (fs.existsSync(this.oauthStatesFile)) {
        const raw = fs.readFileSync(this.oauthStatesFile, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const now = Date.now();
          return parsed.filter((s) => s.expiresAt > now);
        }
      }
    } catch (err) {
      console.error("[FileTokenStorageAdapter] Error reading oauth states:", err);
    }
    return [];
  }

  private writeOAuthStates(states: OAuthPendingState[]): void {
    this.ensureDataDir();
    fs.writeFileSync(this.oauthStatesFile, JSON.stringify(states, null, 2), "utf-8");
  }

  async getUserAuth(bikeVaultUserId: string): Promise<StravaIntegrationRecord | null> {
    const all = this.readAllIntegrations();
    const record = all[bikeVaultUserId];
    if (!record || !record.accessToken || !record.refreshToken) return null;
    return record;
  }

  async saveUserAuth(record: StravaIntegrationRecord): Promise<void> {
    const userId = normalizeUserId(record.bikeVaultUserId);
    const all = this.readAllIntegrations();
    all[userId] = {
      ...record,
      bikeVaultUserId: userId,
    };
    this.writeAllIntegrations(all);
  }

  async deleteUserAuth(bikeVaultUserId: string): Promise<void> {
    const all = this.readAllIntegrations();
    if (all[bikeVaultUserId]) {
      delete all[bikeVaultUserId];
      this.writeAllIntegrations(all);
    }
  }

  async getAllUserIds(): Promise<string[]> {
    const all = this.readAllIntegrations();
    return Object.keys(all).filter((id) => Boolean(all[id]?.accessToken));
  }

  async saveOAuthState(state: string, bikeVaultUserId: string, ttlSeconds: number): Promise<void> {
    const now = Date.now();
    const entry: OAuthPendingState = {
      state,
      bikeVaultUserId,
      createdAt: now,
      expiresAt: now + ttlSeconds * 1000,
    };
    const states = this.readOAuthStates();
    states.push(entry);
    this.writeOAuthStates(states);
  }

  async consumeOAuthState(state: string): Promise<{ valid: boolean; bikeVaultUserId?: string; error?: string }> {
    const states = this.readOAuthStates();
    const index = states.findIndex((s) => s.state === state);
    if (index === -1) {
      return {
        valid: false,
        error: "Neplatný nebo již použitý bezpečnostní OAuth stav (state). Zkuste autorizaci znovu.",
      };
    }
    const matched = states[index];
    states.splice(index, 1);
    this.writeOAuthStates(states);

    if (matched.expiresAt <= Date.now()) {
      return { valid: false, error: "Platnost autorizační relace vypršela. Spusťte prosím propojení se Stravou znovu." };
    }
    return { valid: true, bikeVaultUserId: matched.bikeVaultUserId };
  }
}

// --- MEMORY ADAPTER (TESTS) ---

export class MemoryTokenStorageAdapter implements StravaTokenStorageAdapter {
  public readonly name = "memory";
  private store = new Map<string, StravaIntegrationRecord>();
  private states = new Map<string, OAuthPendingState>();

  async getUserAuth(bikeVaultUserId: string): Promise<StravaIntegrationRecord | null> {
    return this.store.get(bikeVaultUserId) || null;
  }

  async saveUserAuth(record: StravaIntegrationRecord): Promise<void> {
    const userId = normalizeUserId(record.bikeVaultUserId);
    this.store.set(userId, { ...record, bikeVaultUserId: userId });
  }

  async deleteUserAuth(bikeVaultUserId: string): Promise<void> {
    this.store.delete(bikeVaultUserId);
  }

  async getAllUserIds(): Promise<string[]> {
    return Array.from(this.store.keys());
  }

  async saveOAuthState(state: string, bikeVaultUserId: string, ttlSeconds: number): Promise<void> {
    const now = Date.now();
    this.states.set(state, {
      state,
      bikeVaultUserId,
      createdAt: now,
      expiresAt: now + ttlSeconds * 1000,
    });
  }

  async consumeOAuthState(state: string): Promise<{ valid: boolean; bikeVaultUserId?: string; error?: string }> {
    const entry = this.states.get(state);
    if (!entry) {
      return { valid: false, error: "Neplatný nebo již použitý bezpečnostní OAuth stav (state)." };
    }
    this.states.delete(state);
    if (entry.expiresAt <= Date.now()) {
      return { valid: false, error: "Platnost autorizační relace vypršela." };
    }
    return { valid: true, bikeVaultUserId: entry.bikeVaultUserId };
  }

  clear(): void {
    this.store.clear();
    this.states.clear();
  }
}

// --- ADAPTER FACTORY & RESOLUTION ---

let customTestAdapter: StravaTokenStorageAdapter | null = null;

export function setCustomStorageAdapterForTest(adapter: StravaTokenStorageAdapter | null): void {
  customTestAdapter = adapter;
}

export function getStorageAdapter(): StravaTokenStorageAdapter {
  if (customTestAdapter) {
    return customTestAdapter;
  }

  // 1. Check for Vercel KV or Upstash Redis REST credentials
  const rawUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const rawToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  const kvUrl = rawUrl ? rawUrl.trim().replace(/^["']|["']$/g, "") : undefined;
  const kvToken = rawToken ? rawToken.trim().replace(/^["']|["']$/g, "") : undefined;

  if (kvUrl && kvToken) {
    return new KvTokenStorageAdapter(kvUrl, kvToken);
  }

  // 2. Production Safety Check: Vercel environment must NEVER silently fall back to filesystem
  const isProduction =
    process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

  if (isProduction) {
    throw new Error(
      "Chyba konfigurace serverového úložiště: V produkčním prostředí Vercel není nakonfigurováno perzistentní úložiště pro Strava integraci. " +
      "Pro bezpečné uložení přihlašovacích údajů aktivujte Vercel KV v dashboardu projektu (Storage -> KV) " +
      "nebo nastavte proměnné prostředí KV_REST_API_URL a KV_REST_API_TOKEN (případně UPSTASH_REDIS_REST_URL a UPSTASH_REDIS_REST_TOKEN). " +
      "Ukládání do dočasného souborového systému na Vercelu není povoleno."
    );
  }

  // 3. Local Development Fallback
  return new FileTokenStorageAdapter();
}

// --- PUBLIC STORAGE API ---

/**
 * Gets Strava integration data for a specific BikeVault user.
 */
export async function getUserStravaAuth(bikeVaultUserId?: string | null): Promise<StravaIntegrationRecord | null> {
  const userId = normalizeUserId(bikeVaultUserId);
  const adapter = getStorageAdapter();
  return adapter.getUserAuth(userId);
}

/**
 * Saves Strava integration data for a specific BikeVault user.
 */
export async function saveUserStravaAuth(record: StravaIntegrationRecord): Promise<void> {
  const userId = normalizeUserId(record.bikeVaultUserId);
  const adapter = getStorageAdapter();
  await adapter.saveUserAuth({
    ...record,
    bikeVaultUserId: userId,
  });
}

/**
 * Removes Strava integration data for a specific BikeVault user.
 */
export async function clearUserStravaAuth(bikeVaultUserId?: string | null): Promise<void> {
  const userId = normalizeUserId(bikeVaultUserId);
  const adapter = getStorageAdapter();
  await adapter.deleteUserAuth(userId);
}

/**
 * Updates lastSyncAt timestamp for a specific user's integration.
 */
export async function updateUserLastSyncTime(
  bikeVaultUserId?: string | null,
  isoDate = new Date().toISOString()
): Promise<void> {
  const userId = normalizeUserId(bikeVaultUserId);
  const current = await getUserStravaAuth(userId);
  if (current) {
    current.lastSyncAt = isoDate;
    await saveUserStravaAuth(current);
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
export async function getPublicUserStravaStatus(bikeVaultUserId?: string | null): Promise<PublicStravaStatus> {
  const userId = normalizeUserId(bikeVaultUserId);
  try {
    const auth = await getUserStravaAuth(userId);
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
  } catch {
    return { connected: false, bikeVaultUserId: userId };
  }
}

/**
 * Lists all BikeVault user IDs that have an active Strava connection.
 */
export async function getAllConnectedUserIds(): Promise<string[]> {
  const adapter = getStorageAdapter();
  return adapter.getAllUserIds();
}

/**
 * Creates a cryptographically secure random state token strictly bound to bikeVaultUserId.
 * Valid for 10 minutes (600 seconds).
 */
export async function createOAuthState(bikeVaultUserId?: string | null): Promise<string> {
  const userId = normalizeUserId(bikeVaultUserId);
  const state = crypto.randomBytes(24).toString("hex");
  const adapter = getStorageAdapter();
  await adapter.saveOAuthState(state, userId, 600);
  return state;
}

/**
 * Consumes and validates a one-time OAuth state token.
 * Returns the bound bikeVaultUserId if valid, or an error.
 */
export async function consumeOAuthState(state?: string | null): Promise<{
  valid: boolean;
  bikeVaultUserId?: string;
  error?: string;
}> {
  if (!state || typeof state !== "string" || !state.trim()) {
    return { valid: false, error: "Chybí bezpečnostní OAuth parametr 'state'." };
  }
  const cleanState = state.trim();
  const adapter = getStorageAdapter();
  return adapter.consumeOAuthState(cleanState);
}

// --- BACKWARD COMPATIBILITY SINGLE-USER ALIASES ---

export async function getStravaAuth(): Promise<StravaIntegrationRecord | null> {
  return getUserStravaAuth(DEFAULT_USER_ID);
}

export async function saveStravaAuth(
  auth: Partial<StravaIntegrationRecord> & { accessToken: string; refreshToken: string; expiresAt: number }
): Promise<void> {
  await saveUserStravaAuth({
    bikeVaultUserId: auth.bikeVaultUserId || DEFAULT_USER_ID,
    stravaAthleteId:
      auth.stravaAthleteId ||
      ((auth as Record<string, unknown>).athleteId as number | string) ||
      "unknown",
    athleteName: auth.athleteName,
    accessToken: auth.accessToken,
    refreshToken: auth.refreshToken,
    expiresAt: auth.expiresAt,
    connectedAt: auth.connectedAt || new Date().toISOString(),
    lastSyncAt: auth.lastSyncAt,
  });
}

export async function clearStravaAuth(): Promise<void> {
  await clearUserStravaAuth(DEFAULT_USER_ID);
}

export async function updateLastSyncTime(isoDate = new Date().toISOString()): Promise<void> {
  await updateUserLastSyncTime(DEFAULT_USER_ID, isoDate);
}

export async function getPublicStravaStatus(): Promise<PublicStravaStatus> {
  return getPublicUserStravaStatus(DEFAULT_USER_ID);
}
