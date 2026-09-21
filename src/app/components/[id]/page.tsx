"use client";

import React, { use } from "react";
import { useVault } from "@/context/VaultContext";
import { ComponentDetailClient } from "./ComponentDetailClient";
import Link from "next/link";

interface ComponentPageProps {
  params: Promise<{ id: string }>;
}

export default function ComponentDetailPage({ params }: ComponentPageProps) {
  const { id } = use(params);
  const { getComponentById } = useVault();
  const compData = getComponentById(id);

  if (!compData) {
    return (
      <div className="p-12 text-center text-slate-500">
        <h2 className="text-lg font-bold text-slate-800 mb-2">Komponent nenalezen</h2>
        <Link href="/components" className="text-navy-600 hover:underline text-sm">
          Zpět na přehled komponentů
        </Link>
      </div>
    );
  }

  return <ComponentDetailClient componentData={compData} />;
}
