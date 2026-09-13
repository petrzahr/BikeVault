import { NextResponse } from "next/server";
import { getPublicStravaStatus } from "@/lib/strava/stravaTokenStore";
import { getStravaConfig } from "@/lib/strava/stravaApi";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = getPublicStravaStatus();
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
