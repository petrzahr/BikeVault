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
  createEmptyVaultData,
} from "@/constants/defaultData";
import {
  getStoredAuth,
  isStoredTokenValid,
  hasDriveScope,
  loginToGoogle,
  logoutFromGoogle,
  fetchGoogleUserProfile,
  GoogleUser,
  InsufficientDriveScopeError,
} from "@/lib/google/googleAuth";
import {
  findVaultFile,
  downloadVaultData,
  uploadVaultData,
  CorruptedCloudDataError,
} from "@/lib/google/driveSync";
import {
  loadStoredCacheResult,
  saveStoredCache,
  clearStoredCache,
  validateAndParseBackup,
  exportCorruptedRawData,
  getInitialData,
} from "@/lib/storage/storageService";
import { recordOdometerSnapshot, calculateInstallationUsage } from "@/lib/domain/odometer";
import { compareMileage, validateLinkConstraint, validateNewBikeGearId } from "@/lib/domain/stravaSync";
import {
  BikeComponentsDisposition,
  deleteBikeFromData,
  deleteComponentFromData,
  deleteOdometerEntryFromData,
  deleteServiceEventFromData,
  clearVaultData,
} from "@/lib/domain/deletion";
import { evaluateServiceSchedule, MaintenanceStatusResult } from "@/lib/domain/maintenance";
import { areComponentsEquivalentReplacement, findStorageReplacements } from "@/lib/domain/replacement";

