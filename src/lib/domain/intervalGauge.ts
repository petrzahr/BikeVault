/**
 * Geometry for the interval gauge (a ruler showing service-interval usage).
 * Pure: takes a schedule rule and its evaluated status, returns positions in % of the ruler.
 */

import type { MaintenanceStatusResult, ServiceUrgency } from "./maintenance";

export interface IntervalGaugeRule {
  intervalKm?: number | null;
  intervalHours?: number | null;
  warningThresholdKm?: number | null;
  warningThresholdHours?: number | null;
}

export interface IntervalGaugeReading {
  unit: "km" | "h";
  used: number;
  interval: number;
  urgency: ServiceUrgency;
  /** Position of the current usage (pointer), 0–100 */
  usedPct: number;
  /** Position of the interval limit tick, 0–100 */
  limitPct: number;
  /** Start of the due-soon zone, 0–100 */
  warnPct: number;
}

const clampPct = (v: number) => Math.max(0, Math.min(100, Math.round(v * 10) / 10));

/**
 * Picks the km or hours interval that is closest to its limit (the one that drives the summary) and lays it out on
 * a ruler whose end leaves room past the limit, so an overdue pointer is still on the scale.
 * Returns null when the schedule has no km/hours interval (months-only schedules have no ruler).
 */
export function getIntervalGaugeReading(
  rule: IntervalGaugeRule,
  status: Pick<MaintenanceStatusResult, "urgency" | "usageSinceKm" | "usageSinceHours">
): IntervalGaugeReading | null {
  const candidates: { unit: "km" | "h"; used: number; interval: number; threshold: number }[] = [];

  if (rule.intervalKm && rule.intervalKm > 0) {
    const threshold = rule.warningThresholdKm && rule.warningThresholdKm > 0
      ? rule.warningThresholdKm
      : Math.min(100, rule.intervalKm * 0.15);
    candidates.push({ unit: "km", used: status.usageSinceKm, interval: rule.intervalKm, threshold });
  }
  if (rule.intervalHours && rule.intervalHours > 0) {
    const threshold = rule.warningThresholdHours && rule.warningThresholdHours > 0
      ? rule.warningThresholdHours
      : Math.min(10, rule.intervalHours * 0.15);
    candidates.push({ unit: "h", used: status.usageSinceHours, interval: rule.intervalHours, threshold });
  }
  if (candidates.length === 0) return null;

  // Highest used/interval ratio = closest to (or furthest past) its limit
  candidates.sort((a, b) => b.used / b.interval - a.used / a.interval);
  const { unit, used, interval, threshold } = candidates[0];

  const scaleMax = Math.max(interval * 1.2, used * 1.05);
  return {
    unit,
    used,
    interval,
    urgency: status.urgency,
    usedPct: clampPct((used / scaleMax) * 100),
    limitPct: clampPct((interval / scaleMax) * 100),
    warnPct: clampPct((Math.max(0, interval - threshold) / scaleMax) * 100),
  };
}
