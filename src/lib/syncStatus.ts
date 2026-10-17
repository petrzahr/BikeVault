import type { AppState, SyncStatus } from "@/context/VaultContext";

/**
 * Single source of the Drive sync state shown in the UI: every state has its own
 * icon (not just colour) and the same wording everywhere.
 */
export type SyncDisplayState = SyncStatus | "scopeInsufficient";
export type SyncTone = "busy" | "problem" | "pending" | "ok";

export const SYNC_LABELS: Record<SyncDisplayState, string> = {
  synced: "Synchronizováno",
  saving: "Synchronizuji změny",
  offline: "Čeká na připojení",
  error: "Chyba synchronizace",
  scopeInsufficient: "Chybí oprávnění",
};

export function getSyncDisplayState(status: SyncStatus, appState?: AppState): SyncDisplayState {
  if (appState === "scopeInsufficient" && status !== "saving") return "scopeInsufficient";
  return status;
}

export function getSyncTone(state: SyncDisplayState): SyncTone {
  if (state === "saving") return "busy";
  if (state === "error" || state === "scopeInsufficient") return "problem";
  if (state === "synced") return "ok";
  return "pending";
}
