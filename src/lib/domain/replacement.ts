/**
 * BikeVault — Domain logic for component replacement identity and equivalence matching.
 * 
 * Used by the Quick Replace ("Vyměnit") feature to ensure an installed component
 * can only be replaced with an identical physical component from inventory.
 */

export interface ComponentIdentityParams {
  manufacturer: string;
  model: string;
  variant?: string | null;
  categoryId?: string | null;
  wheelDiameter?: string | null;
  tireWidth?: string | null;
  tireCasing?: string | null;
  tireCompound?: string | null;
}

/**
 * Normalizes a string for deterministic comparison (trims whitespace, converts to lowercase).
 */
export function normalizeIdentityField(val?: string | null): string {
  if (!val) return "";
  return val.trim().toLowerCase();
}

/**
 * Normalizes category code or ID.
 * Treats TIRE_FRONT and TIRE_REAR as interchangeable tire categories for replacement purposes.
 */
export function normalizeCategoryCode(catCodeOrId?: string | null): string {
  const norm = normalizeIdentityField(catCodeOrId);
  if (norm === "tire_front" || norm === "tire_rear" || norm === "front_tire" || norm === "rear_tire") {
    return "tire";
  }
  return norm;
}

/**
 * Computes a deterministic canonical key for a component's replacement identity.
 * Components with the exact same key are considered identical replacement candidates.
 */
export function computeReplacementKey(
  component: ComponentIdentityParams,
  categoryCode?: string | null
): string {
  const catKey = normalizeCategoryCode(categoryCode || component.categoryId);
  const mfg = normalizeIdentityField(component.manufacturer);
  const model = normalizeIdentityField(component.model);
  const variant = normalizeIdentityField(component.variant);

  const parts = [catKey, mfg, model, variant];

  // For tires or components with tire specs, include dimensions and rubber compound
  const isTire = catKey === "tire" || !!component.tireCasing || !!component.tireCompound;
  if (isTire) {
    parts.push(
      normalizeIdentityField(component.wheelDiameter),
      normalizeIdentityField(component.tireWidth),
      normalizeIdentityField(component.tireCasing),
      normalizeIdentityField(component.tireCompound)
    );
  }

  return parts.join("::");
}

/**
 * Checks whether two components are an exact equivalent replacement.
 * Only components in status 'IN_STORAGE' are eligible as candidates.
 */
export function areComponentsEquivalentReplacement(
  installedComp: ComponentIdentityParams,
  installedCatCode: string | null | undefined,
  candidateComp: ComponentIdentityParams & { status?: string },
  candidateCatCode: string | null | undefined
): boolean {
  if (candidateComp.status && candidateComp.status !== "IN_STORAGE") {
    return false;
  }

  const installedKey = computeReplacementKey(installedComp, installedCatCode);
  const candidateKey = computeReplacementKey(candidateComp, candidateCatCode);

  return installedKey === candidateKey;
}

/**
 * Filters a list of storage components to find all valid replacement candidates for an installed component.
 */
export function findStorageReplacements<T extends { component: ComponentIdentityParams & { status?: string }; category?: { code?: string; nameCs?: string } | null }>(
  installedComp: ComponentIdentityParams,
  installedCatCode: string | null | undefined,
  storageItems: T[]
): T[] {
  return storageItems.filter((item) =>
    areComponentsEquivalentReplacement(
      installedComp,
      installedCatCode,
      item.component,
      item.category?.code
    )
  );
}
