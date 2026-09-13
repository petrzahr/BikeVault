import { NextRequest, NextResponse } from "next/server";
import { getAthleteBikesFromStrava } from "@/lib/strava/stravaApi";
import { resolveRequestUserId } from "@/lib/strava/requestUser";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = resolveRequestUserId(request);
    const bikes = await getAthleteBikesFromStrava(userId);
    return NextResponse.json({ bikes });
  } catch (error) {
    const status = (error as { status?: number })?.status || 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chyba při načítání kol ze Stravy." },
      { status }
    );
  }
}
