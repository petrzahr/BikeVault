import React from "react";
import { notFound } from "next/navigation";
import { getBikeById } from "@/app/actions/bikes";
import { getBikeServiceSchedulesWithStatus, getBikeServiceEvents } from "@/app/actions/maintenance";
import { getBikeInstalledComponents } from "@/app/actions/components";
import { BikeServiceClient } from "./BikeServiceClient";

interface BikeServicePageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function BikeServicePage({ params }: BikeServicePageProps) {
  const { id } = await params;
  const bike = await getBikeById(id);
  if (!bike) notFound();

  const schedulesWithStatus = await getBikeServiceSchedulesWithStatus(id);
  const events = await getBikeServiceEvents(id);
  const installedComponents = await getBikeInstalledComponents(id);

  return (
    <BikeServiceClient
      bike={bike}
      schedulesWithStatus={schedulesWithStatus}
      serviceEvents={events}
      installedComponents={installedComponents}
    />
  );
}
