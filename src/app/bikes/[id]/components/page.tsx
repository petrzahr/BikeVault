import React from "react";
import { notFound } from "next/navigation";
import { getBikeById, getGarageBikes } from "@/app/actions/bikes";
import { 
  getBikeInstalledComponents, 
  getComponentCategories, 
  getStorageComponentsWithCategory 
} from "@/app/actions/components";
import { BikeComponentsClient } from "./BikeComponentsClient";

interface BikeComponentsPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function BikeComponentsPage({ params }: BikeComponentsPageProps) {
  const { id } = await params;
  const bike = await getBikeById(id);
  if (!bike) notFound();

  const installedComponents = await getBikeInstalledComponents(id);
  const allBikes = await getGarageBikes("ACTIVE");
  const categories = await getComponentCategories();

  // Storage components with category info (available to install or quick-replace)
  const storageComponents = await getStorageComponentsWithCategory();

  return (
    <BikeComponentsClient
      bike={bike}
      installedComponents={installedComponents}
      allBikes={allBikes}
      storageComponents={storageComponents}
      categories={categories}
    />
  );
}
