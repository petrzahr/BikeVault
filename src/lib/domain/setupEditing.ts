import type { BikeSetup } from "@/types/vault";

export interface SetupDraft {
  forkPressure: string;
  forkSag: string;
  forkLsc: string;
  forkHsc: string;
  forkLsr: string;
  forkHsr: string;
  forkTokens: string;
  forkNotes: string;
  shockPressure: string;
  shockSag: string;
  shockLsc: string;
  shockHsc: string;
  shockLsr: string;
  shockHsr: string;
  shockTokens: string;
  shockNotes: string;
  frontPressure: string;
  frontInsert: string;
  frontNotes: string;
  rearPressure: string;
  rearInsert: string;
  rearNotes: string;
  generalNotes: string;
}

export type SetupContent = Required<Pick<BikeSetup,
  "forkPressurePsi" |
  "forkSagPercent" |
  "forkLscClicks" |
  "forkHscClicks" |
  "forkLsrClicks" |
  "forkHsrClicks" |
  "forkVolumeSpacers" |
  "forkTravelMm" |
  "forkNotes" |
  "shockPressurePsi" |
  "shockSagPercent" |
  "shockLscClicks" |
  "shockHscClicks" |
  "shockLsrClicks" |
  "shockHsrClicks" |
  "shockVolumeSpacers" |
  "shockNotes" |
  "frontTirePressureBar" |
  "frontTireInsert" |
  "frontTireNotes" |
  "rearTirePressureBar" |
  "rearTireInsert" |
  "rearTireNotes" |
  "generalNotes"
>>;

/** Preserve the existing specification-first, truthy stored-travel fallback. */
export function resolveForkTravel(spec: number | null | undefined, stored: number | null | undefined): number | null {
  return spec || stored || null;
}

/** Convert all draft fields, including adjusters currently hidden by the UI. */
export function setupContentFromDraft(
  draft: SetupDraft,
  forkTravelSpec?: number | null,
  storedForkTravel?: number | null,
): SetupContent {
  const {
    forkPressure, forkSag, forkLsc, forkHsc, forkLsr, forkHsr, forkTokens,
    forkNotes, shockPressure, shockSag, shockLsc, shockHsc, shockLsr, shockHsr,
    shockTokens, shockNotes, frontPressure, frontInsert, frontNotes, rearPressure, rearInsert,
    rearNotes, generalNotes,
  } = draft;
  const forkTravelNum = resolveForkTravel(forkTravelSpec, storedForkTravel);
  return {
    forkPressurePsi: forkPressure ? parseFloat(forkPressure) : null,
    forkSagPercent: forkSag ? parseInt(forkSag, 10) : null,
    forkLscClicks: forkLsc ? parseInt(forkLsc, 10) : null,
    forkHscClicks: forkHsc ? parseInt(forkHsc, 10) : null,
    forkLsrClicks: forkLsr ? parseInt(forkLsr, 10) : null,
    forkHsrClicks: forkHsr ? parseInt(forkHsr, 10) : null,
    forkVolumeSpacers: forkTokens ? parseInt(forkTokens, 10) : null,
    forkTravelMm: forkTravelNum,
    forkNotes: forkNotes.trim() || null,

    shockPressurePsi: shockPressure ? parseFloat(shockPressure) : null,
    shockSagPercent: shockSag ? parseInt(shockSag, 10) : null,
    shockLscClicks: shockLsc ? parseInt(shockLsc, 10) : null,
    shockHscClicks: shockHsc ? parseInt(shockHsc, 10) : null,
    shockLsrClicks: shockLsr ? parseInt(shockLsr, 10) : null,
    shockHsrClicks: shockHsr ? parseInt(shockHsr, 10) : null,
    shockVolumeSpacers: shockTokens ? parseInt(shockTokens, 10) : null,
    shockNotes: shockNotes.trim() || null,

    frontTirePressureBar: frontPressure ? parseFloat(frontPressure) : null,
    frontTireInsert: frontInsert.trim() || null,
    frontTireNotes: frontNotes.trim() || null,

    rearTirePressureBar: rearPressure ? parseFloat(rearPressure) : null,
    rearTireInsert: rearInsert.trim() || null,
    rearTireNotes: rearNotes.trim() || null,

    generalNotes: generalNotes.trim() || null,
  };
}
