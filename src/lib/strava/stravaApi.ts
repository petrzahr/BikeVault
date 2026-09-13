import {
  getUserStravaAuth,
  saveUserStravaAuth,
  clearUserStravaAuth,
  isTokenExpired,
  createOAuthState,
  normalizeUserId,
  DEFAULT_USER_ID,
  StravaIntegrationRecord,
} from "./stravaTokenStore";
import { metersToKm } from "../domain/stravaSync";

export const STRAVA_API_BASE = "https://www.strava.com/api/v3";
export const STRAVA_OAUTH_AUTHORIZE = "https://www.strava.com/oauth/authorize";
export const STRAVA_OAUTH_TOKEN = "https://www.strava.com/api/v3/oauth/token";
export const STRAVA_OAUTH_DEAUTHORIZE = "https://www.strava.com/oauth/deauthorize";
export const REQUIRED_SCOPES = "read,profile:read_all";

export interface StravaBikeSummary {
  id: string; // Strava gear ID, e.g. "b123456"
  name: string;
  distanceMeters: number;
  distanceKm: number;
  brandName?: string;
  modelName?: string;
  frameType?: number;
  description?: string;
  isPrimary?: boolean;
}

export function getStravaConfig() {
  const clientId = process.env.STRAVA_CLIENT_ID || "";
  const clientSecret = process.env.STRAVA_CLIENT_SECRET || "";
  const redirectUri =
    process.env.STRAVA_REDIRECT_URI || "http://localhost:3000/api/strava/callback";

  return {
    clientId,
    clientSecret,
    redirectUri,
    isConfigured: Boolean(clientId && clientSecret),
  };
}

/**
 * Builds the Strava OAuth 2.0 authorization URL with a secure state token bound to bikeVaultUserId.
 */
export function buildAuthorizeUrl(bikeVaultUserId?: string | null): string {
  const { clientId, redirectUri } = getStravaConfig();
  const userId = normalizeUserId(bikeVaultUserId);
  const state = createOAuthState(userId);

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    approval_prompt: "auto",
    scope: REQUIRED_SCOPES,
    state,
  });
  return `${STRAVA_OAUTH_AUTHORIZE}?${params.toString()}`;
}

/**
 * Exchanges authorization code for access and refresh tokens, saving them for the specified BikeVault user.
 * Enforces athlete integrity check: prevents silent replacement if a different athlete is returned.
 */
