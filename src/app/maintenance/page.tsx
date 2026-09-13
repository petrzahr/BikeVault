import React from "react";
import { getAllConfiguredSchedulesWithStatus } from "@/app/actions/maintenance";
import { getGarageBikes } from "@/app/actions/bikes";
import { getAllComponents } from "@/app/actions/components";
import { db, schema } from "@/db";
import { sql, eq } from "drizzle-orm";
import { MaintenanceClient } from "./MaintenanceClient";

export const dynamic = "force-dynamic";

export default async function MaintenanceDashboardPage() {
  const allSchedules = await getAllConfiguredSchedulesWithStatus();
  const bikes = await getGarageBikes("ACTIVE");
  const rawComponents = await getAllComponents();
  const components = rawComponents.map((c) => c.component);

  // Load recent service events across all bikes
  const recentEvents = await db
    .select({
      event: schema.serviceEvents,
      bike: schema.bikes,
      component: schema.components,
    })
    .from(schema.serviceEvents)
    .innerJoin(schema.bikes, eq(schema.serviceEvents.bikeId, schema.bikes.id))
    .leftJoin(schema.components, eq(schema.serviceEvents.componentId, schema.components.id))
    .orderBy(sql`${schema.serviceEvents.serviceDate} DESC`)
    .limit(10);

  return (
    <MaintenanceClient
      allSchedules={allSchedules}
      recentEvents={recentEvents}
      bikes={bikes}
      components={components}
    />
  );
}
