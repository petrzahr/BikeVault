/**
 * Domain utilities for Bike Setup, Suspension and Tire pressures.
 */

export function hasFrontSuspension(suspensionType: string): boolean {
  return suspensionType === "FRONT_SUSPENSION" || suspensionType === "FULL_SUSPENSION";
}

export function hasRearSuspension(suspensionType: string): boolean {
  return suspensionType === "FULL_SUSPENSION";
}

/**
 * Czech inflection for clicks:
 * 1 klik od zavřené polohy
 * 2, 3, 4 kliky od zavřené polohy
 * 5+ kliků od zavřené polohy
 */
export function formatClicksFromClosed(clicks: number | null | undefined): string {
  if (clicks === null || clicks === undefined) return "-";
  const abs = Math.abs(clicks);
  if (abs === 1) return "1 klik od zavřené polohy";
  if (abs >= 2 && abs <= 4) return `${abs} kliky od zavřené polohy`;
  return `${abs} kliků od zavřené polohy`;
}

interface TireSpecComponent {
  manufacturer: string;
  model: string;
  wheelDiameter?: string | null;
  tireWidth?: string | null;
  tireCasing?: string | null;
  tireCompound?: string | null;
}

/** Např. "Maxxis Minion DHR II 29"x2,4"" */
export function formatTireLabel(comp: TireSpecComponent): string {
  const size = comp.wheelDiameter && comp.tireWidth
    ? `${comp.wheelDiameter}x${comp.tireWidth}`
    : comp.tireWidth || comp.wheelDiameter || "";
  return [comp.manufacturer, comp.model, size].filter(Boolean).join(" ");
}

/** Např. "MAXX TERRA | MT/DD/TR" */
export function formatTireBadge(comp: TireSpecComponent): string | null {
  if (comp.tireCompound && comp.tireCasing) return `${comp.tireCompound} | ${comp.tireCasing}`;
  return comp.tireCompound || comp.tireCasing || null;
}
