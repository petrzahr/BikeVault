import React from "react";
import { notFound } from "next/navigation";
import { getBikeById } from "@/app/actions/bikes";
import { getBikeSetup, getSetupSnapshots } from "@/app/actions/setup";
import { getBikeInstalledComponents } from "@/app/actions/components";
import { SetupClient } from "./SetupClient";

interface SetupPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function BikeSetupPage({ params }: SetupPageProps) {
  const { id } = await params;
  const bike = await getBikeById(id);
  if (!bike) notFound();

  const setup = await getBikeSetup(id);
  const snapshots = await getSetupSnapshots(id);
  const installedComponents = await getBikeInstalledComponents(id);

  const forkComp = installedComponents.find((c) => c.installation.slot === "FORK")?.component;
  const shockComp = installedComponents.find((c) => c.installation.slot === "REAR_SHOCK")?.component;
  const frontTireComp = installedComponents.find((c) => c.installation.slot === "FRONT_TIRE")?.component;
  const rearTireComp = installedComponents.find((c) => c.installation.slot === "REAR_TIRE")?.component;

  return (
    <SetupClient
      bike={bike}
      initialSetup={setup}
      snapshots={snapshots}
      forkComp={forkComp}
      shockComp={shockComp}
      frontTireComp={frontTireComp}
      rearTireComp={rearTireComp}
    />
  );
}
