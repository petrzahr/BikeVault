"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";
import {
  BikeVaultData,
  Bike,
  Component,
  ComponentInstallation,
  ServiceSchedule,
  ServiceEvent,
  BikeSetup,
  SetupSnapshot,
  BikeOdometerEntry,
  FinancialTransaction,
  ComponentCategory,
  UserSettings,
} from "@/types/vault";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_SETTINGS,
} from "@/constants/defaultData";
import { getStoredAuth, isStoredTokenValid, fetchGoogleUserProfile } from "@/lib/google/googleAuth";
import type { GoogleUser } from "@/lib/google/googleAuth";
import {
  isDriveBackupEnabled,
  setDriveBackupEnabled as persistDriveBackupEnabled,
  tryRunDriveBackup,
} from "@/lib/google/driveBackup";
import { exportCorruptedRawData, getInitialData } from "@/lib/storage/storageService";
import { mergeBackupData, parseBackupForRestore } from "@/lib/storage/backupMerge";
import { useFeedback } from "@/components/common/Feedback";
import { isDevAuthBypassEnabled } from "@/lib/devAuthBypass";
import { recordOdometerSnapshot, calculateInstallationUsage } from "@/lib/domain/odometer";
import { compareMileage, compareRideTime, validateLinkConstraint, validateNewBikeGearId } from "@/lib/domain/stravaSync";
import { formatMinutes } from "@/lib/i18n";
import {
  BikeComponentsDisposition,
  deleteBikeFromData,
  deleteComponentFromData,
  deleteOdometerEntryFromData,
  deleteServiceEventFromData,
  clearVaultData,
} from "@/lib/domain/deletion";
import { evaluateServiceSchedule, MaintenanceStatusResult } from "@/lib/domain/maintenance";
import { findStorageReplacements } from "@/lib/domain/replacement";
import { getCategorySpecFields, makeSpecFieldKey } from "@/lib/bikeLists";
import {
  installComponent as installComponentInData,
  removeComponent as removeComponentInData,
  transferComponent as transferComponentInData,
  quickReplaceComponent as quickReplaceComponentInData,
} from "@/lib/domain/installations";

import { createVaultSyncLifecycle } from "@/lib/sync/vaultSyncLifecycle";
import type { SyncStatus, AppState, LogoutResult } from "@/lib/sync/vaultSyncLifecycle";
export type { SyncStatus, AppState, LogoutResult } from "@/lib/sync/vaultSyncLifecycle";

export interface EvaluatedServiceSchedule {
  schedule: ServiceSchedule;
  status: MaintenanceStatusResult;
  bike?: Bike | null;
  component?: Component | null;
}

interface VaultContextType {
  data: BikeVaultData;
  appState: AppState;
  syncStatus: SyncStatus;
  syncError: string | null;
  loadErrorDetail: string | null;
  user: GoogleUser | null;
  lastSyncedAt: Date | null;
  isLoaded: boolean;
  isAuthenticated: boolean;
  isInitialSyncDone: boolean;
  corruptedRawPayload: string | null;

  // Auth & Sync
  login: () => Promise<void>;
  logout: (opts?: { force?: boolean }) => Promise<LogoutResult>;
  reauthorizeGoogleDrive: () => Promise<void>;
  syncNow: () => Promise<void>;
  exportBackup: () => void;
  /** Add-only merge of a backup file into current data; saved to Drive by the regular autosave. */
  restoreBackup: (jsonContent: string) => boolean;
  exportCorruptedFile: () => void;
  // Automatic JSON snapshots into a visible Drive folder
  driveBackupEnabled: boolean;
  setDriveBackupEnabled: (enabled: boolean) => void;
  lastDriveBackupAt: Date | null;
  runDriveBackupNow: () => Promise<void>;

  // Bike actions
  addBike: (
    bike: Omit<Bike, "id" | "currentKm" | "currentMinutes" | "createdAt" | "updatedAt"> & {
      initialKm?: number;
      initialHours?: number;
      initialOdometerSource?: "MANUAL" | "STRAVA" | string;
    }
  ) => string;
  updateBike: (id: string, updates: Partial<Bike>) => void;
  reorderBikes: (orderedIds: string[]) => void;
  addCategory: (nameCs: string) => void;
  renameCategory: (id: string, nameCs: string) => void;
  deleteCategory: (id: string) => void;
  addCategorySpecField: (categoryId: string, label: string) => void;
  renameCategorySpecField: (categoryId: string, key: string, label: string) => void;
  deleteCategorySpecField: (categoryId: string, key: string) => void;
  moveCategorySpecField: (categoryId: string, key: string, direction: "UP" | "DOWN") => void;
  deleteBike: (id: string, disposition?: BikeComponentsDisposition) => void;
  deleteOdometerEntry: (entryId: string) => { success: boolean; error?: string };
  clearAllData: () => void;
  updateOdometer: (
    bikeId: string,
    newTotalKm: number,
    newTotalMinutes: number,
    recordedAt?: string,
    note?: string,
    allowCorrection?: boolean,
    source?: "MANUAL" | "STRAVA" | string
  ) => { success: boolean; error?: string };
  linkBikeToStrava: (
    bikeId: string,
    stravaGearId: string,
    updateMileage?: { stravaKm: number; stravaMinutes?: number | null }
  ) => { success: boolean; error?: string };
  unlinkBikeFromStrava: (bikeId: string) => { success: boolean };
  syncBikeFromStrava: (
    bikeId: string,
    stravaKm: number,
    stravaMinutes?: number | null
  ) => { success: boolean; type: "EQUAL" | "HIGHER" | "LOWER"; deltaKm: number; message: string };
  getBikeByStravaGearId: (stravaGearId: string) => Bike | undefined;
  getServiceScheduleStatuses: () => EvaluatedServiceSchedule[];

  // Component actions
  addComponent: (comp: Omit<Component, "id" | "status" | "createdAt" | "updatedAt">) => string;
  updateComponent: (id: string, updates: Partial<Component>) => void;
  retireComponent: (id: string) => void;
  deleteComponent: (id: string) => void;
  installComponent: (bikeId: string, componentId: string, slot: string) => void;
  removeComponent: (
    installationId: string,
    disposition: "IN_STORAGE" | "SOLD" | "DAMAGED" | "DISCARDED",
    salePrice?: number,
    saleDate?: string
  ) => void;
  transferComponent: (installationId: string, targetBikeId: string, targetSlot: string) => void;
  deleteInstallation: (installationId: string) => void;
  quickReplaceComponent: (bikeId: string, currentInstallationId: string, replacementComponentId: string) => void;

