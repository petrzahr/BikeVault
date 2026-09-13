import { NextRequest } from "next/server";
import { normalizeUserId, DEFAULT_USER_ID } from "./stravaTokenStore";

// Cache verified Google user tokens (5-minute TTL) to minimize latency
const tokenVerificationCache = new Map<string, { email: string; expiresAt: number }>();

export function clearTokenVerificationCacheForTest(): void {
  tokenVerificationCache.clear();
}

export class UnauthorizedError extends Error {
  constructor(message = "Neautorizovaný požadavek: Chybí platné ověření účtu Google.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Validates a Google access token with Google server-side APIs.
 *
 * Strategies:
 * 1. Google Drive API about.get:
 *    Matches BikeVault's core OAuth scope (https://www.googleapis.com/auth/drive.file).
 *    Cryptographically validates the token on Google servers and returns user.emailAddress.
 * 2. Google OAuth2 userinfo:
 *    Matches standard OpenID / email scopes.
 * 3. Google OAuth2 tokeninfo:
 *    General token validation inspector.
 */
async function verifyGoogleTokenWithGoogle(googleToken: string): Promise<string | null> {
  // Strategy 1: Google Drive about.get (primary for BikeVault's drive.file scope)
  try {
    const driveRes = await fetch("https://www.googleapis.com/drive/v3/about?fields=user", {
      headers: { Authorization: `Bearer ${googleToken}` },
    });
    if (driveRes.ok) {
      const driveData = (await driveRes.json()) as { user?: { emailAddress?: string } };
      if (driveData?.user?.emailAddress) {
        return normalizeUserId(driveData.user.emailAddress);
      }
    }
  } catch (err) {
    console.warn("[requestUser] Google Drive about.get validation error:", err);
  }

  // Strategy 2: Google OAuth2 userinfo (for tokens with email/profile/openid scopes)
  try {
    const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${googleToken}` },
    });
    if (userinfoRes.ok) {
      const userInfo = (await userinfoRes.json()) as { email?: string };
      if (userInfo?.email) {
        return normalizeUserId(userInfo.email);
      }
    }
  } catch (err) {
    console.warn("[requestUser] Google userinfo validation error:", err);
  }

  // Strategy 3: Google OAuth2 tokeninfo (token inspector)
  try {
    const tokeninfoRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(googleToken)}`
    );
    if (tokeninfoRes.ok) {
      const tokenInfo = (await tokeninfoRes.json()) as { email?: string };
      if (tokenInfo?.email) {
        return normalizeUserId(tokenInfo.email);
      }
    }
  } catch (err) {
    console.warn("[requestUser] Google tokeninfo validation error:", err);
  }

  return null;
}

/**
 * Validates the caller's Google access token server-side with Google Identity / Drive.
 * Scopes server operations strictly to the verified Google email address.
 * Never blindly trusts client-provided identity headers in production.
 */
export async function resolveAuthenticatedUserId(request: NextRequest): Promise<string> {
  const authHeader = request.headers.get("authorization");

  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const googleToken = authHeader.substring(7).trim();

    if (googleToken) {
      // 1. Check in-memory cache
      const cached = tokenVerificationCache.get(googleToken);
      if (cached && cached.expiresAt > Date.now()) {
        return normalizeUserId(cached.email);
      }

      // 2. Verify with Google APIs
      const verifiedEmail = await verifyGoogleTokenWithGoogle(googleToken);
      if (verifiedEmail) {
        tokenVerificationCache.set(googleToken, {
          email: verifiedEmail,
          expiresAt: Date.now() + 5 * 60 * 1000,
        });
        return verifiedEmail;
      }
    }
  }

  // Production check: In production on Vercel, unauthenticated requests must be rejected.
  const isProduction =
    process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

  if (isProduction) {
    throw new UnauthorizedError();
  }

  // Development & Test fallback:
  // Allow header/query param identification only for non-production environments
  const headerUser = request.headers.get("x-bikevault-user-id");
  if (headerUser && headerUser.trim()) {
    return normalizeUserId(headerUser);
  }

  const url = new URL(request.url);
  const queryUser = url.searchParams.get("userId");
  if (queryUser && queryUser.trim()) {
    return normalizeUserId(queryUser);
  }

  return DEFAULT_USER_ID;
}

/**
 * Synchronous resolver for legacy or fallback usage.
 */
export function resolveRequestUserId(request: NextRequest): string {
  const headerUser = request.headers.get("x-bikevault-user-id");
  if (headerUser && headerUser.trim()) {
    return normalizeUserId(headerUser);
  }

  const url = new URL(request.url);
  const queryUser = url.searchParams.get("userId");
  if (queryUser && queryUser.trim()) {
    return normalizeUserId(queryUser);
  }

  return DEFAULT_USER_ID;
}
