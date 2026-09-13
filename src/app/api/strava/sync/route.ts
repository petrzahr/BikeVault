import { NextRequest, NextResponse } from "next/server";
import { getGearMileageFromStrava } from "@/lib/strava/stravaApi";
import { updateLastSyncTime } from "@/lib/strava/stravaTokenStore";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gearId, gearIds } = body as { gearId?: string; gearIds?: string[] };

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
        const mileage = await getGearMileageFromStrava(id);
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
    updateLastSyncTime(nowIso);

    return NextResponse.json({
      success: true,
      lastSyncAt: nowIso,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chyba při synchronizaci se Stravou." },
      { status: 500 }
    );
  }
}
