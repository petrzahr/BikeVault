/**
 * Google Identity Services (GIS) OAuth 2.0 Auth Service pro BikeVault.
 * Využívá Google Identity Services Token Client s rozsahem https://www.googleapis.com/auth/drive.file.
 */

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  error?: string;
  error_description?: string;
  error_uri?: string;
}

export interface GoogleTokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string; hint?: string }) => void;
}

export interface GoogleUser {
  displayName?: string;
  emailAddress?: string;
  photoLink?: string;
}

export interface StoredAuthData {
  accessToken: string;
  expiresAt: number; // Unix timestamp v ms
  user?: GoogleUser;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
            error_callback?: (err: unknown) => void;
            prompt?: string;
          }) => GoogleTokenClient;
          revoke: (token: string, done?: () => void) => void;
        };
      };
    };
  }
}

export const GOOGLE_DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file email";
const AUTH_STORAGE_KEY = "bikevault_google_auth_v1";

/**
 * Získá Client ID výhradně z proměnné prostředí process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
 */
export function getGoogleClientId(): string {
  const envId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (envId) {
    return envId.replace(/^["']|["']$/g, "").trim();
  }
  return "169480893579-apfcrv1uoe82gasbqgekvmb1874vmm5t.apps.googleusercontent.com";
}

/**
 * Uloží autentizaci do sessionStorage i localStorage
 */
export function saveStoredAuth(auth: StoredAuthData): void {
  if (typeof window === "undefined") return;
  try {
    const serialized = JSON.stringify(auth);
    sessionStorage.setItem(AUTH_STORAGE_KEY, serialized);
    localStorage.setItem(AUTH_STORAGE_KEY, serialized);
  } catch (err) {
    console.error("Chyba při ukládání Google autentizace:", err);
  }
}

/**
 * Načte uloženou Google autentizaci (ze sessionStorage nebo localStorage)
 */
export function getStoredAuth(): StoredAuthData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY) || localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuthData;
    if (!parsed.accessToken || typeof parsed.expiresAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Vymaže uloženou autentizaci ze všech úložišť
 */
export function clearStoredAuth(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (err) {
    console.error("Chyba při mazání Google autentizace:", err);
  }
}

/**
 * Zkontroluje, zda máme platný (neexpirovaný) access token (s rezervou 60s)
 */
export function isStoredTokenValid(): boolean {
  const auth = getStoredAuth();
  if (!auth) return false;
  return auth.expiresAt > Date.now() + 60000;
}

/**
 * Získá platný access token z úložiště
 */
export function getValidAccessToken(): string | null {
  if (!isStoredTokenValid()) return null;
  return getStoredAuth()?.accessToken || null;
}

/**
 * Čeká na načtení Google Identity Services (GIS) skriptu
 */
export function waitForGoogleClient(timeoutMs = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Běh mimo prohlížeč"));
      return;
    }

    if (window.google?.accounts?.oauth2?.initTokenClient) {
      resolve();
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      if (window.google?.accounts?.oauth2?.initTokenClient) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - startTime > timeoutMs) {
        clearInterval(interval);
        reject(new Error("Knihovna Google Identity Services nebyla včas načtena."));
      }
    }, 100);
  });
}

// Singleton pro Token Client
let cachedTokenClient: GoogleTokenClient | null = null;
let currentResolve: ((response: GoogleTokenResponse) => void) | null = null;
let currentReject: ((err: Error) => void) | null = null;

/**
 * Inicializuje nebo vrátí cached Google OAuth Token Client
 */
export async function getOrCreateTokenClient(): Promise<GoogleTokenClient> {
  if (cachedTokenClient) return cachedTokenClient;

  await waitForGoogleClient();

  if (!window.google?.accounts?.oauth2?.initTokenClient) {
    throw new Error("Google Identity Services oauth2 není k dispozici.");
  }

  const clientId = getGoogleClientId();

  cachedTokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: GOOGLE_DRIVE_FILE_SCOPE,
    callback: (response: GoogleTokenResponse) => {
      if (response.error) {
        console.error("Chyba při autorizaci Google účtu:", response.error, response.error_description);
        if (currentReject) {
          currentReject(new Error(response.error_description || response.error));
          currentReject = null;
          currentResolve = null;
        }
      } else if (response.access_token) {
        const expiresInSec = response.expires_in || 3600;
        const expiresAt = Date.now() + expiresInSec * 1000;
        const current = getStoredAuth();
        saveStoredAuth({
          accessToken: response.access_token,
          expiresAt,
          user: current?.user,
        });

        if (currentResolve) {
          currentResolve(response);
          currentResolve = null;
          currentReject = null;
        }
      }
    },
    error_callback: (err: unknown) => {
      console.error("Google OAuth error:", err);
      if (currentReject) {
        currentReject(new Error(String(err)));
        currentReject = null;
        currentResolve = null;
      }
    },
  });

  return cachedTokenClient;
}

/**
 * Vyvolá přihlášení uživatele (otevře Google OAuth dialog)
 */
export async function loginToGoogle(prompt: string = "select_account"): Promise<string> {
  const tokenClient = await getOrCreateTokenClient();

  return new Promise((resolve, reject) => {
    currentResolve = (response) => resolve(response.access_token);
    currentReject = (err) => reject(err);

    try {
      tokenClient.requestAccessToken({ prompt });
    } catch (err) {
      currentResolve = null;
      currentReject = null;
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

/**
 * Odhlásí uživatele a zruší token
 */
export async function logoutFromGoogle(): Promise<void> {
  const auth = getStoredAuth();
  if (auth?.accessToken && window.google?.accounts?.oauth2?.revoke) {
    try {
      await new Promise<void>((resolve) => {
        window.google!.accounts!.oauth2!.revoke(auth.accessToken, () => resolve());
        setTimeout(resolve, 1500);
      });
    } catch (e) {
      console.warn("Chyba při revokaci Google tokenu:", e);
    }
  }
  clearStoredAuth();
}

/**
 * Načte profil uživatele přes Google Drive API about.get
 */
export async function fetchGoogleUserProfile(token: string): Promise<GoogleUser | null> {
  try {
    const res = await fetch("https://www.googleapis.com/drive/v3/about?fields=user", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.user) {
      const user: GoogleUser = {
        displayName: data.user.displayName,
        emailAddress: data.user.emailAddress,
        photoLink: data.user.photoLink,
      };
      const current = getStoredAuth();
      if (current) {
        saveStoredAuth({ ...current, user });
      }
      return user;
    }
    return null;
  } catch (err) {
    console.warn("Nepodařilo se načíst profil uživatele:", err);
    return null;
  }
}