export async function exchangeCodeForTokens(
  code: string,
  bikeVaultUserId?: string | null
): Promise<StravaIntegrationRecord> {
  const { clientId, clientSecret } = getStravaConfig();
  if (!clientId || !clientSecret) {
    throw new Error("Strava API není na serveru nakonfigurována (chybí STRAVA_CLIENT_ID nebo STRAVA_CLIENT_SECRET).");
  }

  const userId = normalizeUserId(bikeVaultUserId);

  const response = await fetch(STRAVA_OAUTH_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Chyba při výměně autorizačního kódu Strava (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const athlete = data.athlete || {};
  const athleteId = athlete.id || data.athlete_id || "unknown";
  const athleteName = [athlete.firstname, athlete.lastname].filter(Boolean).join(" ") || athlete.username || "Strava sportovec";

  // Athlete Integrity Check:
  // If this user already has an active integration with a DIFFERENT Strava athlete ID, do NOT silently replace!
  const existing = getUserStravaAuth(userId);
  if (existing && existing.stravaAthleteId && String(existing.stravaAthleteId) !== String(athleteId)) {
    throw new Error(
      `Účet uživatele '${userId}' je již propojen se Strava sportovcem '${existing.athleteName || existing.stravaAthleteId}' (ID: ${existing.stravaAthleteId}). Před propojením jiného sportovce (ID: ${athleteId}) nejprve odpojte stávající integraci.`
    );
  }

  const authRecord: StravaIntegrationRecord = {
    bikeVaultUserId: userId,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
    stravaAthleteId: athleteId,
    athleteName,
    connectedAt: new Date().toISOString(),
  };

  saveUserStravaAuth(authRecord);
  return authRecord;
}

/**
 * Refreshes an expired access token using the stored refresh token for a specific BikeVault user.
 */
export async function refreshAccessToken(
  refreshToken: string,
  bikeVaultUserId?: string | null
): Promise<StravaIntegrationRecord> {
  const { clientId, clientSecret } = getStravaConfig();
  if (!clientId || !clientSecret) {
    throw new Error("Strava API není na serveru nakonfigurována.");
  }

  const userId = normalizeUserId(bikeVaultUserId);

  const response = await fetch(STRAVA_OAUTH_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    if (response.status === 400 || response.status === 401) {
      clearUserStravaAuth(userId);
      throw new Error("Platnost Strava tokenu vypršela nebo byl přístup odvolán. Připojte prosím Stravu znovu.");
    }
    const errorBody = await response.text();
    throw new Error(`Chyba při obnově Strava přístupu (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const current = getUserStravaAuth(userId);

  const updatedAuth: StravaIntegrationRecord = {
    bikeVaultUserId: userId,
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: data.expires_at,
    stravaAthleteId: current?.stravaAthleteId || "unknown",
    athleteName: current?.athleteName,
    connectedAt: current?.connectedAt || new Date().toISOString(),
    lastSyncAt: current?.lastSyncAt,
  };

  saveUserStravaAuth(updatedAuth);
  return updatedAuth;
}

/**
 * Gets a valid access token for a specific BikeVault user, auto-refreshing if necessary.
 */
export async function getValidAccessToken(bikeVaultUserId?: string | null): Promise<string> {
  const userId = normalizeUserId(bikeVaultUserId);
  const auth = getUserStravaAuth(userId);
  if (!auth) {
    throw new Error(`Strava není připojena pro uživatele '${userId}'. Nejprve připojte svůj účet Strava.`);
  }

  if (isTokenExpired(auth)) {
    const refreshed = await refreshAccessToken(auth.refreshToken, userId);
    return refreshed.accessToken;
  }

  return auth.accessToken;
}

/**
 * Loads all athlete bikes from Strava API for a specific BikeVault user.
 */
export async function getAthleteBikesFromStrava(
  bikeVaultUserId?: string | null
): Promise<StravaBikeSummary[]> {
  const userId = normalizeUserId(bikeVaultUserId);
  const accessToken = await getValidAccessToken(userId);

  // 1. Fetch athlete profile to get bike gear list
  const athleteRes = await fetch(`${STRAVA_API_BASE}/athlete`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!athleteRes.ok) {
    if (athleteRes.status === 429) {
      throw new Error("Byl překročen limit požadavků Strava API. Zkuste to prosím za chvíli.");
    }
    if (athleteRes.status === 401) {
      throw new Error("Platnost Strava přístupu vypršela. Připojte prosím Stravu znovu.");
    }
    throw new Error(`Chyba při načítání profilu sportovce ze Stravy (${athleteRes.status}).`);
  }

  const athlete = await athleteRes.json();
  const basicBikes = Array.isArray(athlete.bikes) ? athlete.bikes : [];

  if (basicBikes.length === 0) {
    return [];
  }

  // 2. Fetch detailed gear data for each bike
  const enrichedBikes: StravaBikeSummary[] = [];

  for (const b of basicBikes) {
    try {
      const gearRes = await fetch(`${STRAVA_API_BASE}/gear/${b.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (gearRes.ok) {
        const gear = await gearRes.json();
        const distanceMeters = Number(gear.distance || 0);
        enrichedBikes.push({
          id: gear.id,
          name: gear.name || b.name || "Kolo ze Stravy",
          distanceMeters,
          distanceKm: metersToKm(distanceMeters),
          brandName: gear.brand_name || undefined,
          modelName: gear.model_name || undefined,
          frameType: gear.frame_type || undefined,
          description: gear.description || undefined,
          isPrimary: Boolean(gear.primary),
        });
      } else {
        const distanceMeters = Number(b.distance || 0);
        enrichedBikes.push({
          id: b.id,
          name: b.name || "Kolo ze Stravy",
          distanceMeters,
          distanceKm: metersToKm(distanceMeters),
          isPrimary: Boolean(b.primary),
        });
      }
    } catch {
      const distanceMeters = Number(b.distance || 0);
      enrichedBikes.push({
        id: b.id,
        name: b.name || "Kolo ze Stravy",
        distanceMeters,
        distanceKm: metersToKm(distanceMeters),
        isPrimary: Boolean(b.primary),
      });
    }
  }

  return enrichedBikes;
}

/**
 * Fetches current mileage in km for a specific Strava gear ID for the given BikeVault user.
 */
export async function getGearMileageFromStrava(
  gearId: string,
  bikeVaultUserId?: string | null
): Promise<{ distanceMeters: number; distanceKm: number }> {
  const userId = normalizeUserId(bikeVaultUserId);
  const accessToken = await getValidAccessToken(userId);

  const res = await fetch(`${STRAVA_API_BASE}/gear/${gearId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error("Byl překročen limit požadavků Strava API. Zkuste to prosím za chvíli.");
    }
    if (res.status === 404) {
      throw new Error(`Kolo s ID ${gearId} nebylo na Stravě nalezeno.`);
    }
    throw new Error(`Chyba při zjišťování nájezdu ze Stravy (${res.status}).`);
  }

  const data = await res.json();
  const distanceMeters = Number(data.distance || 0);
  return {
    distanceMeters,
    distanceKm: metersToKm(distanceMeters),
  };
}

/**
 * Disconnects / deauthorizes Strava token for a specific BikeVault user and clears local store.
 */
export async function disconnectStrava(bikeVaultUserId?: string | null): Promise<void> {
  const userId = normalizeUserId(bikeVaultUserId);
  const auth = getUserStravaAuth(userId);
  if (auth && auth.accessToken) {
    try {
      await fetch(STRAVA_OAUTH_DEAUTHORIZE, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ access_token: auth.accessToken }),
      });
    } catch (err) {
      console.warn(`[Strava] Failed to call deauthorize API on Strava for user '${userId}':`, err);
    }
  }
  clearUserStravaAuth(userId);
}