export type SyncStatus = "synced" | "saving" | "offline" | "error";
export type AppState =
  | "authLoading"
  | "cloudLoading"
  | "ready"
  | "loadError"
  | "syncError"
  | "scopeInsufficient";

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
  logout: () => Promise<void>;
  reauthorizeGoogleDrive: () => Promise<void>;
  syncNow: () => Promise<void>;
  exportBackup: () => void;
  importBackup: (jsonContent: string) => Promise<boolean>;
  exportCorruptedFile: () => void;

  // Bike actions
  addBike: (
    bike: Omit<Bike, "id" | "currentKm" | "currentMinutes" | "createdAt" | "updatedAt"> & {
      initialKm?: number;
      initialHours?: number;
      initialOdometerSource?: "MANUAL" | "STRAVA" | string;
    }
  ) => string;
  updateBike: (id: string, updates: Partial<Bike>) => void;
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
    updateMileage?: { stravaKm: number }
  ) => { success: boolean; error?: string };
  unlinkBikeFromStrava: (bikeId: string) => { success: boolean };
  syncBikeFromStrava: (
    bikeId: string,
    stravaKm: number
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
  const [data, setData] = useState<BikeVaultData>(getInitialData());
  const [appState, setAppState] = useState<AppState>("authLoading");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialSyncDone, setIsInitialSyncDone] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("offline");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [loadErrorDetail, setLoadErrorDetail] = useState<string | null>(null);
  const [corruptedRawPayload, setCorruptedRawPayload] = useState<string | null>(null);
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [driveFileId, setDriveFileId] = useState<string | null>(null);

  const isInitialMount = useRef(true);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to sync with authoritative Google Drive
  const syncWithGoogleDrive = useCallback(async (token: string) => {
    try {
      setSyncStatus("saving");
      setSyncError(null);
      setLoadErrorDetail(null);

      // Fetch user profile if missing
      fetchGoogleUserProfile(token).then((u) => {
        if (u) setUser(u);
      });

      const fileInfo = await findVaultFile(token);
      if (fileInfo) {
        setDriveFileId(fileInfo.id);
        const cloudData = await downloadVaultData(token, fileInfo.id);

        // Authoritative cloud data wins: update state and populate local cache
        setData(cloudData);
        saveStoredCache(cloudData);

        setLastSyncedAt(new Date());
        setSyncStatus("synced");
        setAppState("ready");
      } else {
        // First production run on Google Drive: create new file with clean empty data (NO demo data)
        const initialCleanData = createEmptyVaultData();
        const newFile = await uploadVaultData(token, initialCleanData);
        setDriveFileId(newFile.id);
        setData(initialCleanData);
        saveStoredCache(initialCleanData);

        setLastSyncedAt(new Date());
        setSyncStatus("synced");
        setAppState("ready");
      }
      setIsInitialSyncDone(true);
    } catch (err: unknown) {
      console.error("Sync error:", err);
      const isCorrupted = err instanceof CorruptedCloudDataError;
      const isScopeError =
        err instanceof InsufficientDriveScopeError ||
        (err instanceof Error &&
          (err.message.includes("ACCESS_TOKEN_SCOPE_INSUFFICIENT") ||
            err.message.includes("insufficient_scope") ||
            err.message.includes("insufficientPermissions") ||
            err.message.includes("Insufficient Permission")));

      const errorMsg = isScopeError
        ? "BikeVault potřebuje znovu povolit přístup ke svým datům na Google Disku."
        : err instanceof Error ? err.message : String(err);

      setSyncStatus("error");
      setSyncError(errorMsg);
      setIsInitialSyncDone(true);

      if (isCorrupted) {
        // DATA SAFETY: Never overwrite corrupted cloud data with cache or empty data!
        setAppState("loadError");
        setLoadErrorDetail(errorMsg);
        if (err.rawPayload) {
          setCorruptedRawPayload(
            typeof err.rawPayload === "string" ? err.rawPayload : JSON.stringify(err.rawPayload, null, 2)
          );
        }
      } else if (isScopeError) {
        setAppState("scopeInsufficient");
      } else {
        setAppState((prev) => (prev === "ready" ? "ready" : "syncError"));
      }
    }
  }, []);

  // 1. Initial load & check Google Auth
  useEffect(() => {
    const auth = getStoredAuth();
    const valid = isStoredTokenValid();

    if (auth && valid) {
      setIsAuthenticated(true);
      if (auth.user) {
        setUser(auth.user);
      }

      // Pokud token v úložišti postrádá drive scope, přejdeme do stavu scopeInsufficient
      if (auth.scopes && !hasDriveScope(auth.scopes)) {
        setAppState("scopeInsufficient");
        setSyncStatus("error");
        setSyncError("BikeVault potřebuje znovu povolit přístup ke svým datům na Google Disku.");
        setIsLoaded(true);
        setIsInitialSyncDone(true);
        return;
      }

      setAppState("cloudLoading");

      // Load cached data from local cache for instant UI response (no flicker)
      const cacheResult = loadStoredCacheResult();
      if (cacheResult.status === "ready" && !cacheResult.isNewInstall) {
        setData(cacheResult.data);
      } else if (cacheResult.status === "loadError") {
        console.warn("Local cache could not be read cleanly:", cacheResult.error);
        if (cacheResult.corruptedRaw) {
          setCorruptedRawPayload(cacheResult.corruptedRaw);
        }
      }

      setIsLoaded(true);
      // Trigger background sync from authoritative Google Drive
      syncWithGoogleDrive(auth.accessToken);
    } else {
      // Not authenticated - require Google login
      setIsAuthenticated(false);
      setAppState("authLoading");
      setIsLoaded(true);
      setIsInitialSyncDone(true);
      setSyncStatus("offline");
    }
  }, [syncWithGoogleDrive]);

  // 2. Debounced auto-save on state change (Protected by WRITE GUARDS)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // WRITE GUARD: Only autosave when authenticated, initial sync done, and appState is 'ready'
    if (!isAuthenticated || !isInitialSyncDone || appState !== "ready") {
      return;
    }

    // Always update local cache immediately
    saveStoredCache(data);

    // If logged in, debounce upload to Drive
    const auth = getStoredAuth();
    if (!auth || !isStoredTokenValid()) {
      setSyncStatus("offline");
      return;
    }

    setSyncStatus("saving");

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      // Re-verify appState is still ready before network write
      if (appState !== "ready") return;

      try {
        const fileInfo = await uploadVaultData(auth.accessToken, data, driveFileId || undefined);
        if (fileInfo.id) {
          setDriveFileId(fileInfo.id);
        }
        setLastSyncedAt(new Date());
        setSyncStatus("synced");
        setSyncError(null);
      } catch (err: unknown) {
        console.error("Auto-save error to Drive:", err);
        setSyncStatus("error");
        setSyncError(err instanceof Error ? err.message : String(err));
      }
    }, 1500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [data, driveFileId, isAuthenticated, isInitialSyncDone, appState]);

  // Update helper with automatic updatedAt timestamp
  const mutateData = useCallback((fn: (prev: BikeVaultData) => BikeVaultData) => {
    setData((prev) => {
      const next = fn(prev);
      return {
        ...next,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  // --- AUTH METHODS ---
  const login = async () => {
    try {
      setSyncStatus("saving");
      setSyncError(null);
      setLoadErrorDetail(null);
      setAppState("cloudLoading");
      const token = await loginToGoogle();
      const profile = await fetchGoogleUserProfile(token);
      if (profile) setUser(profile);
      setIsAuthenticated(true);
      setIsInitialSyncDone(false);
      await syncWithGoogleDrive(token);
    } catch (err: unknown) {
      setSyncStatus("error");
      const msg = err instanceof Error ? err.message : String(err);
      setSyncError(msg);
      throw err;
    }
  };

  const logout = async () => {
    // 1. Immediately invalidate ready state & cancel any pending autosave
    setAppState("authLoading");
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    // 2. Terminate Google Auth
    await logoutFromGoogle();
    setUser(null);
    setDriveFileId(null);
    setIsAuthenticated(false);
    setIsInitialSyncDone(true);
    setSyncStatus("offline");
    // 3. Clear in-memory state to clean empty data (never persisted to cloud)
    setData(createEmptyVaultData());
    // 4. Clear local cache
    clearStoredCache();
  };

  const reauthorizeGoogleDrive = async () => {
    try {
      setSyncStatus("saving");
      setSyncError(null);
      setLoadErrorDetail(null);
      setAppState("cloudLoading");
      // Prompt "consent" forces Google to display permission screen for drive.file
      const token = await loginToGoogle("consent");
      const profile = await fetchGoogleUserProfile(token);
      if (profile) setUser(profile);
      setIsAuthenticated(true);
      setIsInitialSyncDone(false);
      await syncWithGoogleDrive(token);
    } catch (err: unknown) {
      setSyncStatus("error");
      const isScopeError =
        err instanceof InsufficientDriveScopeError ||
        (err instanceof Error &&
          (err.message.includes("ACCESS_TOKEN_SCOPE_INSUFFICIENT") ||
            err.message.includes("insufficient_scope") ||
            err.message.includes("Insufficient Permission")));
      const msg = isScopeError
        ? "BikeVault potřebuje znovu povolit přístup ke svým datům na Google Disku."
        : err instanceof Error ? err.message : String(err);
      setSyncError(msg);
      setAppState("scopeInsufficient");
      throw err;
    }
  };

  const syncNow = async () => {
    const auth = getStoredAuth();
    if (!auth || !isStoredTokenValid()) {
      await login();
      return;
    }
    await syncWithGoogleDrive(auth.accessToken);
  };

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

  const exportCorruptedFile = () => {
    if (corruptedRawPayload) {
      exportCorruptedRawData(corruptedRawPayload);
    }
  };

  const importBackup = async (jsonContent: string): Promise<boolean> => {
    try {
      const importedData = validateAndParseBackup(jsonContent);
      setData(importedData);
      saveStoredCache(importedData);

      // Trigger sync if online and appState is ready
      const auth = getStoredAuth();
      if (auth && isStoredTokenValid() && appState === "ready") {
        await uploadVaultData(auth.accessToken, importedData, driveFileId || undefined);
        setLastSyncedAt(new Date());
        setSyncStatus("synced");
      }
      return true;
    } catch (e) {
      alert("Chyba při importu zálohy: " + (e instanceof Error ? e.message : String(e)));
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
    mutateData((prev) => ({
      ...prev,
      bikes: prev.bikes.map((b) => (b.id === id ? { ...b, ...updates, id: b.id, updatedAt: new Date().toISOString() } : b)),
    }));
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
    updateMileage?: { stravaKm: number }
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

    // If initial mileage update was requested and stravaKm is higher
    if (updateMileage && updateMileage.stravaKm !== undefined) {
      const comparison = compareMileage(bike.currentKm, updateMileage.stravaKm);
      if (comparison.type === "HIGHER") {
        updateOdometer(
          bikeId,
          comparison.stravaKm,
          bike.currentMinutes,
          now,
          `Propojení se Stravou (+${comparison.deltaKm} km)`,
          false,
          "STRAVA"
        );
      }
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
    stravaKm: number
  ): { success: boolean; type: "EQUAL" | "HIGHER" | "LOWER"; deltaKm: number; message: string } => {
    const bike = data.bikes.find((b) => b.id === bikeId);
    if (!bike) {
      return { success: false, type: "EQUAL", deltaKm: 0, message: "Kolo v BikeVault nebylo nalezeno." };
    }

    const comparison = compareMileage(bike.currentKm, stravaKm);

    if (comparison.type === "EQUAL") {
      return { success: true, type: "EQUAL", deltaKm: 0, message: "Nájezd je aktuální." };
    }

    if (comparison.type === "LOWER") {
      // CRITICAL: NEVER automatically decrease mileage
      return {
        success: false,
        type: "LOWER",
        deltaKm: comparison.deltaKm,
        message: comparison.message,
      };
    }

    // HIGHER: update odometer
    const res = updateOdometer(
      bikeId,
      comparison.stravaKm,
      bike.currentMinutes,
      new Date().toISOString(),
      `Synchronizace se Stravou (+${comparison.deltaKm} km)`,
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

    return {
      success: true,
      type: "HIGHER",
      deltaKm: comparison.deltaKm,
      message: `Nájezd úspěšně aktualizován na ${comparison.stravaKm} km (+${comparison.deltaKm} km).`,
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
    mutateData((prev) => ({
      ...prev,
      components: prev.components.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c)),
    }));
  };

  const retireComponent = (id: string) => {
    mutateData((prev) => ({
      ...prev,
      components: prev.components.map((c) => (c.id === id ? { ...c, status: "DISCARDED", updatedAt: new Date().toISOString() } : c)),
    }));
  };

  const installComponent = (bikeId: string, componentId: string, slot: string) => {
    const bike = data.bikes.find((b) => b.id === bikeId);
    if (!bike) throw new Error("Kolo nebylo nalezeno");

    const now = new Date().toISOString();

    mutateData((prev) => {
      // Close any active installation on this slot
      const updatedInstallations = prev.componentInstallations.map((inst) => {
        if (inst.bikeId === bikeId && inst.slot === slot && !inst.removedAt) {
          return {
            ...inst,
            removedAt: now,
            removedBikeKm: bike.currentKm,
            removedBikeMinutes: bike.currentMinutes,
          };
        }
        return inst;
      });

      // Update displaced components to IN_STORAGE
      const activeSlotInst = prev.componentInstallations.find(
        (i) => i.bikeId === bikeId && i.slot === slot && !i.removedAt
      );

      const updatedComponents = prev.components.map((c) => {
        if (activeSlotInst && c.id === activeSlotInst.componentId) {
          return { ...c, status: "IN_STORAGE" as const, updatedAt: now };
        }
        if (c.id === componentId) {
          return { ...c, status: "INSTALLED" as const, updatedAt: now };
        }
        return c;
      });

      const newInst: ComponentInstallation = {
        id: generateId("inst"),
        bikeId,
        componentId,
        slot,
        installedAt: now,
        installedBikeKm: bike.currentKm,
        installedBikeMinutes: bike.currentMinutes,
        createdAt: now,
      };

      return {
        ...prev,
        componentInstallations: [newInst, ...updatedInstallations],
        components: updatedComponents,
      };
    });
  };

  const removeComponent = (
    installationId: string,
    disposition: "IN_STORAGE" | "SOLD" | "DAMAGED" | "DISCARDED",
    salePrice?: number,
    saleDate?: string
  ) => {
    const inst = data.componentInstallations.find((i) => i.id === installationId);
    if (!inst) throw new Error("Instalace nebyla nalezena");
    const bike = data.bikes.find((b) => b.id === inst.bikeId);
    if (!bike) throw new Error("Kolo nebylo nalezeno");

    const now = new Date().toISOString();

    const newTx: FinancialTransaction[] = [];
    if (disposition === "SOLD" && salePrice && salePrice > 0) {
      newTx.push({
        id: generateId("fin"),
        bikeId: bike.id,
        componentId: inst.componentId,
        type: "INCOME",
        category: "COMPONENT_SALE",
        amount: salePrice,
        currency: "CZK",
        transactionDate: saleDate || now.split("T")[0],
        notes: "Prodej demontovaného komponentu",
        createdAt: now,
      });
    }

    mutateData((prev) => ({
      ...prev,
      componentInstallations: prev.componentInstallations.map((i) =>
        i.id === installationId
          ? {
              ...i,
              removedAt: now,
              removedBikeKm: bike.currentKm,
              removedBikeMinutes: bike.currentMinutes,
            }
          : i
      ),
      components: prev.components.map((c) =>
        c.id === inst.componentId
          ? {
              ...c,
              status: disposition,
              soldPrice: disposition === "SOLD" ? salePrice : undefined,
              soldDate: disposition === "SOLD" ? saleDate : undefined,
              updatedAt: now,
            }
          : c
      ),
      financialTransactions: [...newTx, ...prev.financialTransactions],
    }));
  };

  const transferComponent = (installationId: string, targetBikeId: string, targetSlot: string) => {
    const inst = data.componentInstallations.find((i) => i.id === installationId);
    if (!inst) throw new Error("Instalace nebyla nalezena");
    const sourceBike = data.bikes.find((b) => b.id === inst.bikeId);
    const targetBike = data.bikes.find((b) => b.id === targetBikeId);
    if (!sourceBike || !targetBike) throw new Error("Kolo nebylo nalezeno");

    const now = new Date().toISOString();

    const newInst: ComponentInstallation = {
      id: generateId("inst"),
      bikeId: targetBikeId,
      componentId: inst.componentId,
      slot: targetSlot,
      installedAt: now,
      installedBikeKm: targetBike.currentKm,
      installedBikeMinutes: targetBike.currentMinutes,
      createdAt: now,
    };

    mutateData((prev) => ({
      ...prev,
      componentInstallations: [
        newInst,
        ...prev.componentInstallations.map((i) =>
          i.id === installationId
            ? {
                ...i,
                removedAt: now,
                removedBikeKm: sourceBike.currentKm,
                removedBikeMinutes: sourceBike.currentMinutes,
              }
            : i
        ),
      ],
      components: prev.components.map((c) =>
        c.id === inst.componentId ? { ...c, status: "INSTALLED" as const, updatedAt: now } : c
      ),
    }));
  };

  const quickReplaceComponent = (
    bikeId: string,
    currentInstallationId: string,
    replacementComponentId: string
  ) => {
    const bike = data.bikes.find((b) => b.id === bikeId);
    if (!bike) throw new Error("Kolo nebylo nalezeno");

    const currentInst = data.componentInstallations.find((i) => i.id === currentInstallationId);
    if (!currentInst) throw new Error("Aktivní instalace nebyla nalezena");

    const currentComp = data.components.find((c) => c.id === currentInst.componentId);
    const replacementComp = data.components.find((c) => c.id === replacementComponentId);
    if (!currentComp || !replacementComp) throw new Error("Komponent nebyl nalezen");

    const currentCat = data.categories.find((cat) => cat.id === currentComp.categoryId);
    const repCat = data.categories.find((cat) => cat.id === replacementComp.categoryId);

    // Validate equivalence using domain rules
    const isEquiv = areComponentsEquivalentReplacement(
      currentComp,
      currentCat?.code,
      replacementComp,
      repCat?.code
    );
    if (!isEquiv) {
      throw new Error("Vybraný komponent neodpovídá parametrům původního dílu pro rychlou výměnu");
    }

    const now = new Date().toISOString();
    const newInstId = generateId("inst");

    const newInst: ComponentInstallation = {
      id: newInstId,
      bikeId,
      componentId: replacementComponentId,
      slot: currentInst.slot,
      installedAt: now,
      installedBikeKm: bike.currentKm,
      installedBikeMinutes: bike.currentMinutes,
      createdAt: now,
    };

    mutateData((prev) => ({
      ...prev,
      componentInstallations: [
        newInst,
        ...prev.componentInstallations.map((i) =>
          i.id === currentInstallationId
            ? {
                ...i,
                removedAt: now,
                removedBikeKm: bike.currentKm,
                removedBikeMinutes: bike.currentMinutes,
              }
            : i
        ),
      ],
      components: prev.components.map((c) => {
        if (c.id === currentComp.id) return { ...c, status: "DISCARDED" as const, updatedAt: now };
        if (c.id === replacementComp.id) return { ...c, status: "INSTALLED" as const, updatedAt: now };
        return c;
      }),
      bikeSetups: prev.bikeSetups.map((s) => {
        if (s.bikeId !== bikeId) return s;
        return {
          ...s,
          forkInstallationId: s.forkInstallationId === currentInstallationId ? newInstId : s.forkInstallationId,
          shockInstallationId: s.shockInstallationId === currentInstallationId ? newInstId : s.shockInstallationId,
          frontTireInstallationId: s.frontTireInstallationId === currentInstallationId ? newInstId : s.frontTireInstallationId,
          rearTireInstallationId: s.rearTireInstallationId === currentInstallationId ? newInstId : s.rearTireInstallationId,
          updatedAt: now,
        };
      }),
    }));
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
    importBackup,
    exportCorruptedFile,
    addBike,
    updateBike,
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
