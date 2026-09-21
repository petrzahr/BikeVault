"use client";

import React, { use } from "react";
import { useVault } from "@/context/VaultContext";
import { BikeServiceClient } from "./BikeServiceClient";
import Link from "next/link";

interface BikeServicePageProps {
  params: Promise<{ id: string }>;
}

export default function BikeServicePage({ params }: BikeServicePageProps) {
  const { id } = use(params);
  const { getBike } = useVault();
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

  return <BikeServiceClient bike={bike} />;
}
