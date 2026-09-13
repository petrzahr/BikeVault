import { NextResponse } from "next/server";
import { getAthleteBikesFromStrava } from "@/lib/strava/stravaApi";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const bikes = await getAthleteBikesFromStrava();
    return NextResponse.json({ bikes });
  } catch (error) {
    const status = (error as { status?: number })?.status || 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chyba při načítání kol ze Stravy." },
      { status }
    );
  }
}
