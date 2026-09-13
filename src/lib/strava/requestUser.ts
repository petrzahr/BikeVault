import { NextRequest } from "next/server";
import { normalizeUserId, DEFAULT_USER_ID } from "./stravaTokenStore";

// Cache verified Google user tokens (5-minute TTL) to minimize latency
const tokenVerificationCache = new Map<string, { email: string; expiresAt: number }>();

export class UnauthorizedError extends Error {
  constructor(message = "Neautorizovaný požadavek: Chybí platné ověření účtu Google.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Validates the caller's Google access token server-side with Google Identity / Drive.
 * Scopes server operations to the verified Google email address.
 * Never blindly trusts client-provided identity headers in production.
 */
export async function resolveAuthenticatedUserId(request: NextRequest): Promise<string> {
  const authHeader = request.headers.get("authorization");

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const googleToken = authHeader.substring(7).trim();

    if (googleToken) {
      // 1. Check in-memory cache
      const cached = tokenVerificationCache.get(googleToken);
      if (cached && cached.expiresAt > Date.now()) {
        return normalizeUserId(cached.email);
      }

      // 2. Verify with Google OAuth2 userinfo
      try {
        const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${googleToken}` },
        });

        if (res.ok) {
          const userInfo = (await res.json()) as { email?: string; sub?: string };
          if (userInfo.email) {
            const verifiedEmail = normalizeUserId(userInfo.email);
            // Cache verified user identity for 5 minutes
            tokenVerificationCache.set(googleToken, {
              email: verifiedEmail,
              expiresAt: Date.now() + 5 * 60 * 1000,
            });
            return verifiedEmail;
          }
        }
      } catch (err) {
        console.warn("[requestUser] Google token validation network error:", err);
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