  // Service actions
  createServiceSchedule: (schedule: Omit<ServiceSchedule, "id" | "createdAt">) => string;
  updateServiceSchedule: (id: string, updates: Partial<ServiceSchedule>) => void;
  toggleServiceScheduleActive: (id: string) => void;
  deleteServiceSchedule: (id: string) => { success: boolean; message?: string };
  createServiceEvent: (event: Omit<ServiceEvent, "id" | "createdAt">) => string;
  deleteServiceEvent: (id: string) => void;

  // Setup actions
  saveSetup: (bikeId: string, updates: Partial<BikeSetup>) => void;
  saveSetupSnapshot: (bikeId: string, profileName: string, snapshotData: Record<string, unknown>, notes?: string) => string;
  deleteSetupSnapshot: (id: string) => void;

  // Finance actions
  addTransaction: (tx: Omit<FinancialTransaction, "id" | "createdAt">) => string;
  deleteTransaction: (id: string) => void;

  // Settings
  updateSettings: (updates: Partial<UserSettings>) => void;

  // Selectors & Getters
  getBike: (id: string) => Bike | undefined;
  getGarageBikes: (statusFilter?: string) => Bike[];
  getBikeInstalledComponents: (bikeId: string) => Array<{ installation: ComponentInstallation; component: Component; category: ComponentCategory }>;
  getStorageComponents: () => Array<{ component: Component; category: ComponentCategory }>;
  getAllComponents: (statusFilter?: string) => Array<{ component: Component; category: ComponentCategory; activeInstallation?: { installation: ComponentInstallation; bike: Bike } | null }>;
  getComponentById: (id: string) => {
    component: Component;
    category: ComponentCategory;
    activeInstallation?: { installation: ComponentInstallation; bike: Bike } | null;
    installationHistory: Array<{ installation: ComponentInstallation; bike: Bike }>;
  } | null;
  getBikeServiceSchedulesWithStatus: (bikeId: string) => Array<{ schedule: ServiceSchedule; status: MaintenanceStatusResult; bike: Bike; component?: Component | null }>;
  getAllConfiguredSchedulesWithStatus: () => EvaluatedServiceSchedule[];
  getBikeServiceEvents: (bikeId: string) => ServiceEvent[];
  getComponentServiceEvents: (componentId: string) => ServiceEvent[];
  getComponentServiceSchedules: (componentId: string) => Array<{ schedule: ServiceSchedule; status: MaintenanceStatusResult; bike?: Bike | null; component: Component }>;
  getBikeSetup: (bikeId: string) => BikeSetup | undefined;
  getBikeSnapshots: (bikeId: string) => SetupSnapshot[];
  getBikeHistory: (bikeId: string) => Array<{
    id: string;
    date: string;
    type: "ODOMETER" | "SERVICE" | "COMPONENT_INSTALL" | "COMPONENT_REMOVE" | "FINANCE" | "PURCHASE";
    title: string;
    description: string;
    details?: Record<string, unknown>;
  }>;
}

const VaultContext = createContext<VaultContextType | null>(null);

