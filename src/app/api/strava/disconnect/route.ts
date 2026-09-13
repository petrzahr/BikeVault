import { NextRequest, NextResponse } from "next/server";
import { disconnectStrava } from "@/lib/strava/stravaApi";
import { resolveAuthenticatedUserId, UnauthorizedError } from "@/lib/strava/requestUser";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const userId = await resolveAuthenticatedUserId(request);
    await disconnectStrava(userId);

    return NextResponse.json({
      success: true,
      message: `Účet Strava pro uživatele '${userId}' byl úspěšně odpojen.`,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chyba při odpojování účtu Strava." },
      { status: 500 }
    );
  }
}
