"use server";

import { db, schema } from "@/db";
import { initDatabase } from "@/db/init";
import { recordOdometerSnapshot } from "@/lib/domain/odometer";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function ensureDbInitialized() {
  await initDatabase();
}

export async function getGarageBikes(status: string = "ACTIVE") {
  await ensureDbInitialized();
  return db
    .select()
    .from(schema.bikes)
    .where(eq(schema.bikes.status, status))
    .orderBy(schema.bikes.createdAt);
}

export async function getBikeById(id: string) {
  await ensureDbInitialized();
  const result = await db
    .select()
    .from(schema.bikes)
    .where(eq(schema.bikes.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getBikeOdometerEntries(bikeId: string) {
  await ensureDbInitialized();
  return db
    .select()
    .from(schema.bikeOdometerEntries)
    .where(eq(schema.bikeOdometerEntries.bikeId, bikeId))
    .orderBy(sql`${schema.bikeOdometerEntries.recordedAt} DESC`);
}

export async function createBikeAction(data: {
  name: string;
  manufacturer: string;
  model: string;
  modelYear?: number;
  category: string;
  discipline: string;
  suspensionType: string;
  driveType?: string;
  serialNumber?: string;
  purchaseDate: string;
  purchasePrice: number;
  initialKm?: number;
  initialHours?: number;
  initialMinutes?: number;
  imageUrl?: string;
  notes?: string;
}) {
  await ensureDbInitialized();

  const totalInitialMinutes = ((data.initialHours || 0) * 60) + (data.initialMinutes || 0);
  const initialKm = data.initialKm || 0;

  // 1. Insert bike
  const [newBike] = await db
    .insert(schema.bikes)
    .values({
      name: data.name,
      manufacturer: data.manufacturer,
      model: data.model,
      modelYear: data.modelYear,
      category: data.category,
      discipline: data.discipline,
      suspensionType: data.suspensionType,
      driveType: data.driveType || "CONVENTIONAL",
      serialNumber: data.serialNumber,
      purchaseDate: data.purchaseDate,
      purchasePrice: String(data.purchasePrice || 0),
      currency: "CZK",
      status: "ACTIVE",
      currentKm: String(initialKm),
      currentMinutes: totalInitialMinutes,
      imageUrl: data.imageUrl,
      notes: data.notes,
    })
    .returning();

  // 2. Initial Odometer Entry
  await db.insert(schema.bikeOdometerEntries).values({
    bikeId: newBike.id,
    entryDate: data.purchaseDate,
    entryType: "INITIAL",
    deltaKm: String(initialKm),
    deltaMinutes: totalInitialMinutes,
    resultingKm: String(initialKm),
    resultingMinutes: totalInitialMinutes,
    note: "Výchozí stav při založení kola",
  });

  // 3. Purchase Financial Transaction
  if (data.purchasePrice > 0) {
    await db.insert(schema.financialTransactions).values({
      bikeId: newBike.id,
      type: "EXPENSE",
      category: "BIKE_PURCHASE",
      amount: String(data.purchasePrice),
      currency: "CZK",
      transactionDate: data.purchaseDate,
      notes: `Nákup kola ${data.name}`,
    });
  }

  // 4. Create empty initial BikeSetup
  await db.insert(schema.bikeSetups).values({
    bikeId: newBike.id,
    generalNotes: "Výchozí nastavení kola",
  });

  revalidatePath("/garage");
  return newBike;
}

export async function recordOdometerSnapshotAction(
  bikeId: string,
  totalKm: number,
  totalMinutes: number,
  entryDate: string,
  note?: string,
  allowCorrection?: boolean
) {
  await ensureDbInitialized();

  const bike = await getBikeById(bikeId);
  if (!bike) throw new Error("Kolo nebylo nalezeno");

  const currentOdometer = {
    currentKm: Number(bike.currentKm),
    currentMinutes: bike.currentMinutes,
  };

  const calculated = recordOdometerSnapshot(currentOdometer, {
    totalKm,
    totalMinutes,
    entryDate,
    note,
    allowCorrection,
  });

  // Update cached bike totals
  await db
    .update(schema.bikes)
    .set({
      currentKm: String(calculated.resultingKm),
      currentMinutes: calculated.resultingMinutes,
      updatedAt: new Date(),
    })
    .where(eq(schema.bikes.id, bikeId));

  // Insert odometer snapshot entry
  await db.insert(schema.bikeOdometerEntries).values({
    bikeId,
    entryDate,
    entryType: calculated.isCorrection ? "CORRECTION" : "SNAPSHOT",
    deltaKm: String(calculated.deltaKm),
    deltaMinutes: calculated.deltaMinutes,
    resultingKm: String(calculated.resultingKm),
    resultingMinutes: calculated.resultingMinutes,
    note,
  });

  revalidatePath("/garage");
  revalidatePath(`/bikes/${bikeId}`);
  return calculated;
}
