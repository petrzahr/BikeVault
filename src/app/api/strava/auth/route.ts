import { NextRequest, NextResponse } from "next/server";
import { buildAuthorizeUrl, getStravaConfig } from "@/lib/strava/stravaApi";
import { resolveRequestUserId } from "@/lib/strava/requestUser";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const config = getStravaConfig();
    if (!config.isConfigured) {
      return NextResponse.json(
        {
          error:
            "Strava integrace není nakonfigurována. Nastavte STRAVA_CLIENT_ID a STRAVA_CLIENT_SECRET v prostředí aplikace.",
        },
        { status: 400 }
      );
    }

    const userId = resolveRequestUserId(request);
    const authorizeUrl = buildAuthorizeUrl(userId);

    const url = new URL(request.url);
    if (url.searchParams.get("redirect") === "1") {
      return NextResponse.redirect(authorizeUrl);
    }

    return NextResponse.json({ url: authorizeUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chyba při inicializaci Strava OAuth." },
      { status: 500 }
    );
  }
}
