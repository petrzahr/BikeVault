/**
 * Pure domain logic for BikeVault Maintenance & Service calculations.
 */

export type ServiceUrgency = "OVERDUE" | "DUE_SOON" | "OK";

export interface ServiceScheduleRule {
  intervalKm?: number | null;
  intervalHours?: number | null;
  intervalMonths?: number | null;
  conditionType?: "WHICHEVER_FIRST" | string;
  warningThresholdHours?: number | null;
  warningThresholdKm?: number | null;
  lastServiceDate?: Date | string | null;
  lastServiceBikeKm?: number | null;
  lastServiceBikeHours?: number | null;
}

export interface MaintenanceStatusResult {
  urgency: ServiceUrgency;
  remainingKm: number | null;
  remainingHours: number | null;
  remainingDays: number | null;
  nextTargetKm: number | null;
  nextTargetHours: number | null;
  nextTargetDate: Date | null;
  usageSinceKm: number;
  usageSinceHours: number;
  summaryTextCs: string;
}

export function evaluateServiceSchedule(
  schedule: ServiceScheduleRule,
  currentBikeKm: number,
  currentBikeMinutes: number,
  asOfDate: Date = new Date()
): MaintenanceStatusResult {
  const currentHours = Math.round((currentBikeMinutes / 60) * 10) / 10;
  const lastKm = schedule.lastServiceBikeKm ?? 0;
  const lastHours = schedule.lastServiceBikeHours ?? 0;

  const usageSinceKm = Math.max(0, Math.round((currentBikeKm - lastKm) * 10) / 10);
  const usageSinceHours = Math.max(0, Math.round((currentHours - lastHours) * 10) / 10);

  let remainingKm: number | null = null;
  let remainingHours: number | null = null;
  let remainingDays: number | null = null;

  let nextTargetKm: number | null = null;
  let nextTargetHours: number | null = null;
  let nextTargetDate: Date | null = null;

  let isOverdue = false;
  let isDueSoon = false;

  // 1. Kilometer interval
  if (schedule.intervalKm && schedule.intervalKm > 0) {
    nextTargetKm = Math.round((lastKm + schedule.intervalKm) * 10) / 10;
    remainingKm = Math.round((schedule.intervalKm - usageSinceKm) * 10) / 10;
    const thresholdKm = schedule.warningThresholdKm && schedule.warningThresholdKm > 0
      ? schedule.warningThresholdKm
      : Math.min(100, schedule.intervalKm * 0.15);

    if (remainingKm <= 0) {
      isOverdue = true;
    } else if (remainingKm <= thresholdKm) {
      isDueSoon = true;
    }
  }

  // 2. Hours interval
  if (schedule.intervalHours && schedule.intervalHours > 0) {
    nextTargetHours = Math.round((lastHours + schedule.intervalHours) * 10) / 10;
    remainingHours = Math.round((schedule.intervalHours - usageSinceHours) * 10) / 10;
    const thresholdHours = schedule.warningThresholdHours && schedule.warningThresholdHours > 0
      ? schedule.warningThresholdHours
      : Math.min(10, schedule.intervalHours * 0.15);

    if (remainingHours <= 0) {
      isOverdue = true;
    } else if (remainingHours <= thresholdHours) {
      isDueSoon = true;
    }
  }

  // 3. Months interval
  if (schedule.intervalMonths && schedule.intervalMonths > 0 && schedule.lastServiceDate) {
    const lastDate = new Date(schedule.lastServiceDate);
    const targetDate = new Date(lastDate);
    targetDate.setMonth(targetDate.getMonth() + schedule.intervalMonths);
    nextTargetDate = targetDate;

    const diffTime = targetDate.getTime() - asOfDate.getTime();
    remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (remainingDays <= 0) {
      isOverdue = true;
    } else if (remainingDays <= 14) {
      isDueSoon = true;
    }
  }

  const urgency: ServiceUrgency = isOverdue ? "OVERDUE" : isDueSoon ? "DUE_SOON" : "OK";

  // Build Czech summary text (e.g. "za 7 h", "143 km po termínu", "za 14 dní")
  let summaryTextCs = "";
  if (urgency === "OVERDUE") {
    if (remainingHours !== null && remainingHours <= 0) {
      summaryTextCs = `${Math.abs(remainingHours)} h po termínu`;
    } else if (remainingKm !== null && remainingKm <= 0) {
      summaryTextCs = `${Math.abs(remainingKm)} km po termínu`;
    } else if (remainingDays !== null && remainingDays <= 0) {
      summaryTextCs = `${Math.abs(remainingDays)} dní po termínu`;
    } else {
      summaryTextCs = "Po termínu";
    }
  } else if (urgency === "DUE_SOON" || urgency === "OK") {
    // Pick the most urgent non-null remaining metric
    const candidates: { text: string; ratio: number }[] = [];
    if (remainingHours !== null && schedule.intervalHours) {
      candidates.push({ text: `za ${remainingHours} h`, ratio: remainingHours / schedule.intervalHours });
    }
    if (remainingKm !== null && schedule.intervalKm) {
      candidates.push({ text: `za ${remainingKm} km`, ratio: remainingKm / schedule.intervalKm });
    }
    if (remainingDays !== null && schedule.intervalMonths) {
      candidates.push({ text: `za ${remainingDays} dní`, ratio: remainingDays / (schedule.intervalMonths * 30) });
    }

    candidates.sort((a, b) => a.ratio - b.ratio);
    summaryTextCs = candidates.length > 0 ? candidates[0].text : "V pořádku";
  }

  return {
    urgency,
    remainingKm,
    remainingHours,
    remainingDays,
    nextTargetKm,
    nextTargetHours,
    nextTargetDate,
    usageSinceKm,
    usageSinceHours,
    summaryTextCs,
  };
}
