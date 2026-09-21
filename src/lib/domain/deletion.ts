/**
 * Pure domain logic for deleting BikeVault data.
 * Every function takes the whole vault and returns a new vault with all related
 * records cleaned up, so no dangling references are left behind.
 */

import { BikeVaultData } from "@/types/vault";

export type BikeComponentsDisposition = "STORAGE" | "DELETE";

export interface DeletionResult {
  success: boolean;
  data: BikeVaultData;
  error?: string;
}

/**
 * Deletes a component together with its installations, its service schedules
 * and its purchase/sale transactions. Service events on bikes are kept (only unlinked
 * from the component), because they are part of the bike's history.
 */
export function deleteComponentFromData(data: BikeVaultData, componentId: string): BikeVaultData {
  const removedInstallationIds = new Set(
    data.componentInstallations.filter((i) => i.componentId === componentId).map((i) => i.id)
  );
  const removedScheduleIds = new Set(
    data.serviceSchedules.filter((s) => s.componentId === componentId).map((s) => s.id)
  );
  const unlinkInstallation = (id?: string | null) => (id && removedInstallationIds.has(id) ? null : id);

  return {
    ...data,
    components: data.components.filter((c) => c.id !== componentId),
    componentInstallations: data.componentInstallations.filter((i) => i.componentId !== componentId),
    serviceSchedules: data.serviceSchedules.filter((s) => s.componentId !== componentId),
    serviceEvents: data.serviceEvents.map((e) => ({
      ...e,
      componentId: e.componentId === componentId ? null : e.componentId,
      serviceScheduleId:
        e.serviceScheduleId && removedScheduleIds.has(e.serviceScheduleId) ? null : e.serviceScheduleId,
    })),
    financialTransactions: data.financialTransactions
      .filter((t) => !(t.componentId === componentId && !t.serviceEventId))
      .map((t) => (t.componentId === componentId ? { ...t, componentId: null } : t)),
    bikeSetups: data.bikeSetups.map((s) => ({
      ...s,
      forkInstallationId: unlinkInstallation(s.forkInstallationId),
      shockInstallationId: unlinkInstallation(s.shockInstallationId),
      frontTireInstallationId: unlinkInstallation(s.frontTireInstallationId),
      rearTireInstallationId: unlinkInstallation(s.rearTireInstallationId),
    })),
  };
}

/**
 * Deletes a bike with its whole history (odometer, installations, schedules, service events,
 * setups, snapshots, transactions).
 * Components currently installed on the bike are either returned to storage
 * or deleted completely, depending on `disposition`.
 */
export function deleteBikeFromData(
  data: BikeVaultData,
  bikeId: string,
  disposition: BikeComponentsDisposition = "STORAGE"
): BikeVaultData {
  const installedComponentIds = new Set(
    data.componentInstallations.filter((i) => i.bikeId === bikeId && !i.removedAt).map((i) => i.componentId)
  );

  let next = data;
  if (disposition === "DELETE") {
    for (const componentId of installedComponentIds) {
      next = deleteComponentFromData(next, componentId);
    }
  } else {
    const now = new Date().toISOString();
    next = {
      ...next,
      components: next.components.map((c) =>
        installedComponentIds.has(c.id) && c.status === "INSTALLED"
          ? { ...c, status: "IN_STORAGE", updatedAt: now }
          : c
      ),
    };
  }

  const survivingComponentIds = new Set(next.components.map((c) => c.id));
  const removedScheduleIds = new Set(
    next.serviceSchedules.filter((s) => s.bikeId === bikeId).map((s) => s.id)
  );

  return {
    ...next,
    bikes: next.bikes.filter((b) => b.id !== bikeId),
    odometerEntries: next.odometerEntries.filter((o) => o.bikeId !== bikeId),
    componentInstallations: next.componentInstallations.filter((i) => i.bikeId !== bikeId),
    serviceSchedules: next.serviceSchedules.filter((s) => s.bikeId !== bikeId),
    serviceEvents: next.serviceEvents
      .filter((e) => e.bikeId !== bikeId)
      .map((e) =>
        e.serviceScheduleId && removedScheduleIds.has(e.serviceScheduleId)
          ? { ...e, serviceScheduleId: null }
          : e
      ),
    bikeSetups: next.bikeSetups.filter((s) => s.bikeId !== bikeId),
    setupSnapshots: next.setupSnapshots.filter((s) => s.bikeId !== bikeId),
    // Component purchases/sales outlive the bike (the component itself survives in storage).
    financialTransactions: next.financialTransactions.flatMap((t) => {
      if (t.bikeId !== bikeId) return [t];
      const isComponentCost = t.componentId && !t.serviceEventId && survivingComponentIds.has(t.componentId);
      return isComponentCost ? [{ ...t, bikeId: null }] : [];
    }),
  };
}

