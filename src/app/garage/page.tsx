import React from "react";
import { db, schema } from "@/db";
import { ensureDbInitialized } from "@/app/actions/bikes";
import { getAllMaintenanceSchedulesWithStatus } from "@/app/actions/maintenance";
import { GarageClient } from "./GarageClient";

export const dynamic = "force-dynamic";

export default async function GaragePage() {
  await ensureDbInitialized();

  const allBikes = await db.select().from(schema.bikes).orderBy(schema.bikes.createdAt);
  const allTransactions = await db.select().from(schema.financialTransactions);
  const serviceSchedulesWithStatus = await getAllMaintenanceSchedulesWithStatus();

  return (
    <GarageClient
      initialBikes={allBikes}
      allTransactions={allTransactions}
      serviceSchedulesWithStatus={serviceSchedulesWithStatus}
    />
  );
}
