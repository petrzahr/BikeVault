import { NextRequest, NextResponse } from "next/server";
import { getPublicUserStravaStatus } from "@/lib/strava/stravaTokenStore";
import { getStravaConfig } from "@/lib/strava/stravaApi";
import { resolveAuthenticatedUserId, UnauthorizedError } from "@/lib/strava/requestUser";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const config = getStravaConfig();
    let userId: string;
    try {
      userId = await resolveAuthenticatedUserId(request);
    } catch (authErr) {
      if (authErr instanceof UnauthorizedError) {
        return NextResponse.json({
          connected: false,
          isConfigured: config.isConfigured,
        });
      }
      throw authErr;
    }

    const status = await getPublicUserStravaStatus(userId);

    return NextResponse.json({
      ...status,
      isConfigured: config.isConfigured,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chyba při zjišťování stavu Strava." },
      { status: 500 }
    );
  }
}
