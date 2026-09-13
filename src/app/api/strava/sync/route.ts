import { NextRequest, NextResponse } from "next/server";
import { getGearMileageFromStrava } from "@/lib/strava/stravaApi";
import { updateUserLastSyncTime } from "@/lib/strava/stravaTokenStore";
import { resolveAuthenticatedUserId, UnauthorizedError } from "@/lib/strava/requestUser";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const userId = await resolveAuthenticatedUserId(request);
    const body = await request.json();
    const { gearId, gearIds } = body as {
      gearId?: string;
      gearIds?: string[];
    };

    const idsToSync = gearIds || (gearId ? [gearId] : []);

    if (idsToSync.length === 0) {
      return NextResponse.json(
        { error: "Zadejte alespoň jedno Strava gear ID pro synchronizaci." },
        { status: 400 }
      );
    }

    const results: Record<string, { distanceMeters: number; distanceKm: number; error?: string }> = {};

    for (const id of idsToSync) {
      try {
        const mileage = await getGearMileageFromStrava(id, userId);
        results[id] = mileage;
      } catch (err) {
        results[id] = {
          distanceMeters: 0,
          distanceKm: 0,
          error: err instanceof Error ? err.message : "Chyba při zjišťování nájezdu.",
        };
      }
    }

    const nowIso = new Date().toISOString();
    await updateUserLastSyncTime(userId, nowIso);

    return NextResponse.json({
      success: true,
      lastSyncAt: nowIso,
      results,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chyba při synchronizaci se Stravou." },
      { status: 500 }
    );
  }
}
