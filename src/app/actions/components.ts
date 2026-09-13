"use server";

import { db, schema } from "@/db";
import { ensureDbInitialized, getBikeById } from "./bikes";
import { eq, and, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { areComponentsEquivalentReplacement } from "@/lib/domain/replacement";

export async function getAllComponents(filterStatus?: string) {
  await ensureDbInitialized();

  let query = db.select({
    component: schema.components,
    category: schema.componentCategories,
    activeInstallation: schema.componentInstallations,
    activeBike: schema.bikes,
  })
  .from(schema.components)
  .leftJoin(schema.componentCategories, eq(schema.components.categoryId, schema.componentCategories.id))
  .leftJoin(
    schema.componentInstallations, 
    and(
      eq(schema.components.id, schema.componentInstallations.componentId),
      isNull(schema.componentInstallations.removedAt)
    )
  )
  .leftJoin(schema.bikes, eq(schema.componentInstallations.bikeId, schema.bikes.id));

  if (filterStatus) {
    return query.where(eq(schema.components.status, filterStatus)).orderBy(schema.components.manufacturer);
  }

  return query.orderBy(schema.components.manufacturer);
}

export async function getBikeInstalledComponents(bikeId: string) {
  await ensureDbInitialized();

  return db.select({
    installation: schema.componentInstallations,
    component: schema.components,
    category: schema.componentCategories,
  })
  .from(schema.componentInstallations)
  .innerJoin(schema.components, eq(schema.componentInstallations.componentId, schema.components.id))
  .innerJoin(schema.componentCategories, eq(schema.components.categoryId, schema.componentCategories.id))
  .where(
    and(
      eq(schema.componentInstallations.bikeId, bikeId),
      isNull(schema.componentInstallations.removedAt)
    )
  )
  .orderBy(schema.componentCategories.sortOrder);
}

export async function getComponentCategories() {
  await ensureDbInitialized();
  return db
    .select()
    .from(schema.componentCategories)
    .orderBy(schema.componentCategories.sortOrder);
}

export async function getComponentById(id: string) {
  await ensureDbInitialized();

  const comps = await db
    .select({
      component: schema.components,
      category: schema.componentCategories,
    })
    .from(schema.components)
    .leftJoin(schema.componentCategories, eq(schema.components.categoryId, schema.componentCategories.id))
    .where(eq(schema.components.id, id))
    .limit(1);

  if (comps.length === 0) return null;
  const { component, category } = comps[0];

  // Active installation (if any)
  const activeInst = await db
    .select({
      installation: schema.componentInstallations,
      bike: schema.bikes,
    })
    .from(schema.componentInstallations)
    .innerJoin(schema.bikes, eq(schema.componentInstallations.bikeId, schema.bikes.id))
    .where(
      and(
        eq(schema.componentInstallations.componentId, id),
        isNull(schema.componentInstallations.removedAt)
      )
    )
    .limit(1);

  // All historical installations
  const historyInst = await db
    .select({
      installation: schema.componentInstallations,
      bike: schema.bikes,
    })
    .from(schema.componentInstallations)
    .innerJoin(schema.bikes, eq(schema.componentInstallations.bikeId, schema.bikes.id))
    .where(eq(schema.componentInstallations.componentId, id))
    .orderBy(sql`${schema.componentInstallations.installedAt} DESC`);

  return {
    component,
    category,
    activeInstallation: activeInst.length > 0 ? activeInst[0] : null,
    installationHistory: historyInst,
  };
}

export async function createComponentAction(data: {
  categoryId: string;
  manufacturer: string;
  model: string;
  variant?: string;
  serialNumber?: string;
  initialKm?: number;
  initialHours?: number;
  purchaseDate?: string;
  purchasePrice?: number;
  wheelDiameter?: string;
  tireWidth?: string;
  tireCasing?: string;
  tireCompound?: string;
  notes?: string;
}) {
  await ensureDbInitialized();

  const [newComp] = await db
    .insert(schema.components)
    .values({
      categoryId: data.categoryId,
      manufacturer: data.manufacturer,
      model: data.model,
      variant: data.variant,
      serialNumber: data.serialNumber,
      initialKm: String(data.initialKm || 0),
      initialMinutes: (data.initialHours || 0) * 60,
      purchaseDate: data.purchaseDate,
      purchasePrice: String(data.purchasePrice || 0),
      currency: "CZK",
      status: "IN_STORAGE",
      wheelDiameter: data.wheelDiameter,
      tireWidth: data.tireWidth,
      tireCasing: data.tireCasing,
      tireCompound: data.tireCompound,
      notes: data.notes,
    })
    .returning();

  if (data.purchasePrice && data.purchasePrice > 0 && data.purchaseDate) {
    await db.insert(schema.financialTransactions).values({
      componentId: newComp.id,
      type: "EXPENSE",
      category: "COMPONENT_PURCHASE",
      amount: String(data.purchasePrice),
      currency: "CZK",
      transactionDate: data.purchaseDate,
      notes: `Nákup komponentu ${data.manufacturer} ${data.model}`,
    });
  }

  revalidatePath("/components");
  return newComp;
}

export async function installComponentAction(
  bikeId: string,
  componentId: string,
  slot: string
) {
  await ensureDbInitialized();

  const bike = await getBikeById(bikeId);
  if (!bike) throw new Error("Kolo nebylo nalezeno");

  // Close any active installation on this bike slot
  const activeSlot = await db
    .select()
    .from(schema.componentInstallations)
    .where(
      and(
        eq(schema.componentInstallations.bikeId, bikeId),
        eq(schema.componentInstallations.slot, slot),
        isNull(schema.componentInstallations.removedAt)
      )
    );

  if (activeSlot.length > 0) {
    await db
      .update(schema.componentInstallations)
      .set({
        removedAt: new Date(),
        removedBikeKm: bike.currentKm,
        removedBikeMinutes: bike.currentMinutes,
      })
      .where(eq(schema.componentInstallations.id, activeSlot[0].id));

    await db
      .update(schema.components)
      .set({ status: "IN_STORAGE" })
      .where(eq(schema.components.id, activeSlot[0].componentId));
  }

  // Create new installation
  const [inst] = await db
    .insert(schema.componentInstallations)
    .values({
      bikeId,
      componentId,
      slot,
      installedAt: new Date(),
      installedBikeKm: bike.currentKm,
      installedBikeMinutes: bike.currentMinutes,
    })
    .returning();

  await db
    .update(schema.components)
    .set({ status: "INSTALLED" })
    .where(eq(schema.components.id, componentId));

  revalidatePath(`/bikes/${bikeId}`);
  revalidatePath(`/bikes/${bikeId}/components`);
  revalidatePath("/components");
  return inst;
}

export async function removeComponentAction(
  installationId: string,
  disposition: "IN_STORAGE" | "SOLD" | "DAMAGED" | "DISCARDED",
  salePrice?: number,
  saleDate?: string
) {
  await ensureDbInitialized();

  const insts = await db
    .select()
    .from(schema.componentInstallations)
    .where(eq(schema.componentInstallations.id, installationId));

  if (insts.length === 0) throw new Error("Instalace nebyla nalezena");
  const inst = insts[0];

  const bike = await getBikeById(inst.bikeId);
  if (!bike) throw new Error("Kolo nebylo nalezeno");

  await db
    .update(schema.componentInstallations)
    .set({
      removedAt: new Date(),
      removedBikeKm: bike.currentKm,
      removedBikeMinutes: bike.currentMinutes,
    })
    .where(eq(schema.componentInstallations.id, installationId));

  await db
    .update(schema.components)
    .set({
      status: disposition,
      soldDate: disposition === "SOLD" ? saleDate : null,
      soldPrice: disposition === "SOLD" && salePrice ? String(salePrice) : null,
    })
    .where(eq(schema.components.id, inst.componentId));

  if (disposition === "SOLD" && salePrice && salePrice > 0 && saleDate) {
    await db.insert(schema.financialTransactions).values({
      bikeId: bike.id,
      componentId: inst.componentId,
      type: "INCOME",
      category: "COMPONENT_SALE",
      amount: String(salePrice),
      currency: "CZK",
      transactionDate: saleDate,
      notes: "Prodej demontovaného komponentu",
    });
  }

  revalidatePath(`/bikes/${inst.bikeId}`);
  revalidatePath(`/bikes/${inst.bikeId}/components`);
  revalidatePath("/components");
}

export async function transferComponentAction(
  installationId: string,
  targetBikeId: string,
  targetSlot: string
) {
  await ensureDbInitialized();

  const insts = await db
    .select()
    .from(schema.componentInstallations)
    .where(eq(schema.componentInstallations.id, installationId));

  if (insts.length === 0) throw new Error("Instalace nebyla nalezena");
  const inst = insts[0];

  const sourceBike = await getBikeById(inst.bikeId);
  const targetBike = await getBikeById(targetBikeId);
  if (!sourceBike || !targetBike) throw new Error("Kolo nebylo nalezeno");

  // Close source installation
  await db
    .update(schema.componentInstallations)
    .set({
      removedAt: new Date(),
      removedBikeKm: sourceBike.currentKm,
      removedBikeMinutes: sourceBike.currentMinutes,
    })
    .where(eq(schema.componentInstallations.id, installationId));

  // Open target installation
  await db.insert(schema.componentInstallations).values({
    bikeId: targetBikeId,
    componentId: inst.componentId,
    slot: targetSlot,
    installedAt: new Date(),
    installedBikeKm: targetBike.currentKm,
    installedBikeMinutes: targetBike.currentMinutes,
  });

  await db
    .update(schema.components)
    .set({ status: "INSTALLED" })
    .where(eq(schema.components.id, inst.componentId));

  revalidatePath(`/bikes/${sourceBike.id}`);
  revalidatePath(`/bikes/${targetBike.id}`);
  revalidatePath("/components");
}

export async function getStorageComponentsWithCategory() {
  await ensureDbInitialized();

  return db
    .select({
      component: schema.components,
      category: schema.componentCategories,
    })
    .from(schema.components)
    .leftJoin(schema.componentCategories, eq(schema.components.categoryId, schema.componentCategories.id))
    .where(eq(schema.components.status, "IN_STORAGE"))
    .orderBy(schema.components.manufacturer);
}

export async function quickReplaceComponentAction(
  bikeId: string,
  currentInstallationId: string,
  replacementComponentId: string
) {
  await ensureDbInitialized();

  const bike = await getBikeById(bikeId);
  if (!bike) throw new Error("Kolo nebylo nalezeno");

  // Get current active installation
  const insts = await db
    .select({
      installation: schema.componentInstallations,
      component: schema.components,
      category: schema.componentCategories,
    })
    .from(schema.componentInstallations)
    .innerJoin(schema.components, eq(schema.componentInstallations.componentId, schema.components.id))
    .leftJoin(schema.componentCategories, eq(schema.components.categoryId, schema.componentCategories.id))
    .where(
      and(
        eq(schema.componentInstallations.id, currentInstallationId),
        eq(schema.componentInstallations.bikeId, bikeId),
        isNull(schema.componentInstallations.removedAt)
      )
    );

  if (insts.length === 0) {
    throw new Error("Aktivní instalace komponentu nebyla nalezena");
  }
  const current = insts[0];

  // Get candidate replacement component
  const replacements = await db
    .select({
      component: schema.components,
      category: schema.componentCategories,
    })
    .from(schema.components)
    .leftJoin(schema.componentCategories, eq(schema.components.categoryId, schema.componentCategories.id))
    .where(
      and(
        eq(schema.components.id, replacementComponentId),
        eq(schema.components.status, "IN_STORAGE")
      )
    );

  if (replacements.length === 0) {
    throw new Error("Náhradní díl nebyl ve skladu nalezen nebo již není skladem");
  }
  const rep = replacements[0];

  // Validate equivalence using domain logic
  const isEquiv = areComponentsEquivalentReplacement(
    current.component,
    current.category?.code,
    rep.component,
    rep.category?.code
  );

  if (!isEquiv) {
    throw new Error("Vybraný komponent neodpovídá parametrům původního dílu pro rychlou výměnu");
  }

  const now = new Date();

  // 1. Close current installation
  await db
    .update(schema.componentInstallations)
    .set({
      removedAt: now,
      removedBikeKm: bike.currentKm,
      removedBikeMinutes: bike.currentMinutes,
    })
    .where(eq(schema.componentInstallations.id, currentInstallationId));

  // 2. Mark old component as DISCARDED
  await db
    .update(schema.components)
    .set({
      status: "DISCARDED",
      updatedAt: now,
    })
    .where(eq(schema.components.id, current.component.id));

  // 3. Create new installation
  const [newInst] = await db
    .insert(schema.componentInstallations)
    .values({
      bikeId,
      componentId: rep.component.id,
      slot: current.installation.slot,
      installedAt: now,
      installedBikeKm: bike.currentKm,
      installedBikeMinutes: bike.currentMinutes,
    })
    .returning();

  // 4. Mark replacement component as INSTALLED
  await db
    .update(schema.components)
    .set({
      status: "INSTALLED",
      updatedAt: now,
    })
    .where(eq(schema.components.id, rep.component.id));

  // 5. Update any bike setups pointing to the old installation ID
  await db
    .update(schema.bikeSetups)
    .set({
      forkInstallationId: sql`CASE WHEN fork_installation_id = ${currentInstallationId} THEN ${newInst.id} ELSE fork_installation_id END`,
      shockInstallationId: sql`CASE WHEN shock_installation_id = ${currentInstallationId} THEN ${newInst.id} ELSE shock_installation_id END`,
      frontTireInstallationId: sql`CASE WHEN front_tire_installation_id = ${currentInstallationId} THEN ${newInst.id} ELSE front_tire_installation_id END`,
      rearTireInstallationId: sql`CASE WHEN rear_tire_installation_id = ${currentInstallationId} THEN ${newInst.id} ELSE rear_tire_installation_id END`,
    })
    .where(eq(schema.bikeSetups.bikeId, bikeId));

  revalidatePath(`/bikes/${bikeId}`);
  revalidatePath(`/bikes/${bikeId}/components`);
  revalidatePath(`/bikes/${bikeId}/service`);
  revalidatePath(`/components`);
  revalidatePath(`/components/${current.component.id}`);
  revalidatePath(`/components/${rep.component.id}`);

  return { success: true, newInstallation: newInst };
}
