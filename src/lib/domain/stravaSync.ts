/**
 * Pure domain logic for BikeVault Strava Integration.
 * Enforces authoritative master record rules, 1:1 link constraints,
 * and mileage synchronization safety (never decreasing mileage automatically).
 */

import { Bike } from "@/types/vault";

export type MileageComparisonType = "EQUAL" | "HIGHER" | "LOWER";

export interface MileageComparisonResult {
  type: MileageComparisonType;
  bikeVaultKm: number;
  stravaKm: number;
  deltaKm: number;
  canAutoSync: boolean;
  message: string;
}

/**
 * Converts meters returned by Strava API to kilometers rounded to 1 decimal place.
 */
export function metersToKm(meters: number): number {
  if (meters <= 0 || isNaN(meters)) return 0;
  return Math.round((meters / 1000) * 10) / 10;
}

/**
 * Compares current BikeVault cumulative odometer mileage with Strava cumulative distance.
 * 
 * Safety rules:
 * - HIGHER: Strava has recorded more distance. Proposes synchronization (+delta km).
 * - EQUAL: Distances match within 0.05 km. Prevents duplicate snapshots.
 * - LOWER: Strava reports LESS mileage than BikeVault. CRITICAL: Never automatically decrease mileage!
 */
export function compareMileage(bikeVaultKm: number, stravaKm: number): MileageComparisonResult {
  const bv = Math.round(Number(bikeVaultKm || 0) * 10) / 10;
  const st = Math.round(Number(stravaKm || 0) * 10) / 10;
  const deltaKm = Math.round((st - bv) * 10) / 10;

  if (Math.abs(deltaKm) < 0.05) {
    return {
      type: "EQUAL",
      bikeVaultKm: bv,
      stravaKm: st,
      deltaKm: 0,
      canAutoSync: false,
      message: "Nájezd je aktuální.",
    };
  }

  if (deltaKm > 0) {
    return {
      type: "HIGHER",
      bikeVaultKm: bv,
      stravaKm: st,
      deltaKm,
      canAutoSync: true,
      message: `Strava vykazuje vyšší nájezd (+${deltaKm} km).`,
    };
  }

  return {
    type: "LOWER",
    bikeVaultKm: bv,
    stravaKm: st,
    deltaKm,
    canAutoSync: false,
    message: `Strava uvádí nižší nájezd než BikeVault. BikeVault: ${bv} km, Strava: ${st} km. Nájezd nebude automaticky snížen.`,
  };
}

/**
 * Validates that a Strava gear ID is not already linked when creating a brand new bike.
 * A missing/empty gear ID is valid (bike is not linked to Strava).
 */
export function validateNewBikeGearId(
  bikes: Bike[],
  stravaGearId?: string | null
): { valid: boolean; error?: string } {
  const cleanGearId = (stravaGearId || "").trim();
  if (!cleanGearId) return { valid: true };

  const duplicateBike = bikes.find((b) => b.stravaGearId === cleanGearId);
  if (duplicateBike) {
    return {
      valid: false,
      error: `Toto kolo ze Stravy je již propojeno s kolem "${duplicateBike.name}".`,
    };
  }

  return { valid: true };
}

/**
 * Validates the 1:1 relationship constraint between a Strava gear ID and a BikeVault bike.
 * Neither the Strava bike nor the BikeVault bike may be linked multiple times.
 */
export function validateLinkConstraint(
  bikes: Bike[],
  targetBikeId: string,
  stravaGearId: string
): { valid: boolean; error?: string } {
  const cleanGearId = stravaGearId.trim();
  if (!cleanGearId) {
    return { valid: false, error: "Identifikátor Strava kola (gear ID) nesmí být prázdný." };
  }

  // 1. Verify target bike exists
  const targetBike = bikes.find((b) => b.id === targetBikeId);
  if (!targetBike) {
    return { valid: false, error: "Kolo v BikeVault nebylo nalezeno." };
  }

  // 2. Verify target bike isn't already linked to a different Strava gear
  if (targetBike.stravaGearId && targetBike.stravaGearId !== cleanGearId) {
    return {
      valid: false,
      error: `Kolo "${targetBike.name}" je již propojeno s jiným kolem ze Stravy (ID: ${targetBike.stravaGearId}). Nejprve jej odpojte.`,
    };
  }

  // 3. Verify no other BikeVault bike is already linked to this Strava gear ID
  const duplicateBike = bikes.find(
    (b) => b.id !== targetBikeId && b.stravaGearId === cleanGearId
  );
  if (duplicateBike) {
    return {
      valid: false,
      error: `Toto kolo ze Stravy je již propojeno s kolem "${duplicateBike.name}".`,
    };
  }

  return { valid: true };
}
