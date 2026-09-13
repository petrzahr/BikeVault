import {
  getStravaAuth,
  saveStravaAuth,
  clearStravaAuth,
  isTokenExpired,
  StravaAuthData,
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
 * Builds the Strava OAuth 2.0 authorization URL.
 */
export function buildAuthorizeUrl(): string {
  const { clientId, redirectUri } = getStravaConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    approval_prompt: "auto",
    scope: REQUIRED_SCOPES,
  });
  return `${STRAVA_OAUTH_AUTHORIZE}?${params.toString()}`;
}

/**
 * Exchanges authorization code for access and refresh tokens.
 */
export async function exchangeCodeForTokens(code: string): Promise<StravaAuthData> {
  const { clientId, clientSecret } = getStravaConfig();
  if (!clientId || !clientSecret) {
    throw new Error("Strava API není na serveru nakonfigurována (chybí STRAVA_CLIENT_ID nebo STRAVA_CLIENT_SECRET).");
  }

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
  const athleteName = [athlete.firstname, athlete.lastname].filter(Boolean).join(" ") || athlete.username || "Strava sportovec";

  const authData: StravaAuthData = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
    athleteId: athlete.id || data.athlete_id || "unknown",
    athleteName,
    connectedAt: new Date().toISOString(),
  };

  saveStravaAuth(authData);
  return authData;
}

/**
 * Refreshes an expired access token using the stored refresh token.
 */
export async function refreshAccessToken(refreshToken: string): Promise<StravaAuthData> {
  const { clientId, clientSecret } = getStravaConfig();
  if (!clientId || !clientSecret) {
    throw new Error("Strava API není na serveru nakonfigurována.");
  }

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
      clearStravaAuth();
      throw new Error("Platnost Strava tokenu vypršela nebo byl přístup odvolán. Připojte prosím Stravu znovu.");
    }
    const errorBody = await response.text();
    throw new Error(`Chyba při obnově Strava přístupu (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const current = getStravaAuth();

  const updatedAuth: StravaAuthData = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: data.expires_at,
    athleteId: current?.athleteId || "unknown",
    athleteName: current?.athleteName,
    connectedAt: current?.connectedAt || new Date().toISOString(),
    lastSyncAt: current?.lastSyncAt,
  };

  saveStravaAuth(updatedAuth);
  return updatedAuth;
}

/**
 * Gets a valid access token, refreshing if necessary.
 */
export async function getValidAccessToken(): Promise<string> {
  const auth = getStravaAuth();
  if (!auth) {
    throw new Error("Strava není připojena. Nejprve připojte svůj účet Strava.");
  }

  if (isTokenExpired(auth)) {
    const refreshed = await refreshAccessToken(auth.refreshToken);
    return refreshed.accessToken;
  }

  return auth.accessToken;
}

/**
 * Loads all athlete bikes from Strava API and enriches with /gear/{id} details.
 */
export async function getAthleteBikesFromStrava(): Promise<StravaBikeSummary[]> {
  const accessToken = await getValidAccessToken();

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
        // Fallback to basic gear info from athlete
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
 * Fetches current mileage in km for a specific Strava gear ID.
 */
export async function getGearMileageFromStrava(gearId: string): Promise<{ distanceMeters: number; distanceKm: number }> {
  const accessToken = await getValidAccessToken();

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
 * Disconnects / deauthorizes Strava token if possible, then clears local token store.
 */
export async function disconnectStrava(): Promise<void> {
  const auth = getStravaAuth();
  if (auth && auth.accessToken) {
    try {
      await fetch(STRAVA_OAUTH_DEAUTHORIZE, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ access_token: auth.accessToken }),
      });
    } catch (err) {
      console.warn("[Strava] Failed to call deauthorize API on Strava:", err);
    }
  }
  clearStravaAuth();
}
