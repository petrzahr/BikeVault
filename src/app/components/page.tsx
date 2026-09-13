import React from "react";
import { getAllComponents, getComponentCategories } from "@/app/actions/components";
import { ComponentsClient } from "./ComponentsClient";

export const dynamic = "force-dynamic";

export default async function ComponentsPage() {
  const allComponents = await getAllComponents();
  const categories = await getComponentCategories();

  return (
    <ComponentsClient
      initialComponents={allComponents}
      categories={categories}
    />
  );
}
