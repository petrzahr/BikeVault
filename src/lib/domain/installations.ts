/** Pure installation lifecycle rules. Runtime values are supplied by the caller. */
import { BikeVaultData, ComponentInstallation, FinancialTransaction } from "@/types/vault";
import { areComponentsEquivalentReplacement } from "./replacement";

export interface InstallationRuntime {
  now: string;
  id: string;
}

function assertAvailable(data: BikeVaultData, componentId: string): void {
  const component = data.components.find((c) => c.id === componentId);
  if (!component) throw new Error("Komponent nebyl nalezen");
  if (component.status !== "IN_STORAGE" || data.componentInstallations.some((i) => i.componentId === componentId && !i.removedAt)) {
    throw new Error("Komponent není dostupný ve skladu");
  }
}

export function installComponent(
  data: BikeVaultData,
  runtime: InstallationRuntime,
  bikeId: string,
  componentId: string,
  slot: string
): BikeVaultData {
  const bike = data.bikes.find((b) => b.id === bikeId);
  if (!bike) throw new Error("Kolo nebylo nalezeno");

  assertAvailable(data, componentId);

  const { now, id } = runtime;

  const prev = data;
  // Close any active installation on this slot
  const updatedInstallations = prev.componentInstallations.map((inst) => {
    if (inst.bikeId === bikeId && inst.slot === slot && !inst.removedAt) {
      return {
        ...inst,
        removedAt: now,
        removedBikeKm: bike.currentKm,
        removedBikeMinutes: bike.currentMinutes,
      };
    }
    return inst;
  });

  // Update displaced components to IN_STORAGE
  const activeSlotInst = prev.componentInstallations.find(
    (i) => i.bikeId === bikeId && i.slot === slot && !i.removedAt
  );

  const updatedComponents = prev.components.map((c) => {
    if (activeSlotInst && c.id === activeSlotInst.componentId) {
      return { ...c, status: "IN_STORAGE" as const, updatedAt: now };
    }
    if (c.id === componentId) {
      return { ...c, status: "INSTALLED" as const, updatedAt: now };
    }
    return c;
  });

  const newInst: ComponentInstallation = {
    id,
    bikeId,
    componentId,
    slot,
    installedAt: now,
    installedBikeKm: bike.currentKm,
    installedBikeMinutes: bike.currentMinutes,
    createdAt: now,
  };

  return {
    ...prev,
    componentInstallations: [newInst, ...updatedInstallations],
    components: updatedComponents,
  };
}

export function removeComponent(
  data: BikeVaultData,
  runtime: InstallationRuntime,
  installationId: string,
  disposition: "IN_STORAGE" | "SOLD" | "DAMAGED" | "DISCARDED",
  salePrice?: number,
  saleDate?: string
): BikeVaultData {
  const inst = data.componentInstallations.find((i) => i.id === installationId);
  if (!inst) throw new Error("Instalace nebyla nalezena");
  if (inst.removedAt) throw new Error("Instalace již není aktivní");
  if (!data.components.some((c) => c.id === inst.componentId)) throw new Error("Komponent nebyl nalezen");
  const bike = data.bikes.find((b) => b.id === inst.bikeId);
  if (!bike) throw new Error("Kolo nebylo nalezeno");

  const { now, id } = runtime;

  const newTx: FinancialTransaction[] = [];
  if (disposition === "SOLD" && salePrice && salePrice > 0) {
    newTx.push({
      id,
      bikeId: bike.id,
      componentId: inst.componentId,
      type: "INCOME",
      category: "COMPONENT_SALE",
      amount: salePrice,
      currency: "CZK",
      transactionDate: saleDate || now.split("T")[0],
      notes: "Prodej demontovaného komponentu",
      createdAt: now,
    });
  }

  const prev = data;
  return {
    ...prev,
    componentInstallations: prev.componentInstallations.map((i) =>
      i.id === installationId
        ? {
            ...i,
            removedAt: now,
            removedBikeKm: bike.currentKm,
            removedBikeMinutes: bike.currentMinutes,
          }
        : i
    ),
    components: prev.components.map((c) =>
      c.id === inst.componentId
        ? {
            ...c,
            status: disposition,
            soldPrice: disposition === "SOLD" ? salePrice : undefined,
            soldDate: disposition === "SOLD" ? saleDate : undefined,
            updatedAt: now,
          }
        : c
    ),
    financialTransactions: [...newTx, ...prev.financialTransactions],
  };
}

