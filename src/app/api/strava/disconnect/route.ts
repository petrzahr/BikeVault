import { NextRequest, NextResponse } from "next/server";
import { disconnectStrava } from "@/lib/strava/stravaApi";
import { resolveRequestUserId } from "@/lib/strava/requestUser";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    let bodyUserId: string | undefined;
    try {
      const body = await request.json();
      bodyUserId = body?.userId;
    } catch {
      // Body may be empty
    }

    const userId = bodyUserId || resolveRequestUserId(request);
    await disconnectStrava(userId);

    return NextResponse.json({
      success: true,
      message: `Účet Strava pro uživatele '${userId}' byl úspěšně odpojen.`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chyba při odpojování účtu Strava." },
      { status: 500 }
    );
  }
}
