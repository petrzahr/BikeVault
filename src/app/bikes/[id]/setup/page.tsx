"use client";

import React, { use } from "react";
import { useVault } from "@/context/VaultContext";
import { SetupClient } from "./SetupClient";
import { getComponentTravelMm } from "@/lib/bikeLists";
import Link from "next/link";

interface SetupPageProps {
  params: Promise<{ id: string }>;
}

export default function BikeSetupPage({ params }: SetupPageProps) {
  const { id } = use(params);
  const { getBike, getBikeSetup, getBikeSnapshots, getBikeInstalledComponents } = useVault();
  const bike = getBike(id);

  if (!bike) {
    return (
      <div className="p-12 text-center text-slate-500">
        <h2 className="text-lg font-bold text-slate-800 mb-2">Kolo nenalezeno</h2>
        <Link href="/garage" className="text-navy-600 hover:underline text-sm">
          Zpět do Garáže
        </Link>
      </div>
    );
  }

  const setup = getBikeSetup(id);
  const snapshots = getBikeSnapshots(id);
  const installedComponents = getBikeInstalledComponents(id);

  const forkEntry = installedComponents.find((c) => c.installation.slot === "FORK");
  const frameEntry = installedComponents.find((c) => c.installation.slot === "FRAME");
  const forkComp = forkEntry?.component;
  const shockComp = installedComponents.find((c) => c.installation.slot === "REAR_SHOCK")?.component;
  const frontTireComp = installedComponents.find((c) => c.installation.slot === "FRONT_TIRE")?.component;
  const rearTireComp = installedComponents.find((c) => c.installation.slot === "REAR_TIRE")?.component;

  const forkTravelSpec = getComponentTravelMm(forkEntry?.component, forkEntry?.category);
  const frameTravelSpec = getComponentTravelMm(frameEntry?.component, frameEntry?.category);

  return (
    <SetupClient
      bike={bike}
      initialSetup={setup}
      snapshots={snapshots}
      forkComp={forkComp}
      shockComp={shockComp}
      frontTireComp={frontTireComp}
      rearTireComp={rearTireComp}
      forkTravelSpec={forkTravelSpec}
      frameTravelSpec={frameTravelSpec}
    />
  );
}
