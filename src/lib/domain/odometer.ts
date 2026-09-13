/**
 * Pure domain logic for BikeVault Odometer Snapshots.
 * BikeVault does NOT track individual rides.
 * Users periodically record the cumulative total mileage and riding hours.
 */

export interface OdometerState {
  currentKm: number;
  currentMinutes: number;
}

export interface OdometerSnapshotInput {
  totalKm: number;
  totalMinutes: number;
  entryDate: string;
  note?: string;
  allowCorrection?: boolean;
}

export interface OdometerSnapshotResult {
  resultingKm: number;
  resultingMinutes: number;
  deltaKm: number;
  deltaMinutes: number;
  isCorrection: boolean;
}

/**
 * Calculates and validates a new cumulative odometer snapshot.
 */
export function recordOdometerSnapshot(
  current: OdometerState,
  input: OdometerSnapshotInput
): OdometerSnapshotResult {
  if (input.totalKm < 0) {
    throw new Error("Celkový nájezd kilometrů nemůže být záporný.");
  }
  if (input.totalMinutes < 0) {
    throw new Error("Celkový počet minut nemůže být záporný.");
  }

  const resultingKm = Math.round(input.totalKm * 10) / 10;
  const resultingMinutes = Math.round(input.totalMinutes);

  const deltaKm = Math.round((resultingKm - current.currentKm) * 10) / 10;
  const deltaMinutes = resultingMinutes - current.currentMinutes;

  const isDecreasing = deltaKm < 0 || deltaMinutes < 0;

  if (isDecreasing && !input.allowCorrection) {
    throw new Error(
      `Nový stav (${resultingKm} km / ${Math.floor(resultingMinutes / 60)} h) je nižší než předchozí stav (${current.currentKm} km / ${Math.floor(current.currentMinutes / 60)} h). Pokud se jedná o opravu překlepu nebo reset počítače, potvrďte korekci.`
    );
  }

  return {
    resultingKm,
    resultingMinutes,
    deltaKm,
    deltaMinutes,
    isCorrection: isDecreasing,
  };
}

/**
 * Calculates component usage between two odometer states or active bike state.
 */
export function calculateInstallationUsage(
  installedKm: number,
  installedMinutes: number,
  removedKm: number | null | undefined,
  removedMinutes: number | null | undefined,
  bikeCurrentKm: number,
  bikeCurrentMinutes: number
): { usageKm: number; usageMinutes: number } {
  const endKm = removedKm !== null && removedKm !== undefined ? removedKm : bikeCurrentKm;
  const endMinutes = removedMinutes !== null && removedMinutes !== undefined ? removedMinutes : bikeCurrentMinutes;

  const usageKm = Math.max(0, Math.round((endKm - installedKm) * 10) / 10);
  const usageMinutes = Math.max(0, endMinutes - installedMinutes);

  return { usageKm, usageMinutes };
}
