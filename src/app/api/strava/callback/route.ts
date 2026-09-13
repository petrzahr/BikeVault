import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/strava/stravaApi";
import { consumeOAuthState } from "@/lib/strava/stravaTokenStore";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const baseUrl = url.origin;

  if (error || !code) {
    return NextResponse.redirect(
      `${baseUrl}/settings?tab=integrations&strava_error=${encodeURIComponent(error || "access_denied")}`
    );
  }

  // Validate and consume the one-time state token to resolve the initiating user
  const stateValidation = await consumeOAuthState(state);
  if (!stateValidation.valid || !stateValidation.bikeVaultUserId) {
    return NextResponse.redirect(
      `${baseUrl}/settings?tab=integrations&strava_error=${encodeURIComponent(
        stateValidation.error || "Neplatný bezpečnostní stav relace."
      )}`
    );
  }

  try {
    await exchangeCodeForTokens(code, stateValidation.bikeVaultUserId);
    return NextResponse.redirect(
      `${baseUrl}/settings?tab=integrations&strava_connected=true&userId=${encodeURIComponent(
        stateValidation.bikeVaultUserId
      )}`
    );
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Chyba při výměně Strava kódu.";
    console.error("[Strava Callback Error]:", errorMsg);
    return NextResponse.redirect(
      `${baseUrl}/settings?tab=integrations&strava_error=${encodeURIComponent(errorMsg)}`
    );
  }
}
