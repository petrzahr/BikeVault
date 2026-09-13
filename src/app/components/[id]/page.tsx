import React from "react";
import { notFound } from "next/navigation";
import { getComponentById } from "@/app/actions/components";
import { getComponentServiceSchedules, getComponentServiceEvents } from "@/app/actions/maintenance";
import { getGarageBikes } from "@/app/actions/bikes";
import { ComponentDetailClient } from "./ComponentDetailClient";

interface ComponentPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function ComponentDetailPage({ params }: ComponentPageProps) {
  const { id } = await params;
  const compData = await getComponentById(id);
  if (!compData) notFound();

  const schedulesWithStatus = await getComponentServiceSchedules(id);
  const serviceEvents = await getComponentServiceEvents(id);
  const allBikes = await getGarageBikes("ACTIVE");

  return (
    <ComponentDetailClient
      componentData={compData}
      schedulesWithStatus={schedulesWithStatus}
      serviceEvents={serviceEvents}
      allBikes={allBikes}
    />
  );
}
