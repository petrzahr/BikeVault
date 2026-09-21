"use client";

import React, { use } from "react";
import { useVault } from "@/context/VaultContext";
import { BikeComponentsClient } from "./BikeComponentsClient";
import Link from "next/link";

interface BikeComponentsPageProps {
  params: Promise<{ id: string }>;
}

export default function BikeComponentsPage({ params }: BikeComponentsPageProps) {
  const { id } = use(params);
  const { getBike } = useVault();
  const bike = getBike(id);

  if (!bike) {
    return (
      <div className="p-12 text-center text-slate-500">
        <h2 className="text-lg font-bold text-slate-800 mb-2">Kolo nenalezeno</h2>
        <Link href="/garage" className="text-brand-600 hover:underline text-sm">
          Zpět do Garáže
        </Link>
      </div>
    );
  }

  return <BikeComponentsClient bike={bike} />;
}
