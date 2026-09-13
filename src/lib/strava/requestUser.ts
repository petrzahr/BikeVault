import { NextRequest } from "next/server";
import { normalizeUserId, DEFAULT_USER_ID } from "./stravaTokenStore";

/**
 * Resolves the authenticated BikeVault user ID from incoming NextRequest.
 * Checks:
 * 1. Header 'x-bikevault-user-id'
 * 2. Query param '?userId='
 * 3. Fallback to DEFAULT_USER_ID
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
