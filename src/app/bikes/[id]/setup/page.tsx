"use client";

import React, { use } from "react";
import { useVault } from "@/context/VaultContext";
import { SetupClient } from "./SetupClient";
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
        <Link href="/garage" className="text-blue-600 hover:underline text-sm">
          Zpět do Garáže
        </Link>
      </div>
    );
  }

  const setup = getBikeSetup(id);
  const snapshots = getBikeSnapshots(id);
  const installedComponents = getBikeInstalledComponents(id);

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
