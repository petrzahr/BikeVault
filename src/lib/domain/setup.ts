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

const toNumber = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/** Tyre pressure in bar converted to psi, 1 decimal; null when the value is missing or not a number. */
export function barToPsi(bar: number | string | null | undefined): number | null {
  const n = toNumber(bar);
  if (n === null || n < 0) return null;
  return Math.round(n * 14.5038 * 10) / 10;
}

/** SAG in millimetres from travel and SAG percentage, 1 decimal; null when either is missing or out of range. */
export function sagMm(travelMm: number | string | null | undefined, sagPercent: number | string | null | undefined): number | null {
  const travel = toNumber(travelMm);
  const sag = toNumber(sagPercent);
  if (travel === null || sag === null || travel <= 0 || sag < 0 || sag > 100) return null;
  return Math.round((travel * sag) / 10) / 10;
}

/**
 * Click stepper: applies +1/−1 to a form value kept as a string, never below 0.
 * An empty value starts from 0, so the first press is an explicit choice, never a silent default.
 */
export function stepClicks(current: string, delta: number): string {
  const n = toNumber(current) ?? 0;
  return String(Math.max(0, Math.round(n) + delta));
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
