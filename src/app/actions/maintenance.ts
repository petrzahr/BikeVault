"use server";

import { db, schema } from "@/db";
import { ensureDbInitialized, getBikeById } from "./bikes";
import { evaluateServiceSchedule } from "@/lib/domain/maintenance";
import { eq, and, or, sql, isNull, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getBikeServiceSchedules(bikeId: string) {
  await ensureDbInitialized();
  return db
    .select()
    .from(schema.serviceSchedules)
    .where(eq(schema.serviceSchedules.bikeId, bikeId));
}

/**
 * Returns all service schedules relevant to a specific bicycle:
 * 1. Schedules directly assigned to this bike.
 * 2. Schedules assigned to any component currently installed on this bike.
 */
export async function getBikeServiceSchedulesWithStatus(bikeId: string) {
  await ensureDbInitialized();

  const bike = await getBikeById(bikeId);
  if (!bike) return [];

  // Find all component IDs currently installed on this bike
  const installedComps = await db
    .select({ componentId: schema.componentInstallations.componentId })
    .from(schema.componentInstallations)
    .where(
      and(
        eq(schema.componentInstallations.bikeId, bikeId),
        isNull(schema.componentInstallations.removedAt)
      )
    );

  const installedCompIds = installedComps.map((c) => c.componentId);

  let whereClause = eq(schema.serviceSchedules.bikeId, bikeId);
  if (installedCompIds.length > 0) {
    whereClause = or(
      eq(schema.serviceSchedules.bikeId, bikeId),
      inArray(schema.serviceSchedules.componentId, installedCompIds)
    )!;
  }

  const schedules = await db
    .select({
      schedule: schema.serviceSchedules,
      bike: schema.bikes,
      component: schema.components,
    })
    .from(schema.serviceSchedules)
    .leftJoin(schema.bikes, eq(schema.serviceSchedules.bikeId, schema.bikes.id))
    .leftJoin(schema.components, eq(schema.serviceSchedules.componentId, schema.components.id))
    .where(whereClause)
    .orderBy(schema.serviceSchedules.name);

  const bikeKm = Number(bike.currentKm);
  const bikeMinutes = bike.currentMinutes;

  return schedules.map((item) => {
    const evalResult = evaluateServiceSchedule(
      {
        intervalKm: item.schedule.intervalKm ? Number(item.schedule.intervalKm) : null,
        intervalHours: item.schedule.intervalHours ? Number(item.schedule.intervalHours) : null,
        intervalMonths: item.schedule.intervalMonths,
        conditionType: item.schedule.conditionType,
        warningThresholdHours: item.schedule.warningThresholdHours ? Number(item.schedule.warningThresholdHours) : null,
        warningThresholdKm: item.schedule.warningThresholdKm ? Number(item.schedule.warningThresholdKm) : null,
        lastServiceDate: item.schedule.lastServiceDate,
        lastServiceBikeKm: item.schedule.lastServiceBikeKm ? Number(item.schedule.lastServiceBikeKm) : null,
        lastServiceBikeHours: item.schedule.lastServiceBikeHours ? Number(item.schedule.lastServiceBikeHours) : null,
      },
      bikeKm,
      bikeMinutes
    );

    return {
      ...item,
      status: evalResult,
    };
  });
}

/**
 * Returns all service schedules attached to a specific component
 */
export async function getComponentServiceSchedules(componentId: string) {
  await ensureDbInitialized();

  // Find if component is currently installed on any bike
  const activeInstall = await db
    .select({
      bike: schema.bikes,
    })
    .from(schema.componentInstallations)
    .innerJoin(schema.bikes, eq(schema.componentInstallations.bikeId, schema.bikes.id))
    .where(
      and(
        eq(schema.componentInstallations.componentId, componentId),
        isNull(schema.componentInstallations.removedAt)
      )
    )
    .limit(1);

  const activeBike = activeInstall.length > 0 ? activeInstall[0].bike : null;
  const bikeKm = activeBike ? Number(activeBike.currentKm) : 0;
  const bikeMinutes = activeBike ? activeBike.currentMinutes : 0;

  const schedules = await db
    .select({
      schedule: schema.serviceSchedules,
      bike: schema.bikes,
      component: schema.components,
    })
    .from(schema.serviceSchedules)
    .leftJoin(schema.bikes, eq(schema.serviceSchedules.bikeId, schema.bikes.id))
    .leftJoin(schema.components, eq(schema.serviceSchedules.componentId, schema.components.id))
    .where(eq(schema.serviceSchedules.componentId, componentId))
    .orderBy(schema.serviceSchedules.name);

  return schedules.map((item) => {
    const evalResult = evaluateServiceSchedule(
      {
        intervalKm: item.schedule.intervalKm ? Number(item.schedule.intervalKm) : null,
        intervalHours: item.schedule.intervalHours ? Number(item.schedule.intervalHours) : null,
        intervalMonths: item.schedule.intervalMonths,
        conditionType: item.schedule.conditionType,
        warningThresholdHours: item.schedule.warningThresholdHours ? Number(item.schedule.warningThresholdHours) : null,
        warningThresholdKm: item.schedule.warningThresholdKm ? Number(item.schedule.warningThresholdKm) : null,
        lastServiceDate: item.schedule.lastServiceDate,
        lastServiceBikeKm: item.schedule.lastServiceBikeKm ? Number(item.schedule.lastServiceBikeKm) : null,
        lastServiceBikeHours: item.schedule.lastServiceBikeHours ? Number(item.schedule.lastServiceBikeHours) : null,
      },
      bikeKm,
      bikeMinutes
    );

    return {
      ...item,
      activeBike,
      status: evalResult,
    };
  });
}

/**
 * Returns all service events recorded for a specific component
 */
export async function getComponentServiceEvents(componentId: string) {
  await ensureDbInitialized();
  return db
    .select({
      event: schema.serviceEvents,
      bike: schema.bikes,
      schedule: schema.serviceSchedules,
    })
    .from(schema.serviceEvents)
    .leftJoin(schema.bikes, eq(schema.serviceEvents.bikeId, schema.bikes.id))
    .leftJoin(schema.serviceSchedules, eq(schema.serviceEvents.serviceScheduleId, schema.serviceSchedules.id))
    .where(eq(schema.serviceEvents.componentId, componentId))
    .orderBy(sql`${schema.serviceEvents.serviceDate} DESC`);
}

/**
 * Returns all active maintenance schedules for the global dashboard
 */
export async function getAllMaintenanceSchedulesWithStatus() {
  await ensureDbInitialized();

  const schedules = await db
    .select({
      schedule: schema.serviceSchedules,
      bike: schema.bikes,
      component: schema.components,
    })
    .from(schema.serviceSchedules)
    .leftJoin(schema.bikes, eq(schema.serviceSchedules.bikeId, schema.bikes.id))
    .leftJoin(schema.components, eq(schema.serviceSchedules.componentId, schema.components.id))
    .where(eq(schema.serviceSchedules.isActive, true));

  return schedules.map((item) => {
    const bikeKm = item.bike ? Number(item.bike.currentKm) : 0;
    const bikeMinutes = item.bike ? item.bike.currentMinutes : 0;

    const evalResult = evaluateServiceSchedule(
      {
        intervalKm: item.schedule.intervalKm ? Number(item.schedule.intervalKm) : null,
        intervalHours: item.schedule.intervalHours ? Number(item.schedule.intervalHours) : null,
        intervalMonths: item.schedule.intervalMonths,
        conditionType: item.schedule.conditionType,
        warningThresholdHours: item.schedule.warningThresholdHours ? Number(item.schedule.warningThresholdHours) : null,
        warningThresholdKm: item.schedule.warningThresholdKm ? Number(item.schedule.warningThresholdKm) : null,
        lastServiceDate: item.schedule.lastServiceDate,
        lastServiceBikeKm: item.schedule.lastServiceBikeKm ? Number(item.schedule.lastServiceBikeKm) : null,
        lastServiceBikeHours: item.schedule.lastServiceBikeHours ? Number(item.schedule.lastServiceBikeHours) : null,
      },
      bikeKm,
      bikeMinutes
    );

    return {
      ...item,
      status: evalResult,
    };
  });
}

/**
 * Returns ALL configured schedules (active and inactive) for management
 */
export async function getAllConfiguredSchedulesWithStatus() {
  await ensureDbInitialized();

  const schedules = await db
    .select({
      schedule: schema.serviceSchedules,
      bike: schema.bikes,
      component: schema.components,
    })
    .from(schema.serviceSchedules)
    .leftJoin(schema.bikes, eq(schema.serviceSchedules.bikeId, schema.bikes.id))
    .leftJoin(schema.components, eq(schema.serviceSchedules.componentId, schema.components.id))
    .orderBy(schema.serviceSchedules.name);

  return schedules.map((item) => {
    const bikeKm = item.bike ? Number(item.bike.currentKm) : 0;
    const bikeMinutes = item.bike ? item.bike.currentMinutes : 0;

    const evalResult = evaluateServiceSchedule(
      {
        intervalKm: item.schedule.intervalKm ? Number(item.schedule.intervalKm) : null,
        intervalHours: item.schedule.intervalHours ? Number(item.schedule.intervalHours) : null,
        intervalMonths: item.schedule.intervalMonths,
        conditionType: item.schedule.conditionType,
        warningThresholdHours: item.schedule.warningThresholdHours ? Number(item.schedule.warningThresholdHours) : null,
        warningThresholdKm: item.schedule.warningThresholdKm ? Number(item.schedule.warningThresholdKm) : null,
        lastServiceDate: item.schedule.lastServiceDate,
        lastServiceBikeKm: item.schedule.lastServiceBikeKm ? Number(item.schedule.lastServiceBikeKm) : null,
        lastServiceBikeHours: item.schedule.lastServiceBikeHours ? Number(item.schedule.lastServiceBikeHours) : null,
      },
      bikeKm,
      bikeMinutes
    );

    return {
      ...item,
      status: evalResult,
    };
  });
}

export async function getBikeServiceEvents(bikeId: string) {
  await ensureDbInitialized();
  return db
    .select({
      event: schema.serviceEvents,
      component: schema.components,
    })
    .from(schema.serviceEvents)
    .leftJoin(schema.components, eq(schema.serviceEvents.componentId, schema.components.id))
    .where(eq(schema.serviceEvents.bikeId, bikeId))
    .orderBy(sql`${schema.serviceEvents.serviceDate} DESC`);
}

/**
 * Creates a new Service Schedule (Servisní plán)
 */
export async function createServiceScheduleAction(data: {
  name: string;
  bikeId?: string | null;
  componentId?: string | null;
  componentCategoryId?: string | null;
  intervalHours?: number | null;
  intervalKm?: number | null;
  intervalMonths?: number | null;
  conditionType?: "WHICHEVER_FIRST" | string;
  warningThresholdHours?: number | null;
  warningThresholdKm?: number | null;
  notes?: string | null;
  startingPointType: "CURRENT_STATE" | "HISTORICAL";
  lastServiceDate?: string | null;
  lastServiceBikeKm?: number | null;
  lastServiceBikeHours?: number | null;
}) {
  await ensureDbInitialized();

  let finalLastServiceDate = data.lastServiceDate || null;
  let finalLastServiceBikeKm = data.lastServiceBikeKm ?? null;
  let finalLastServiceBikeHours = data.lastServiceBikeHours ?? null;

  // If starting from current state, fetch the bike's current metrics
  if (data.startingPointType === "CURRENT_STATE") {
    let bikeToUse = null;
    if (data.bikeId) {
      bikeToUse = await getBikeById(data.bikeId);
    } else if (data.componentId) {
      const activeInstall = await db
        .select({ bike: schema.bikes })
        .from(schema.componentInstallations)
        .innerJoin(schema.bikes, eq(schema.componentInstallations.bikeId, schema.bikes.id))
        .where(
          and(
            eq(schema.componentInstallations.componentId, data.componentId),
            isNull(schema.componentInstallations.removedAt)
          )
        )
        .limit(1);
      if (activeInstall.length > 0) bikeToUse = activeInstall[0].bike;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    finalLastServiceDate = todayStr;
    finalLastServiceBikeKm = bikeToUse ? Number(bikeToUse.currentKm) : 0;
    finalLastServiceBikeHours = bikeToUse ? Math.round((bikeToUse.currentMinutes / 60) * 10) / 10 : 0;
  }

  const [newSchedule] = await db
    .insert(schema.serviceSchedules)
    .values({
      name: data.name,
      bikeId: data.bikeId || null,
      componentId: data.componentId || null,
      componentCategoryId: data.componentCategoryId || null,
      intervalHours: data.intervalHours ? String(data.intervalHours) : null,
      intervalKm: data.intervalKm ? String(data.intervalKm) : null,
      intervalMonths: data.intervalMonths || null,
      conditionType: data.conditionType || "WHICHEVER_FIRST",
      warningThresholdHours: data.warningThresholdHours ? String(data.warningThresholdHours) : null,
      warningThresholdKm: data.warningThresholdKm ? String(data.warningThresholdKm) : null,
      notes: data.notes || null,
      lastServiceDate: finalLastServiceDate,
      lastServiceBikeKm: finalLastServiceBikeKm !== null ? String(finalLastServiceBikeKm) : null,
      lastServiceBikeHours: finalLastServiceBikeHours !== null ? String(finalLastServiceBikeHours) : null,
      isActive: true,
    })
    .returning();

  if (data.bikeId) revalidatePath(`/bikes/${data.bikeId}/service`);
  if (data.componentId) revalidatePath(`/components/${data.componentId}`);
  revalidatePath("/maintenance");

  return newSchedule;
}

/**
 * Updates an existing Service Schedule (Servisní plán).
 * Crucial rule: Changing the ServiceSchedule must NOT modify historical ServiceEvents!
 */
export async function updateServiceScheduleAction(
  id: string,
  data: {
    name: string;
    bikeId?: string | null;
    componentId?: string | null;
    intervalHours?: number | null;
    intervalKm?: number | null;
    intervalMonths?: number | null;
    conditionType?: "WHICHEVER_FIRST" | string;
    warningThresholdHours?: number | null;
    warningThresholdKm?: number | null;
    notes?: string | null;
    lastServiceDate?: string | null;
    lastServiceBikeKm?: number | null;
    lastServiceBikeHours?: number | null;
  }
) {
  await ensureDbInitialized();

  const [updated] = await db
    .update(schema.serviceSchedules)
    .set({
      name: data.name,
      bikeId: data.bikeId || null,
      componentId: data.componentId || null,
      intervalHours: data.intervalHours ? String(data.intervalHours) : null,
      intervalKm: data.intervalKm ? String(data.intervalKm) : null,
      intervalMonths: data.intervalMonths || null,
      conditionType: data.conditionType || "WHICHEVER_FIRST",
      warningThresholdHours: data.warningThresholdHours ? String(data.warningThresholdHours) : null,
      warningThresholdKm: data.warningThresholdKm ? String(data.warningThresholdKm) : null,
      notes: data.notes || null,
      lastServiceDate: data.lastServiceDate !== undefined ? data.lastServiceDate : undefined,
      lastServiceBikeKm: data.lastServiceBikeKm !== undefined ? (data.lastServiceBikeKm !== null ? String(data.lastServiceBikeKm) : null) : undefined,
      lastServiceBikeHours: data.lastServiceBikeHours !== undefined ? (data.lastServiceBikeHours !== null ? String(data.lastServiceBikeHours) : null) : undefined,
    })
    .where(eq(schema.serviceSchedules.id, id))
    .returning();

  if (data.bikeId) revalidatePath(`/bikes/${data.bikeId}/service`);
  if (data.componentId) revalidatePath(`/components/${data.componentId}`);
  revalidatePath("/maintenance");

  return updated;
}

/**
 * Toggles a schedule between Active and Disabled.
 * A disabled schedule remains in history, does not generate warnings, and can be reactivated later.
 */
export async function toggleServiceScheduleActiveAction(id: string, isActive: boolean) {
  await ensureDbInitialized();

  const [schedule] = await db
    .update(schema.serviceSchedules)
    .set({ isActive })
    .where(eq(schema.serviceSchedules.id, id))
    .returning();

  if (schedule?.bikeId) revalidatePath(`/bikes/${schedule.bikeId}/service`);
  if (schedule?.componentId) revalidatePath(`/components/${schedule.componentId}`);
  revalidatePath("/maintenance");

  return schedule;
}

/**
 * Safe deletion of a Service Schedule.
 * If the schedule has historical ServiceEvents, deletion is rejected; disabling is preferred.
 */
export async function deleteServiceScheduleAction(id: string) {
  await ensureDbInitialized();

  // Check for historical service events
  const eventsCount = await db
    .select({ count: sql`count(*)` })
    .from(schema.serviceEvents)
    .where(eq(schema.serviceEvents.serviceScheduleId, id));

  const count = Number((eventsCount[0] as any)?.count || 0);
  if (count > 0) {
    throw new Error(
      `Tento plán má v historii evidováno ${count} servisních záznamů. Z důvodu zachování integrity historie jej nelze smazat. Použijte možnost Deaktivovat.`
    );
  }

  const [schedule] = await db
    .select()
    .from(schema.serviceSchedules)
    .where(eq(schema.serviceSchedules.id, id))
    .limit(1);

  await db.delete(schema.serviceSchedules).where(eq(schema.serviceSchedules.id, id));

  if (schedule?.bikeId) revalidatePath(`/bikes/${schedule.bikeId}/service`);
  if (schedule?.componentId) revalidatePath(`/components/${schedule.componentId}`);
  revalidatePath("/maintenance");

  return { success: true };
}

/**
 * Records a Service Event (Servisní záznam).
 * Can be linked to a Service Schedule (which resets the schedule baseline) or recorded without a plan.
 */
export async function createServiceEventAction(data: {
  bikeId: string;
  componentId?: string;
  serviceScheduleId?: string;
  name: string;
  serviceDate: string;
  executionType: "DIY" | "WORKSHOP";
  serviceProvider?: string;
  partsCost: number;
  laborCost: number;
  otherCost?: number;
  notes?: string;
}) {
  await ensureDbInitialized();

  const bike = await getBikeById(data.bikeId);
  if (!bike) throw new Error("Kolo nebylo nalezeno");

  const [event] = await db
    .insert(schema.serviceEvents)
    .values({
      bikeId: data.bikeId,
      componentId: data.componentId || null,
      serviceScheduleId: data.serviceScheduleId || null,
      name: data.name,
      serviceDate: data.serviceDate,
      bikeKm: bike.currentKm,
      bikeMinutes: bike.currentMinutes,
      executionType: data.executionType,
      serviceProvider: data.serviceProvider || (data.executionType === "DIY" ? "Svépomocí" : "Servis"),
      partsCost: String(data.partsCost || 0),
      laborCost: String(data.laborCost || 0),
      otherCost: String(data.otherCost || 0),
      currency: "CZK",
      notes: data.notes,
    })
    .returning();

  // Reset linked schedule if provided
  if (data.serviceScheduleId) {
    const hours = Number(bike.currentMinutes) / 60;
    await db
      .update(schema.serviceSchedules)
      .set({
        lastServiceDate: data.serviceDate,
        lastServiceBikeKm: bike.currentKm,
        lastServiceBikeHours: String(Math.round(hours * 10) / 10),
      })
      .where(eq(schema.serviceSchedules.id, data.serviceScheduleId));
  }

  // Create financial transactions for costs
  if (data.partsCost > 0) {
    await db.insert(schema.financialTransactions).values({
      bikeId: data.bikeId,
      componentId: data.componentId,
      serviceEventId: event.id,
      type: "EXPENSE",
      category: "SERVICE_PARTS",
      amount: String(data.partsCost),
      currency: "CZK",
      transactionDate: data.serviceDate,
      notes: `Servis díly: ${data.name}`,
    });
  }

  if (data.laborCost > 0) {
    await db.insert(schema.financialTransactions).values({
      bikeId: data.bikeId,
      componentId: data.componentId,
      serviceEventId: event.id,
      type: "EXPENSE",
      category: "SERVICE_LABOR",
      amount: String(data.laborCost),
      currency: "CZK",
      transactionDate: data.serviceDate,
      notes: `Servis práce: ${data.name}`,
    });
  }

  revalidatePath(`/bikes/${data.bikeId}/service`);
  if (data.componentId) revalidatePath(`/components/${data.componentId}`);
  revalidatePath("/maintenance");
  revalidatePath("/finances");
  return event;
}