export function transferComponent(
  data: BikeVaultData,
  runtime: InstallationRuntime,
  installationId: string,
  targetBikeId: string,
  targetSlot: string
): BikeVaultData {
  const inst = data.componentInstallations.find((i) => i.id === installationId);
  if (!inst) throw new Error("Instalace nebyla nalezena");
  if (inst.removedAt) throw new Error("Instalace již není aktivní");
  if (!data.components.some((c) => c.id === inst.componentId)) throw new Error("Komponent nebyl nalezen");
  const sourceBike = data.bikes.find((b) => b.id === inst.bikeId);
  const targetBike = data.bikes.find((b) => b.id === targetBikeId);
  if (!sourceBike || !targetBike) throw new Error("Kolo nebylo nalezeno");

  if (data.componentInstallations.some((i) => i.bikeId === targetBikeId && i.slot === targetSlot && !i.removedAt)) {
    throw new Error("Cílová pozice je již obsazena");
  }
  if (data.componentInstallations.some((i) => i.componentId === inst.componentId && i.id !== inst.id && !i.removedAt)) {
    throw new Error("Komponent je již namontován v jiné instalaci");
  }

  const { now, id } = runtime;

  const newInst: ComponentInstallation = {
    id,
    bikeId: targetBikeId,
    componentId: inst.componentId,
    slot: targetSlot,
    installedAt: now,
    installedBikeKm: targetBike.currentKm,
    installedBikeMinutes: targetBike.currentMinutes,
    createdAt: now,
  };

  const prev = data;
  return {
    ...prev,
    componentInstallations: [
      newInst,
      ...prev.componentInstallations.map((i) =>
        i.id === installationId
          ? {
              ...i,
              removedAt: now,
              removedBikeKm: sourceBike.currentKm,
              removedBikeMinutes: sourceBike.currentMinutes,
            }
          : i
      ),
    ],
    components: prev.components.map((c) =>
      c.id === inst.componentId ? { ...c, status: "INSTALLED" as const, updatedAt: now } : c
    ),
  };
}

export function quickReplaceComponent(
  data: BikeVaultData,
  runtime: InstallationRuntime,
  bikeId: string,
  currentInstallationId: string,
  replacementComponentId: string
): BikeVaultData {
  const bike = data.bikes.find((b) => b.id === bikeId);
  if (!bike) throw new Error("Kolo nebylo nalezeno");

  const currentInst = data.componentInstallations.find((i) => i.id === currentInstallationId);
  if (!currentInst) throw new Error("Aktivní instalace nebyla nalezena");
  if (currentInst.removedAt || currentInst.bikeId !== bikeId) throw new Error("Instalace není aktivní na tomto kole");
  assertAvailable(data, replacementComponentId);

  const currentComp = data.components.find((c) => c.id === currentInst.componentId);
  const replacementComp = data.components.find((c) => c.id === replacementComponentId);
  if (!currentComp || !replacementComp) throw new Error("Komponent nebyl nalezen");

  const currentCat = data.categories.find((cat) => cat.id === currentComp.categoryId);
  const repCat = data.categories.find((cat) => cat.id === replacementComp.categoryId);

  // Validate equivalence using domain rules
  const isEquiv = areComponentsEquivalentReplacement(
    currentComp,
    currentCat?.code,
    replacementComp,
    repCat?.code
  );
  if (!isEquiv) {
    throw new Error("Vybraný komponent neodpovídá parametrům původního dílu pro rychlou výměnu");
  }

  const { now, id } = runtime;
  const newInstId = id;

  const newInst: ComponentInstallation = {
    id: newInstId,
    bikeId,
    componentId: replacementComponentId,
    slot: currentInst.slot,
    installedAt: now,
    installedBikeKm: bike.currentKm,
    installedBikeMinutes: bike.currentMinutes,
    createdAt: now,
  };

  const prev = data;
  return {
    ...prev,
    componentInstallations: [
      newInst,
      ...prev.componentInstallations.map((i) =>
        i.id === currentInstallationId
          ? {
              ...i,
              removedAt: now,
              removedBikeKm: bike.currentKm,
              removedBikeMinutes: bike.currentMinutes,
            }
          : i
      ),
    ],
    components: prev.components.map((c) => {
      if (c.id === currentComp.id) return { ...c, status: "DISCARDED" as const, updatedAt: now };
      if (c.id === replacementComp.id) return { ...c, status: "INSTALLED" as const, updatedAt: now };
      return c;
    }),
    bikeSetups: prev.bikeSetups.map((s) => {
      if (s.bikeId !== bikeId) return s;
      return {
        ...s,
        forkInstallationId: s.forkInstallationId === currentInstallationId ? newInstId : s.forkInstallationId,
        shockInstallationId: s.shockInstallationId === currentInstallationId ? newInstId : s.shockInstallationId,
        frontTireInstallationId: s.frontTireInstallationId === currentInstallationId ? newInstId : s.frontTireInstallationId,
        rearTireInstallationId: s.rearTireInstallationId === currentInstallationId ? newInstId : s.rearTireInstallationId,
        updatedAt: now,
      };
    }),
  };
}