/**
 * Deletes the most recent odometer entry of a bike and rolls the bike's counters back
 * to the previous entry. Older entries and the initial state cannot be deleted,
 * because later entries build on their values.
 */
export function deleteOdometerEntryFromData(data: BikeVaultData, entryId: string): DeletionResult {
  const fail = (error: string): DeletionResult => ({ success: false, data, error });

  const entry = data.odometerEntries.find((o) => o.id === entryId);
  if (!entry) return fail("Záznam tachometru nebyl nalezen.");
  if (entry.entryType === "INITIAL") return fail("Výchozí stav tachometru nelze smazat.");

  const bikeEntries = data.odometerEntries
    .filter((o) => o.bikeId === entry.bikeId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (bikeEntries[0]?.id !== entryId) {
    return fail("Lze smazat pouze poslední záznam tachometru. Starší záznamy jsou základem pro pozdější stavy.");
  }

  const previous = bikeEntries[1];
  if (!previous) return fail("Záznam nelze smazat, chybí předchozí stav tachometru.");

  const now = new Date().toISOString();
  return {
    success: true,
    data: {
      ...data,
      bikes: data.bikes.map((b) =>
        b.id === entry.bikeId
          ? { ...b, currentKm: previous.resultingKm, currentMinutes: previous.resultingMinutes, updatedAt: now }
          : b
      ),
      odometerEntries: data.odometerEntries.filter((o) => o.id !== entryId),
    },
  };
}

/**
 * Deletes a service event with its financial transaction and recomputes the
 * "last service" values of the linked schedule from the remaining events.
 */
export function deleteServiceEventFromData(data: BikeVaultData, eventId: string): BikeVaultData {
  const event = data.serviceEvents.find((e) => e.id === eventId);
  if (!event) return data;

  const remainingEvents = data.serviceEvents.filter((e) => e.id !== eventId);
  const scheduleId = event.serviceScheduleId;

  return {
    ...data,
    serviceEvents: remainingEvents,
    financialTransactions: data.financialTransactions.filter((t) => t.serviceEventId !== eventId),
    serviceSchedules: scheduleId
      ? data.serviceSchedules.map((s) => {
          if (s.id !== scheduleId) return s;
          const latest = remainingEvents
            .filter((e) => e.serviceScheduleId === scheduleId)
            .sort((a, b) => b.serviceDate.localeCompare(a.serviceDate) || b.createdAt.localeCompare(a.createdAt))[0];
          return {
            ...s,
            lastServiceDate: latest ? latest.serviceDate : null,
            lastServiceBikeKm: latest ? latest.bikeKm : null,
            lastServiceBikeHours: latest ? latest.bikeMinutes / 60 : null,
          };
        })
      : data.serviceSchedules,
  };
}

/**
 * Removes all user data (bikes, components and everything related) while keeping
 * component categories and user settings.
 */
export function clearVaultData(data: BikeVaultData): BikeVaultData {
  return {
    ...data,
    bikes: [],
    components: [],
    componentInstallations: [],
    odometerEntries: [],
    bikeSetups: [],
    setupSnapshots: [],
    serviceSchedules: [],
    serviceEvents: [],
    financialTransactions: [],
  };
}
