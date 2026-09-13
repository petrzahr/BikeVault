"use server";

import { db, schema } from "@/db";
import { ensureDbInitialized } from "./bikes";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getBikeSetup(bikeId: string) {
  await ensureDbInitialized();
  const res = await db
    .select()
    .from(schema.bikeSetups)
    .where(eq(schema.bikeSetups.bikeId, bikeId))
    .limit(1);

  return res.length > 0 ? res[0] : null;
}

export async function getSetupSnapshots(bikeId: string) {
  await ensureDbInitialized();
  return db
    .select()
    .from(schema.setupSnapshots)
    .where(eq(schema.setupSnapshots.bikeId, bikeId))
    .orderBy(sql`${schema.setupSnapshots.createdAt} DESC`);
}

export async function updateBikeSetupAction(bikeId: string, data: {
  forkPressurePsi?: number | null;
  forkSagPercent?: number | null;
  forkReboundClicks?: number | null;
  forkLscClicks?: number | null;
  forkHscClicks?: number | null;
  forkLsrClicks?: number | null;
  forkHsrClicks?: number | null;
  forkVolumeSpacers?: number | null;
  forkTravelMm?: number | null;
  forkNotes?: string | null;
  shockPressurePsi?: number | null;
  shockSagPercent?: number | null;
  shockReboundClicks?: number | null;
  shockLscClicks?: number | null;
  shockHscClicks?: number | null;
  shockLsrClicks?: number | null;
  shockHsrClicks?: number | null;
  shockVolumeSpacers?: number | null;
  shockNotes?: string | null;
  frontTirePressureBar?: number | null;
  frontTireInsert?: string | null;
  frontTireNotes?: string | null;
  rearTirePressureBar?: number | null;
  rearTireInsert?: string | null;
  rearTireNotes?: string | null;
  generalNotes?: string | null;
}) {
  await ensureDbInitialized();

  await db
    .update(schema.bikeSetups)
    .set({
      forkPressurePsi: data.forkPressurePsi !== undefined && data.forkPressurePsi !== null ? String(data.forkPressurePsi) : null,
      forkSagPercent: data.forkSagPercent,
      forkReboundClicks: data.forkReboundClicks,
      forkLscClicks: data.forkLscClicks,
      forkHscClicks: data.forkHscClicks,
      forkLsrClicks: data.forkLsrClicks,
      forkHsrClicks: data.forkHsrClicks,
      forkVolumeSpacers: data.forkVolumeSpacers,
      forkTravelMm: data.forkTravelMm,
      forkNotes: data.forkNotes,
      shockPressurePsi: data.shockPressurePsi !== undefined && data.shockPressurePsi !== null ? String(data.shockPressurePsi) : null,
      shockSagPercent: data.shockSagPercent,
      shockReboundClicks: data.shockReboundClicks,
      shockLscClicks: data.shockLscClicks,
      shockHscClicks: data.shockHscClicks,
      shockLsrClicks: data.shockLsrClicks,
      shockHsrClicks: data.shockHsrClicks,
      shockVolumeSpacers: data.shockVolumeSpacers,
      shockNotes: data.shockNotes,
      frontTirePressureBar: data.frontTirePressureBar !== undefined && data.frontTirePressureBar !== null ? String(data.frontTirePressureBar) : null,
      frontTireInsert: data.frontTireInsert,
      frontTireNotes: data.frontTireNotes,
      rearTirePressureBar: data.rearTirePressureBar !== undefined && data.rearTirePressureBar !== null ? String(data.rearTirePressureBar) : null,
      rearTireInsert: data.rearTireInsert,
      rearTireNotes: data.rearTireNotes,
      generalNotes: data.generalNotes,
      updatedAt: new Date(),
    })
    .where(eq(schema.bikeSetups.bikeId, bikeId));

  revalidatePath(`/bikes/${bikeId}/setup`);
  revalidatePath(`/bikes/${bikeId}`);
  revalidatePath("/garage");
}

export async function quickUpdateTirePressureAction(
  bikeId: string,
  frontBar: number,
  rearBar: number
) {
  await ensureDbInitialized();

  await db
    .update(schema.bikeSetups)
    .set({
      frontTirePressureBar: String(frontBar),
      rearTirePressureBar: String(rearBar),
      updatedAt: new Date(),
    })
    .where(eq(schema.bikeSetups.bikeId, bikeId));

  revalidatePath(`/bikes/${bikeId}/setup`);
  revalidatePath(`/bikes/${bikeId}`);
  revalidatePath("/garage");
}

export async function createSetupSnapshotAction(
  bikeId: string,
  profileName: string,
  notes?: string
) {
  await ensureDbInitialized();

  const currentSetup = await getBikeSetup(bikeId);
  if (!currentSetup) throw new Error("Nastavení kola nebylo nalezeno");

  const snapshot = await db
    .insert(schema.setupSnapshots)
    .values({
      bikeId,
      profileName,
      snapshotData: currentSetup,
      notes,
    })
    .returning();

  revalidatePath(`/bikes/${bikeId}/setup`);
  return snapshot[0];
}