function generateId(prefix = "id"): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const { toast } = useFeedback();
  const lifecycleRef = useRef<ReturnType<typeof createVaultSyncLifecycle> | null>(null);
  if (!lifecycleRef.current) lifecycleRef.current = createVaultSyncLifecycle(getInitialData());
  const lifecycle = lifecycleRef.current;
  const [snapshot, setSnapshot] = useState(lifecycle.getState);
  const {
    data, appState, isLoaded, isAuthenticated, isInitialSyncDone, syncStatus,
    syncError, loadErrorDetail, corruptedRawPayload, user, lastSyncedAt, lastDriveBackupAt,
  } = snapshot;
  const [driveBackupEnabled, setDriveBackupEnabledState] = useState(true);

  useEffect(() => {
    setDriveBackupEnabledState(isDriveBackupEnabled());
    const unsubscribe = lifecycle.subscribe(setSnapshot);
    void lifecycle.initialize();
    return () => { unsubscribe(); lifecycle.dispose(); };
  }, [lifecycle]);

  const mutateData = useCallback((fn: (previous: BikeVaultData) => BikeVaultData) => {
    lifecycle.mutateData(fn);
  }, [lifecycle]);
  const { login, logout, reauthorizeGoogleDrive, syncNow } = lifecycle;

  const exportBackup = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = new Date().toISOString().split("T")[0];
    a.href = url;
    a.download = `bikevault_zaloha_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const setDriveBackupEnabled = useCallback((enabled: boolean) => {
    persistDriveBackupEnabled(enabled);
    setDriveBackupEnabledState(enabled);
  }, []);

  const runDriveBackupNow = async () => {
    const auth = getStoredAuth();
    if (isDevAuthBypassEnabled() || appState !== "ready" || !auth || !isStoredTokenValid()) {
      toast("Zálohu na Google Disk lze vytvořit až po načtení dat z Google Disku.", "error");
      return;
    }
    const session = lifecycle.getGeneration();
    const accountId = user?.permissionId ?? (await fetchGoogleUserProfile(auth.accessToken))?.permissionId;
    if (session !== lifecycle.getGeneration()) return;
    if (!accountId) {
      toast("Zálohu se nepodařilo vytvořit: nelze ověřit účet Google.", "error");
      return;
    }
    const result = await tryRunDriveBackup(auth.accessToken, accountId, data, { force: true });
    if (session !== lifecycle.getGeneration()) return;
    if (result.ran) {
      lifecycle.setLastDriveBackupAt(new Date());
      toast("Záloha byla uložena na Google Disk.", "success");
    } else {
      toast(`Zálohu se nepodařilo vytvořit: ${result.reason || "neznámá chyba"}`, "error");
    }
  };

  const exportCorruptedFile = () => {
    if (corruptedRawPayload) {
      exportCorruptedRawData(corruptedRawPayload);
    }
  };

  const restoreBackup = (jsonContent: string): boolean => {
    // DATA SAFETY: merge only into data loaded from Drive; the autosave write guards then persist it
    if (appState !== "ready") {
      toast("Obnovu ze zálohy lze spustit až po načtení dat z Google Disku.", "error");
      return false;
    }
    try {
      const backup = parseBackupForRestore(jsonContent);
      mutateData((prev) => mergeBackupData(prev, backup));
      return true;
    } catch (e) {
      toast("Chyba při obnově ze zálohy: " + (e instanceof Error ? e.message : String(e)), "error");
      return false;
    }
  };

  // --- BIKE MUTATIONS ---
  const addBike = (
    bikeData: Omit<Bike, "id" | "currentKm" | "currentMinutes" | "createdAt" | "updatedAt"> & {
      initialKm?: number;
      initialHours?: number;
      initialOdometerSource?: "MANUAL" | "STRAVA" | string;
    }
  ): string => {
    const gearValidation = validateNewBikeGearId(data.bikes, bikeData.stravaGearId);
    if (!gearValidation.valid) {
      throw new Error(gearValidation.error);
    }

    const bikeId = generateId("bike");
    const now = new Date().toISOString();
    const initialKm = Number(bikeData.initialKm || 0);
    const initialMinutes = Math.round(Number(bikeData.initialHours || 0) * 60);

    const newBike: Bike = {
      ...bikeData,
      id: bikeId,
      currentKm: initialKm,
      currentMinutes: initialMinutes,
      stravaGearId: bikeData.stravaGearId || null,
      createdAt: now,
      updatedAt: now,
    };

    const odoSource = bikeData.initialOdometerSource || (bikeData.stravaGearId ? "STRAVA" : "MANUAL");

    const initialOdo: BikeOdometerEntry = {
      id: generateId("odo"),
      bikeId,
      recordedAt: now,
      entryDate: bikeData.purchaseDate || now.split("T")[0],
      entryType: "INITIAL",
      source: odoSource,
      deltaKm: 0,
      deltaMinutes: 0,
      resultingKm: initialKm,
      resultingMinutes: initialMinutes,
      note: bikeData.stravaGearId ? "Výchozí stav ze Stravy" : "Výchozí stav tachometru",
      createdAt: now,
    };

    const newTx: FinancialTransaction[] = [];
    if (bikeData.purchasePrice && Number(bikeData.purchasePrice) > 0) {
      newTx.push({
        id: generateId("fin"),
        bikeId,
        type: "EXPENSE",
        category: "BIKE_PURCHASE",
        amount: Number(bikeData.purchasePrice),
        currency: bikeData.currency || "CZK",
        transactionDate: bikeData.purchaseDate || now.split("T")[0],
        notes: `Pořízení kola ${bikeData.manufacturer} ${bikeData.model}`,
        createdAt: now,
      });
    }

    const defaultSetup: BikeSetup = {
      id: generateId("setup"),
      bikeId,
      updatedAt: now,
    };

    mutateData((prev) => ({
      ...prev,
      bikes: [newBike, ...prev.bikes],
      odometerEntries: [initialOdo, ...prev.odometerEntries],
      financialTransactions: [...newTx, ...prev.financialTransactions],
      bikeSetups: [defaultSetup, ...prev.bikeSetups],
    }));

    return bikeId;
  };

  const updateBike = (id: string, updates: Partial<Bike>) => {
    mutateData((prev) => {
      const now = new Date().toISOString();
      const bikes = prev.bikes.map((b) => (b.id === id ? { ...b, ...updates, id: b.id, updatedAt: now } : b));
      const bike = bikes.find((b) => b.id === id);
      if (!bike || !("purchasePrice" in updates || "purchaseDate" in updates)) {
        return { ...prev, bikes };
      }

      // Udržuje transakci nákupu kola v souladu s jeho kupní cenou
      const price = Number(bike.purchasePrice || 0);
      const existing = prev.financialTransactions.find(
        (t) => t.bikeId === id && t.category === "BIKE_PURCHASE"
      );
      let financialTransactions = prev.financialTransactions;
      if (price <= 0) {
        financialTransactions = financialTransactions.filter((t) => t !== existing);
      } else if (existing) {
        financialTransactions = financialTransactions.map((t) =>
          t === existing
            ? { ...t, amount: price, transactionDate: bike.purchaseDate || t.transactionDate }
            : t
        );
      } else {
        financialTransactions = [
          {
            id: generateId("fin"),
            bikeId: id,
            type: "EXPENSE",
            category: "BIKE_PURCHASE",
            amount: price,
            currency: bike.currency || "CZK",
            transactionDate: bike.purchaseDate || now.split("T")[0],
            notes: `Pořízení kola ${bike.manufacturer} ${bike.model}`,
            createdAt: now,
          },
          ...financialTransactions,
        ];
      }

      return { ...prev, bikes, financialTransactions };
    });
  };

  // Přeřadí kola z orderedIds do daného pořadí; ostatní kola (jiné záložky) zůstanou na svých pozicích.
  const reorderBikes = (orderedIds: string[]) => {
    mutateData((prev) => {
      const byId = new Map(prev.bikes.map((b) => [b.id, b]));
      const queue = orderedIds.filter((id) => byId.has(id));
      const inGroup = new Set(queue);
      let next = 0;
      return {
        ...prev,
        bikes: prev.bikes.map((b) => (inGroup.has(b.id) ? byId.get(queue[next++])! : b)),
      };
    });
  };

  const addCategory = (nameCs: string) => {
    const name = nameCs.trim();
    if (!name) return;
    mutateData((prev) => {
      const slug =
        name
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "") || "CUSTOM";
      let code = slug;
      let i = 2;
      while (prev.categories.some((c) => c.code === code)) code = `${slug}_${i++}`;
      const category: ComponentCategory = {
        id: `cat-custom-${code.toLowerCase()}`,
        code,
        nameCs: name,
        nameEn: name,
        defaultSlot: code,
        isSystem: false,
        sortOrder: 50,
      };
      return { ...prev, categories: [...prev.categories, category] };
    });
  };

  const renameCategory = (id: string, nameCs: string) => {
    const name = nameCs.trim();
    if (!name) return;
    mutateData((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c.id === id ? { ...c, nameCs: name, nameEn: c.isSystem ? c.nameEn : name } : c)),
    }));
  };

  // Systémové kategorie a kategorie používané komponentem nelze smazat.
  const deleteCategory = (id: string) => {
    mutateData((prev) => {
      const category = prev.categories.find((c) => c.id === id);
      if (!category || category.isSystem) return prev;
      if (prev.components.some((comp) => comp.categoryId === id)) return prev;
      return { ...prev, categories: prev.categories.filter((c) => c.id !== id) };
    });
  };

  const addCategorySpecField = (categoryId: string, label: string) => {
    const name = label.trim();
    if (!name) return;
    mutateData((prev) => {
      const category = prev.categories.find((c) => c.id === categoryId);
      if (!category) return prev;
      const existing = getCategorySpecFields(category);
      const key = makeSpecFieldKey(name, existing);
      const specFields = [...existing, { key, label: name }];
      return {
        ...prev,
        categories: prev.categories.map((c) => (c.id === categoryId ? { ...c, specFields } : c)),
      };
    });
  };

  const renameCategorySpecField = (categoryId: string, key: string, label: string) => {
    const name = label.trim();
    if (!name) return;
    mutateData((prev) => {
      const category = prev.categories.find((c) => c.id === categoryId);
      if (!category) return prev;
      const specFields = getCategorySpecFields(category).map((f) => (f.key === key ? { ...f, label: name } : f));
      return {
        ...prev,
        categories: prev.categories.map((c) => (c.id === categoryId ? { ...c, specFields } : c)),
      };
    });
  };

  const deleteCategorySpecField = (categoryId: string, key: string) => {
    mutateData((prev) => {
      const category = prev.categories.find((c) => c.id === categoryId);
      if (!category) return prev;
      const specFields = getCategorySpecFields(category).filter((f) => f.key !== key);
      return {
        ...prev,
        categories: prev.categories.map((c) => (c.id === categoryId ? { ...c, specFields } : c)),
      };
    });
  };

  const moveCategorySpecField = (categoryId: string, key: string, direction: "UP" | "DOWN") => {
    mutateData((prev) => {
      const category = prev.categories.find((c) => c.id === categoryId);
      if (!category) return prev;
      const existing = getCategorySpecFields(category);
      const index = existing.findIndex((f) => f.key === key);
      const targetIndex = direction === "UP" ? index - 1 : index + 1;
      if (index === -1 || targetIndex < 0 || targetIndex >= existing.length) return prev;
      const specFields = [...existing];
      [specFields[index], specFields[targetIndex]] = [specFields[targetIndex], specFields[index]];
      return {
        ...prev,
        categories: prev.categories.map((c) => (c.id === categoryId ? { ...c, specFields } : c)),
      };
    });
  };

  const deleteBike = (id: string, disposition: BikeComponentsDisposition = "STORAGE") => {
    mutateData((prev) => deleteBikeFromData(prev, id, disposition));
  };

  const deleteComponent = (id: string) => {
    mutateData((prev) => deleteComponentFromData(prev, id));
  };

  const deleteOdometerEntry = (entryId: string): { success: boolean; error?: string } => {
    const result = deleteOdometerEntryFromData(data, entryId);
    if (!result.success) return { success: false, error: result.error };
    mutateData((prev) => deleteOdometerEntryFromData(prev, entryId).data);
    return { success: true };
  };

  const deleteServiceEvent = (id: string) => {
    mutateData((prev) => deleteServiceEventFromData(prev, id));
  };

  const clearAllData = () => {
    mutateData((prev) => clearVaultData(prev));
  };

  const updateOdometer = (
    bikeId: string,
    newTotalKm: number,
    newTotalMinutes: number,
    recordedAt?: string,
    note?: string,
    allowCorrection = false,
    source: "MANUAL" | "STRAVA" | string = "MANUAL"
  ): { success: boolean; error?: string } => {
    const bike = data.bikes.find((b) => b.id === bikeId);
    if (!bike) return { success: false, error: "Kolo nebylo nalezeno" };

    const entryDate = (recordedAt || new Date().toISOString()).split("T")[0];

    try {
      const snapshot = recordOdometerSnapshot(
        { currentKm: Number(bike.currentKm), currentMinutes: bike.currentMinutes },
        {
          totalKm: newTotalKm,
          totalMinutes: newTotalMinutes,
          entryDate,
          note,
          allowCorrection,
        }
      );

      const now = new Date().toISOString();
      const newEntry: BikeOdometerEntry = {
        id: generateId("odo"),
        bikeId,
        recordedAt: recordedAt || now,
        entryDate,
        entryType: snapshot.isCorrection ? "CORRECTION" : "RIDE",
        source,
        deltaKm: snapshot.deltaKm,
        deltaMinutes: snapshot.deltaMinutes,
        resultingKm: snapshot.resultingKm,
        resultingMinutes: snapshot.resultingMinutes,
        note: note || (source === "STRAVA" ? "Synchronizace se Stravou" : snapshot.isCorrection ? "Korekce stavu tachometru" : undefined),
        createdAt: now,
      };

      mutateData((prev) => ({
        ...prev,
        bikes: prev.bikes.map((b) =>
          b.id === bikeId
            ? {
                ...b,
                currentKm: snapshot.resultingKm,
                currentMinutes: snapshot.resultingMinutes,
                updatedAt: now,
              }
            : b
        ),
        odometerEntries: [newEntry, ...prev.odometerEntries],
      }));

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Chyba při záznamu tachometru";
      return { success: false, error: msg };
    }
  };

  // --- STRAVA ACTIONS ---
  const getBikeByStravaGearId = (stravaGearId: string): Bike | undefined => {
    return data.bikes.find((b) => b.stravaGearId === stravaGearId.trim());
  };

  const linkBikeToStrava = (
    bikeId: string,
    stravaGearId: string,
    updateMileage?: { stravaKm: number; stravaMinutes?: number | null }
  ): { success: boolean; error?: string } => {
    const validation = validateLinkConstraint(data.bikes, bikeId, stravaGearId);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const bike = data.bikes.find((b) => b.id === bikeId);
    if (!bike) {
      return { success: false, error: "Kolo nebylo nalezeno." };
    }

    const now = new Date().toISOString();

    // If initial update was requested, raise km / ride time to Strava values (never decreases)
    if (updateMileage && updateMileage.stravaKm !== undefined) {
      syncBikeFromStrava(bikeId, updateMileage.stravaKm, updateMileage.stravaMinutes, "Propojení se Stravou");
    }

    // Update bike's stravaGearId
    mutateData((prev) => ({
      ...prev,
      bikes: prev.bikes.map((b) =>
        b.id === bikeId ? { ...b, stravaGearId: stravaGearId.trim(), updatedAt: now } : b
      ),
    }));

    return { success: true };
  };

  const unlinkBikeFromStrava = (bikeId: string): { success: boolean } => {
    mutateData((prev) => ({
      ...prev,
      bikes: prev.bikes.map((b) =>
        b.id === bikeId ? { ...b, stravaGearId: null, updatedAt: new Date().toISOString() } : b
      ),
    }));
    return { success: true };
  };

  const syncBikeFromStrava = (
    bikeId: string,
    stravaKm: number,
    stravaMinutes?: number | null,
    notePrefix = "Synchronizace se Stravou"
  ): { success: boolean; type: "EQUAL" | "HIGHER" | "LOWER"; deltaKm: number; message: string } => {
    const bike = data.bikes.find((b) => b.id === bikeId);
    if (!bike) {
      return { success: false, type: "EQUAL", deltaKm: 0, message: "Kolo v BikeVault nebylo nalezeno." };
    }

    const comparison = compareMileage(bike.currentKm, stravaKm);
    const time =
      stravaMinutes !== null && stravaMinutes !== undefined
        ? compareRideTime(bike.currentMinutes, stravaMinutes)
        : null;

    // CRITICAL: NEVER automatically decrease mileage or ride time — each value moves only upwards.
    const kmUp = comparison.type === "HIGHER";
    const timeUp = time?.type === "HIGHER";
    const timeLowerNote =
      time?.type === "LOWER"
        ? ` Strava uvádí méně hodin než BikeVault (${formatMinutes(time.stravaMinutes)} vs. ${formatMinutes(time.bikeVaultMinutes)}), hodiny nebudou sníženy.`
        : "";

    if (!kmUp && !timeUp) {
      if (comparison.type === "LOWER") {
        return { success: false, type: "LOWER", deltaKm: comparison.deltaKm, message: comparison.message + timeLowerNote };
      }
      if (time?.type === "LOWER") {
        return { success: false, type: "LOWER", deltaKm: 0, message: `Nájezd je aktuální.${timeLowerNote}` };
      }
      return { success: true, type: "EQUAL", deltaKm: 0, message: "Nájezd je aktuální." };
    }

    const changes = [
      kmUp ? `+${comparison.deltaKm} km` : null,
      timeUp ? `+${formatMinutes(time.deltaMinutes)}` : null,
    ].filter(Boolean).join(", ");

    const res = updateOdometer(
      bikeId,
      kmUp ? comparison.stravaKm : Number(bike.currentKm),
      timeUp ? time.stravaMinutes : bike.currentMinutes,
      new Date().toISOString(),
      `${notePrefix} (${changes})`,
      false,
      "STRAVA"
    );

    if (!res.success) {
      return {
        success: false,
        type: "HIGHER",
        deltaKm: comparison.deltaKm,
        message: res.error || "Chyba při ukládání odečtu ze Stravy.",
      };
    }

    const updated = [
      kmUp ? `nájezd na ${comparison.stravaKm} km` : null,
      timeUp ? `čas jízdy na ${formatMinutes(time.stravaMinutes)}` : null,
    ].filter(Boolean).join(" a ");
    const lowerNote = comparison.type === "LOWER" ? ` ${comparison.message}` : timeLowerNote;

    return {
      success: true,
      type: comparison.type === "LOWER" || time?.type === "LOWER" ? "LOWER" : "HIGHER",
      deltaKm: kmUp ? comparison.deltaKm : 0,
      message: `Úspěšně aktualizován ${updated} (${changes}).${lowerNote}`,
    };
  };

  // --- COMPONENT MUTATIONS ---
  const addComponent = (compData: Omit<Component, "id" | "status" | "createdAt" | "updatedAt">): string => {
    const compId = generateId("comp");
    const now = new Date().toISOString();

    const newComp: Component = {
      ...compData,
      id: compId,
      status: "IN_STORAGE",
      createdAt: now,
      updatedAt: now,
    };

    const newTx: FinancialTransaction[] = [];
    if (compData.purchasePrice && Number(compData.purchasePrice) > 0) {
      newTx.push({
        id: generateId("fin"),
        componentId: compId,
        type: "EXPENSE",
        category: "COMPONENT_PURCHASE",
        amount: Number(compData.purchasePrice),
        currency: compData.currency || "CZK",
        transactionDate: compData.purchaseDate || now.split("T")[0],
        notes: `Nákup komponentu ${compData.manufacturer} ${compData.model}`,
        createdAt: now,
      });
    }

    mutateData((prev) => ({
      ...prev,
      components: [newComp, ...prev.components],
      financialTransactions: [...newTx, ...prev.financialTransactions],
    }));

    return compId;
  };

  const updateComponent = (id: string, updates: Partial<Component>) => {
    mutateData((prev) => {
      const now = new Date().toISOString();
      const components = prev.components.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: now } : c));
      const comp = components.find((c) => c.id === id);
      if (!comp || !("purchasePrice" in updates || "purchaseDate" in updates)) {
        return { ...prev, components };
      }

      // Udržuje transakci nákupu komponenty v souladu s její cenou
      const price = Number(comp.purchasePrice || 0);
      const existing = prev.financialTransactions.find(
        (t) => t.componentId === id && t.category === "COMPONENT_PURCHASE"
      );
      let financialTransactions = prev.financialTransactions;
      if (price <= 0) {
        financialTransactions = financialTransactions.filter((t) => t !== existing);
      } else if (existing) {
        financialTransactions = financialTransactions.map((t) =>
          t === existing
            ? { ...t, amount: price, transactionDate: comp.purchaseDate || t.transactionDate }
            : t
        );
      } else {
        financialTransactions = [
          {
            id: generateId("fin"),
            componentId: id,
            type: "EXPENSE",
            category: "COMPONENT_PURCHASE",
            amount: price,
            currency: comp.currency || "CZK",
            transactionDate: comp.purchaseDate || now.split("T")[0],
            notes: `Nákup komponentu ${comp.manufacturer} ${comp.model}`,
            createdAt: now,
          },
          ...financialTransactions,
        ];
      }

      return { ...prev, components, financialTransactions };
    });
  };

  const retireComponent = (id: string) => {
    mutateData((prev) => ({
      ...prev,
      components: prev.components.map((c) => (c.id === id ? { ...c, status: "DISCARDED", updatedAt: new Date().toISOString() } : c)),
    }));
  };

  // Preflight preserves synchronous UI errors; re-evaluate against the latest state.
  const applyInstallationOperation = (operation: (current: BikeVaultData) => BikeVaultData) => {
    const next = operation(data);
    mutateData((prev) => prev === data ? next : operation(prev));
  };

  const installComponent = (bikeId: string, componentId: string, slot: string) => {
    const runtime = { now: new Date().toISOString(), id: generateId("inst") };
    applyInstallationOperation((current) => installComponentInData(current, runtime, bikeId, componentId, slot));
  };

  const removeComponent = (
    installationId: string,
    disposition: "IN_STORAGE" | "SOLD" | "DAMAGED" | "DISCARDED",
    salePrice?: number,
    saleDate?: string
  ) => {
    const runtime = { now: new Date().toISOString(), id: generateId("fin") };
    applyInstallationOperation((current) => removeComponentInData(current, runtime, installationId, disposition, salePrice, saleDate));
  };

  // Oprava chybného záznamu: montáž zmizí z historie, jako by nikdy neproběhla.
  // Aktivní montáž vrátí díl do skladu.
  const deleteInstallation = (installationId: string) => {
    mutateData((prev) => {
      const inst = prev.componentInstallations.find((i) => i.id === installationId);
      if (!inst) return prev;
      const now = new Date().toISOString();
      return {
        ...prev,
        componentInstallations: prev.componentInstallations.filter((i) => i.id !== installationId),
        components: inst.removedAt
          ? prev.components
          : prev.components.map((c) =>
              c.id === inst.componentId ? { ...c, status: "IN_STORAGE" as const, updatedAt: now } : c
            ),
      };
    });
  };

  const transferComponent = (installationId: string, targetBikeId: string, targetSlot: string) => {
    const runtime = { now: new Date().toISOString(), id: generateId("inst") };
    applyInstallationOperation((current) => transferComponentInData(current, runtime, installationId, targetBikeId, targetSlot));
  };

  const quickReplaceComponent = (
    bikeId: string,
    currentInstallationId: string,
    replacementComponentId: string
  ) => {
    const runtime = { now: new Date().toISOString(), id: generateId("inst") };
    applyInstallationOperation((current) => quickReplaceComponentInData(current, runtime, bikeId, currentInstallationId, replacementComponentId));
  };

  // --- SERVICE MUTATIONS ---
  const createServiceSchedule = (schedule: Omit<ServiceSchedule, "id" | "createdAt">): string => {
    const id = generateId("sched");
    const newSched: ServiceSchedule = {
      ...schedule,
      id,
      createdAt: new Date().toISOString(),
    };
    mutateData((prev) => ({
      ...prev,
      serviceSchedules: [newSched, ...prev.serviceSchedules],
    }));
    return id;
  };

  const updateServiceSchedule = (id: string, updates: Partial<ServiceSchedule>) => {
    mutateData((prev) => ({
      ...prev,
      serviceSchedules: prev.serviceSchedules.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    }));
  };

  const toggleServiceScheduleActive = (id: string) => {
    mutateData((prev) => ({
      ...prev,
      serviceSchedules: prev.serviceSchedules.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s)),
    }));
  };

  const deleteServiceSchedule = (id: string): { success: boolean; message?: string } => {
    const hasEvents = data.serviceEvents.some((e) => e.serviceScheduleId === id);
    if (hasEvents) {
      return {
        success: false,
        message: "Tento plán nelze smazat, protože již obsahuje historické servisní záznamy. Použijte místo toho Deaktivovat.",
      };
    }
    mutateData((prev) => ({
      ...prev,
      serviceSchedules: prev.serviceSchedules.filter((s) => s.id !== id),
    }));
    return { success: true };
  };

  const createServiceEvent = (event: Omit<ServiceEvent, "id" | "createdAt">): string => {
    const id = generateId("se");
    const now = new Date().toISOString();

    const newEvent: ServiceEvent = {
      ...event,
      id,
      createdAt: now,
    };

    const newTx: FinancialTransaction[] = [];
    if (event.totalPrice && Number(event.totalPrice) > 0) {
      newTx.push({
        id: generateId("fin"),
        bikeId: event.bikeId,
        componentId: event.componentId || undefined,
        serviceEventId: id,
        type: "EXPENSE",
        category: "SERVICE_PARTS",
        amount: Number(event.totalPrice),
        currency: event.currency || "CZK",
        transactionDate: event.serviceDate,
        notes: `Servis: ${event.description}`,
        createdAt: now,
      });
    }

    mutateData((prev) => ({
      ...prev,
      serviceEvents: [newEvent, ...prev.serviceEvents],
      financialTransactions: [...newTx, ...prev.financialTransactions],
      serviceSchedules: event.serviceScheduleId
        ? prev.serviceSchedules.map((s) =>
            s.id === event.serviceScheduleId
              ? {
                  ...s,
                  lastServiceDate: event.serviceDate,
                  lastServiceBikeKm: event.bikeKm,
                  lastServiceBikeHours: event.bikeMinutes / 60,
                }
              : s
          )
        : prev.serviceSchedules,
    }));

    return id;
  };

  // --- SETUP MUTATIONS ---
  const saveSetup = (bikeId: string, updates: Partial<BikeSetup>) => {
    const now = new Date().toISOString();
    mutateData((prev) => {
      const existing = prev.bikeSetups.find((s) => s.bikeId === bikeId);
      if (existing) {
        return {
          ...prev,
          bikeSetups: prev.bikeSetups.map((s) => (s.bikeId === bikeId ? { ...s, ...updates, updatedAt: now } : s)),
        };
      }
      const newSetup: BikeSetup = {
        id: generateId("setup"),
        bikeId,
        ...updates,
        updatedAt: now,
      };
      return {
        ...prev,
        bikeSetups: [newSetup, ...prev.bikeSetups],
      };
    });
  };

  const saveSetupSnapshot = (
    bikeId: string,
    profileName: string,
    snapshotData: Record<string, unknown>,
    notes?: string
  ): string => {
    const id = generateId("snap");
    const newSnap: SetupSnapshot = {
      id,
      bikeId,
      profileName,
      snapshotData,
      notes,
      createdAt: new Date().toISOString(),
    };
    mutateData((prev) => ({
      ...prev,
      setupSnapshots: [newSnap, ...prev.setupSnapshots],
    }));
    return id;
  };

  const deleteSetupSnapshot = (id: string) => {
    mutateData((prev) => ({
      ...prev,
      setupSnapshots: prev.setupSnapshots.filter((s) => s.id !== id),
    }));
  };

  // --- FINANCE MUTATIONS ---
  const addTransaction = (tx: Omit<FinancialTransaction, "id" | "createdAt">): string => {
    const id = generateId("fin");
    const newTx: FinancialTransaction = {
      ...tx,
      id,
      createdAt: new Date().toISOString(),
    };
    mutateData((prev) => ({
      ...prev,
      financialTransactions: [newTx, ...prev.financialTransactions],
    }));
    return id;
  };

  const deleteTransaction = (id: string) => {
    mutateData((prev) => ({
      ...prev,
      financialTransactions: prev.financialTransactions.filter((t) => t.id !== id),
    }));
  };

  const updateSettings = (updates: Partial<UserSettings>) => {
    mutateData((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...updates },
    }));
  };

  // --- SELECTORS & GETTERS ---
  const getBike = (id: string) => data.bikes.find((b) => b.id === id);

  const getGarageBikes = (statusFilter?: string) => {
    if (!statusFilter) return data.bikes;
    return data.bikes.filter((b) => b.status === statusFilter);
  };

  const getBikeInstalledComponents = (bikeId: string) => {
    const installations = data.componentInstallations.filter((i) => i.bikeId === bikeId && !i.removedAt);
    return installations
      .map((inst) => {
        const comp = data.components.find((c) => c.id === inst.componentId);
        const cat = data.categories.find((cat) => cat.id === comp?.categoryId);
        if (!comp || !cat) return null;
        return { installation: inst, component: comp, category: cat };
      })
      .filter(Boolean)
      .sort((a, b) => (a!.category.sortOrder || 0) - (b!.category.sortOrder || 0)) as Array<{
      installation: ComponentInstallation;
      component: Component;
      category: ComponentCategory;
    }>;
  };

  const getStorageComponents = () => {
    const inStorage = data.components.filter((c) => c.status === "IN_STORAGE");
    return inStorage
      .map((comp) => {
        const cat = data.categories.find((cat) => cat.id === comp.categoryId);
        if (!cat) return null;
        return { component: comp, category: cat };
      })
      .filter(Boolean) as Array<{ component: Component; category: ComponentCategory }>;
  };

  const getAllComponents = (statusFilter?: string) => {
    const list = statusFilter ? data.components.filter((c) => c.status === statusFilter) : data.components;
    return list.map((comp) => {
      const cat = data.categories.find((c) => c.id === comp.categoryId) || DEFAULT_CATEGORIES[0];
      const activeInst = data.componentInstallations.find((i) => i.componentId === comp.id && !i.removedAt);
      const activeBike = activeInst ? data.bikes.find((b) => b.id === activeInst.bikeId) : null;
      return {
        component: comp,
        category: cat,
        activeInstallation: activeInst && activeBike ? { installation: activeInst, bike: activeBike } : null,
      };
    });
  };

  const getComponentById = (id: string) => {
    const comp = data.components.find((c) => c.id === id);
    if (!comp) return null;
    const cat = data.categories.find((c) => c.id === comp.categoryId) || DEFAULT_CATEGORIES[0];
    const activeInst = data.componentInstallations.find((i) => i.componentId === id && !i.removedAt);
    const activeBike = activeInst ? data.bikes.find((b) => b.id === activeInst.bikeId) : null;

    const history = data.componentInstallations
      .filter((i) => i.componentId === id)
      .map((inst) => ({
        installation: inst,
        bike: data.bikes.find((b) => b.id === inst.bikeId)!,
      }))
      .filter((h) => !!h.bike)
      .sort((a, b) => new Date(b.installation.installedAt).getTime() - new Date(a.installation.installedAt).getTime());

    return {
      component: comp,
      category: cat,
      activeInstallation: activeInst && activeBike ? { installation: activeInst, bike: activeBike } : null,
      installationHistory: history,
    };
  };

  const getBikeServiceSchedulesWithStatus = (bikeId: string) => {
    const bike = data.bikes.find((b) => b.id === bikeId);
    if (!bike) return [];

    const installed = data.componentInstallations.filter((i) => i.bikeId === bikeId && !i.removedAt);
    const installedCompIds = new Set(installed.map((i) => i.componentId));

    const schedules = data.serviceSchedules.filter(
      (s) => s.bikeId === bikeId || (s.componentId && installedCompIds.has(s.componentId))
    );

    return schedules.map((schedule) => {
      const status = evaluateServiceSchedule(schedule, bike.currentKm, bike.currentMinutes);
      const comp = schedule.componentId ? data.components.find((c) => c.id === schedule.componentId) : null;
      return {
        schedule,
        status,
        bike,
        component: comp,
      };
    });
  };

  const getAllConfiguredSchedulesWithStatus = () => {
    return data.serviceSchedules.map((schedule) => {
      const bike = schedule.bikeId ? data.bikes.find((b) => b.id === schedule.bikeId) : null;
      const comp = schedule.componentId ? data.components.find((c) => c.id === schedule.componentId) : null;
      const curKm = bike ? bike.currentKm : 0;
      const curMin = bike ? bike.currentMinutes : 0;
      const status = evaluateServiceSchedule(schedule, curKm, curMin);
      return {
        schedule,
        status,
        bike,
        component: comp,
      };
    });
  };

  const getBikeServiceEvents = (bikeId: string) => {
    return data.serviceEvents
      .filter((e) => e.bikeId === bikeId)
      .sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime());
  };

  const getComponentServiceEvents = (componentId: string) => {
    return data.serviceEvents
      .filter((e) => e.componentId === componentId)
      .sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime());
  };

  const getComponentServiceSchedules = (componentId: string) => {
    const comp = data.components.find((c) => c.id === componentId);
    if (!comp) return [];
    const activeInst = data.componentInstallations.find((i) => i.componentId === componentId && !i.removedAt);
    const bike = activeInst ? data.bikes.find((b) => b.id === activeInst.bikeId) : null;
    const curKm = bike ? bike.currentKm : 0;
    const curMin = bike ? bike.currentMinutes : 0;

    return data.serviceSchedules
      .filter((s) => s.componentId === componentId)
      .map((schedule) => ({
        schedule,
        status: evaluateServiceSchedule(schedule, curKm, curMin),
        bike,
        component: comp,
      }));
  };

  const getBikeSetup = (bikeId: string) => data.bikeSetups.find((s) => s.bikeId === bikeId);

  const getBikeSnapshots = (bikeId: string) => {
    return data.setupSnapshots
      .filter((s) => s.bikeId === bikeId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const getBikeHistory = (bikeId: string) => {
    const bike = data.bikes.find((b) => b.id === bikeId);
    if (!bike) return [];

    const history: Array<{
      id: string;
      date: string;
      type: "ODOMETER" | "SERVICE" | "COMPONENT_INSTALL" | "COMPONENT_REMOVE" | "FINANCE" | "PURCHASE";
      title: string;
      description: string;
      details?: Record<string, unknown>;
    }> = [];

    // Purchase
    history.push({
      id: `purchase-${bike.id}`,
      date: bike.purchaseDate,
      type: "PURCHASE",
      title: "Pořízení kola",
      description: `Pořízení ${bike.manufacturer} ${bike.model} za ${Number(bike.purchasePrice).toLocaleString("cs-CZ")} ${bike.currency}`,
    });

    // Odometer
    data.odometerEntries
      .filter((o) => o.bikeId === bikeId)
      .forEach((o) => {
        history.push({
          id: o.id,
          date: o.entryDate,
          type: "ODOMETER",
          title: o.entryType === "INITIAL" ? "Výchozí stav počítadla" : o.entryType === "CORRECTION" ? "Korekce počítadla" : "Odečet počítadla",
          description: `Stav: ${o.resultingKm.toFixed(1)} km / ${(o.resultingMinutes / 60).toFixed(1)} h (${o.deltaKm >= 0 ? "+" : ""}${o.deltaKm.toFixed(1)} km)`,
          details: { note: o.note },
        });
      });

    // Service events
    data.serviceEvents
      .filter((e) => e.bikeId === bikeId)
      .forEach((e) => {
        history.push({
          id: e.id,
          date: e.serviceDate,
          type: "SERVICE",
          title: `Servisní úkon: ${e.description}`,
          description: `Cena: ${e.totalPrice.toLocaleString("cs-CZ")} ${e.currency} (${e.performedBy === "SELF" ? "svépomocí" : e.shopName || "servis"})`,
          details: { notes: e.notes },
        });
      });

    // Installations
    data.componentInstallations
      .filter((i) => i.bikeId === bikeId)
      .forEach((i) => {
        const comp = data.components.find((c) => c.id === i.componentId);
        const name = comp ? `${comp.manufacturer} ${comp.model}` : "Komponent";
        history.push({
          id: `inst-${i.id}`,
          date: i.installedAt.split("T")[0],
          type: "COMPONENT_INSTALL",
          title: `Montáž: ${name}`,
          description: `Osazeno do slotu ${i.slot} při stavu kola ${i.installedBikeKm.toFixed(1)} km`,
        });
        if (i.removedAt) {
          history.push({
            id: `rem-${i.id}`,
            date: i.removedAt.split("T")[0],
            type: "COMPONENT_REMOVE",
            title: `Demontáž: ${name}`,
            description: `Demontováno při stavu kola ${(i.removedBikeKm || 0).toFixed(1)} km`,
          });
        }
      });

    // Financial
    data.financialTransactions
      .filter((t) => t.bikeId === bikeId && t.category !== "BIKE_PURCHASE")
      .forEach((t) => {
        history.push({
          id: t.id,
          date: t.transactionDate,
          type: "FINANCE",
          title: t.type === "EXPENSE" ? "Výdaj na kolo" : "Příjem z kola",
          description: `${t.notes || t.category}: ${t.amount.toLocaleString("cs-CZ")} ${t.currency}`,
        });
      });

    return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const value: VaultContextType = {
    data,
    appState,
    syncStatus,
    syncError,
    loadErrorDetail,
    user,
    lastSyncedAt,
    isLoaded,
    isAuthenticated,
    isInitialSyncDone,
    corruptedRawPayload,
    login,
    logout,
    reauthorizeGoogleDrive,
    syncNow,
    exportBackup,
    restoreBackup,
    driveBackupEnabled,
    setDriveBackupEnabled,
    lastDriveBackupAt,
    runDriveBackupNow,
    exportCorruptedFile,
    addBike,
    updateBike,
    reorderBikes,
    addCategory,
    renameCategory,
    deleteCategory,
    addCategorySpecField,
    renameCategorySpecField,
    deleteCategorySpecField,
    moveCategorySpecField,
    deleteBike,
    deleteOdometerEntry,
    clearAllData,
    updateOdometer,
    linkBikeToStrava,
    unlinkBikeFromStrava,
    syncBikeFromStrava,
    getBikeByStravaGearId,
    addComponent,
    updateComponent,
    retireComponent,
    deleteComponent,
    installComponent,
    removeComponent,
    transferComponent,
    deleteInstallation,
    quickReplaceComponent,
    createServiceSchedule,
    updateServiceSchedule,
    toggleServiceScheduleActive,
    deleteServiceSchedule,
    createServiceEvent,
    deleteServiceEvent,
    saveSetup,
    saveSetupSnapshot,
    deleteSetupSnapshot,
    addTransaction,
    deleteTransaction,
    updateSettings,
    getBike,
    getGarageBikes,
    getBikeInstalledComponents,
    getStorageComponents,
    getAllComponents,
    getComponentById,
    getBikeServiceSchedulesWithStatus,
    getAllConfiguredSchedulesWithStatus,
    getServiceScheduleStatuses: getAllConfiguredSchedulesWithStatus,
    getBikeServiceEvents,
    getComponentServiceEvents,
    getComponentServiceSchedules,
    getBikeSetup,
    getBikeSnapshots,
    getBikeHistory,
  };

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault(): VaultContextType {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error("useVault must be used within a VaultProvider");
  }
  return context;
}
