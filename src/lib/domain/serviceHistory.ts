/**
 * BikeVault — Domain logic for the bike service history ("Servisní kniha") rows.
 *
 * Joins flat ServiceEvent records with their component (via componentId) and
 * normalizes the price fields for display.
 */

import type { Component, ServiceEvent } from "../../types/vault";

export interface ServiceHistoryRow {
  event: ServiceEvent;
  component: Component | null;
  partsPrice: number;
  laborPrice: number;
  totalPrice: number;
}

export function toServiceHistoryRows(
  events: ServiceEvent[],
  components: Component[]
): ServiceHistoryRow[] {
  return events.map((event) => {
    const partsPrice = Number(event.partsPrice || 0);
    const laborPrice = Number(event.laborPrice || 0);
    const totalPrice = Number(event.totalPrice ?? partsPrice + laborPrice);
    const component = event.componentId
      ? components.find((c) => c.id === event.componentId) ?? null
      : null;

    return { event, component, partsPrice, laborPrice, totalPrice };
  });
}
