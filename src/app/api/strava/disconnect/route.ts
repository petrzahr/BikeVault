import { NextResponse } from "next/server";
import { disconnectStrava } from "@/lib/strava/stravaApi";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await disconnectStrava();
    return NextResponse.json({ success: true, message: "Účet Strava byl úspěšně odpojen." });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chyba při odpojování účtu Strava." },
      { status: 500 }
    );
  }
}
