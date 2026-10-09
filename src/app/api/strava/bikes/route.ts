import { NextRequest, NextResponse } from "next/server";
import { getAthleteBikesFromStrava, getGearMovingSecondsFromStrava } from "@/lib/strava/stravaApi";
import { secondsToMinutes } from "@/lib/domain/stravaSync";
import { resolveAuthenticatedUserId, UnauthorizedError } from "@/lib/strava/requestUser";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = await resolveAuthenticatedUserId(request);
    const bikes = await getAthleteBikesFromStrava(userId);

    // Ride time is optional here — listing bikes must work even without activity access.
    let movingSecondsByGear: Record<string, number> | null = null;
    try {
      movingSecondsByGear = await getGearMovingSecondsFromStrava(userId);
    } catch {
      movingSecondsByGear = null;
    }

    return NextResponse.json({
      bikes: bikes.map((b) => ({
        ...b,
        movingMinutes: movingSecondsByGear ? secondsToMinutes(movingSecondsByGear[b.id] || 0) : null,
      })),
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const status = (error as { status?: number })?.status || 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chyba při načítání kol ze Stravy." },
      { status }
    );
  }
}
