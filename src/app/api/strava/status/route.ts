import { NextRequest, NextResponse } from "next/server";
import { getPublicUserStravaStatus } from "@/lib/strava/stravaTokenStore";
import { getStravaConfig } from "@/lib/strava/stravaApi";
import { resolveRequestUserId } from "@/lib/strava/requestUser";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = resolveRequestUserId(request);
    const status = getPublicUserStravaStatus(userId);
    const config = getStravaConfig();

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
