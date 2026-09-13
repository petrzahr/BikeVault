import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/strava/stravaApi";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const scope = url.searchParams.get("scope");

  const baseUrl = url.origin;

  if (error || !code) {
    return NextResponse.redirect(
      `${baseUrl}/settings?tab=integrations&strava_error=${encodeURIComponent(error || "access_denied")}`
    );
  }

  // Validate that user didn't uncheck profile:read_all
  if (scope && !scope.includes("profile:read_all") && !scope.includes("read_all")) {
    console.warn("[Strava Callback] Warning: granted scope does not contain profile:read_all:", scope);
  }

  try {
    await exchangeCodeForTokens(code);
    return NextResponse.redirect(
      `${baseUrl}/settings?tab=integrations&strava_connected=true`
    );
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Chyba při výměně Strava kódu.";
    console.error("[Strava Callback Error]:", errorMsg);
    return NextResponse.redirect(
      `${baseUrl}/settings?tab=integrations&strava_error=${encodeURIComponent(errorMsg)}`
    );
  }
}
