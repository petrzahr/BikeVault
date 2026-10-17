/**
 * Periodické JSON zálohy do viditelné složky na Google Disku.
 * Nezávislé na autosave frontě: běží jako "fire and forget" po načtení dat z Disku
 * a nikdy nesmí svým selháním přerušit synchronizaci ani načtení dat.
 */

import { z } from "zod";
import { BikeVaultData } from "@/types/vault";
import { clearStoredAuth, getStoredAuth } from "./googleAuth";
import { buildMultipartRequestBody } from "./driveSync";
import { validateVaultData } from "../storage/storageService";

export const DRIVE_BACKUP_FOLDER_NAME = "BikeVault zalohy";
const BACKUP_FILENAME_PREFIX = "bikevault_zaloha_";
export const DRIVE_BACKUP_MAX_COUNT = 30;
export const DRIVE_BACKUP_MIN_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hodin

const BACKUP_ENABLED_KEY = "bikevault_drive_backup_enabled_v1";
const BACKUP_LAST_RUN_PREFIX = "bikevault_drive_backup_last_run_v1:";

const driveEntrySchema = z.object({ id: z.string().min(1), name: z.string() });
const driveListSchema = z.object({ files: z.array(driveEntrySchema).default([]) });
const driveCreateSchema = z.object({ id: z.string().min(1) });

type DriveEntry = z.infer<typeof driveEntrySchema>;

export function isDriveBackupEnabled(): boolean {
  try {
    const raw = localStorage.getItem(BACKUP_ENABLED_KEY);
    return raw === null ? true : raw === "1";
  } catch {
    return true;
  }
}

export function setDriveBackupEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(BACKUP_ENABLED_KEY, enabled ? "1" : "0");
  } catch (err) {
    console.error("Chyba při ukládání nastavení automatických záloh:", err);
  }
}

function lastBackupKey(accountId: string): string {
  return `${BACKUP_LAST_RUN_PREFIX}${accountId}`;
}

export function getLastDriveBackupAt(accountId: string): Date | null {
  try {
    const raw = localStorage.getItem(lastBackupKey(accountId));
    if (!raw) return null;
    const time = Number(raw);
    return Number.isFinite(time) ? new Date(time) : null;
  } catch {
    return null;
  }
}

function setLastDriveBackupAt(accountId: string, at: number): void {
  try {
    localStorage.setItem(lastBackupKey(accountId), String(at));
  } catch (err) {
    console.error("Chyba při ukládání času poslední zálohy:", err);
  }
}

async function driveFetch(token: string, url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) },
  });
  if (res.status === 401) {
    if (getStoredAuth()?.accessToken === token) clearStoredAuth();
    throw new Error("Platnost přihlášení k Google Disku vypršela. Přihlaste se prosím znovu.");
  }
  return res;
}

async function findBackupFolderId(token: string): Promise<string | null> {
  const query = `name = '${DRIVE_BACKUP_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&pageSize=10`;
  const res = await driveFetch(token, url);
  if (!res.ok) throw new Error(`Nepodařilo se najít složku záloh na Google Disku (HTTP ${res.status}).`);
  const parsed = driveListSchema.safeParse(await res.json());
  if (!parsed.success) throw new Error("Google Disk vrátil neočekávanou odpověď při hledání složky záloh.");
  return parsed.data.files[0]?.id ?? null;
}

async function createBackupFolder(token: string): Promise<string> {
  const res = await driveFetch(token, "https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: DRIVE_BACKUP_FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" }),
  });
  if (!res.ok) throw new Error(`Nepodařilo se vytvořit složku záloh na Google Disku (HTTP ${res.status}).`);
  const parsed = driveCreateSchema.safeParse(await res.json());
  if (!parsed.success) throw new Error("Google Disk nevrátil ID nově vytvořené složky záloh.");
  return parsed.data.id;
}

async function findOrCreateBackupFolderId(token: string): Promise<string> {
  const existing = await findBackupFolderId(token);
  return existing ?? createBackupFolder(token);
}

async function listBackupFiles(token: string, folderId: string): Promise<DriveEntry[]> {
  const query = `'${folderId}' in parents and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&orderBy=name desc&pageSize=1000`;
  const res = await driveFetch(token, url);
  if (!res.ok) throw new Error(`Nepodařilo se vypsat zálohy na Google Disku (HTTP ${res.status}).`);
  const parsed = driveListSchema.safeParse(await res.json());
  if (!parsed.success) throw new Error("Google Disk vrátil neočekávanou odpověď při výpisu záloh.");
  return parsed.data.files;
}

async function uploadBackupFile(token: string, folderId: string, data: BikeVaultData, name: string): Promise<void> {
  const boundary = `-------BikeVaultBackup${Date.now()}`;
  const body = buildMultipartRequestBody({ name, parents: [folderId] }, JSON.stringify(data, null, 2), boundary);
  const res = await driveFetch(token, "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`Nepodařilo se nahrát zálohu na Google Disk (HTTP ${res.status}): ${errorText}`);
  }
}

async function deleteBackupFile(token: string, fileId: string): Promise<void> {
  const res = await driveFetch(token, `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Nepodařilo se smazat starou zálohu na Google Disku (HTTP ${res.status}).`);
  }
}

export interface DriveBackupResult {
  ran: boolean;
  reason?: string;
}

/**
 * Nahraje nový timestampovaný snapshot a odstraní nejstarší zálohy nad DRIVE_BACKUP_MAX_COUNT.
 * Řídí se přepínačem a intervalem, pokud není force.
 */
export async function runDriveBackupIfDue(
  token: string,
  accountId: string,
  data: BikeVaultData,
  options: { force?: boolean } = {}
): Promise<DriveBackupResult> {
  if (!options.force && !isDriveBackupEnabled()) return { ran: false, reason: "disabled" };
  const last = getLastDriveBackupAt(accountId);
  if (!options.force && last && Date.now() - last.getTime() < DRIVE_BACKUP_MIN_INTERVAL_MS) {
    return { ran: false, reason: "throttled" };
  }

  // DATA SAFETY: never store a snapshot that could not be restored later
  const validation = validateVaultData(data);
  if (!validation.valid) {
    throw new Error(`Záloha zamítnuta: Data nejsou platná (${validation.errors.join("; ")})`);
  }

  const folderId = await findOrCreateBackupFolderId(token);
  const name = `${BACKUP_FILENAME_PREFIX}${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  await uploadBackupFile(token, folderId, data, name);
  setLastDriveBackupAt(accountId, Date.now());

  try {
    const files = await listBackupFiles(token, folderId);
    // Only our own snapshots count towards retention; anything else in the folder is left alone
    const stale = files.filter((f) => f.name.startsWith(BACKUP_FILENAME_PREFIX)).slice(DRIVE_BACKUP_MAX_COUNT);
    for (const file of stale) await deleteBackupFile(token, file.id);
  } catch (err) {
    console.warn("BikeVault: úklid starých záloh na Google Disku selhal, nově nahraná záloha tím není ohrožena.", err);
  }

  return { ran: true };
}

/** Best-effort varianta pro volání na pozadí (např. po načtení dat) – nikdy nevyhodí výjimku. */
export async function tryRunDriveBackup(
  token: string,
  accountId: string,
  data: BikeVaultData,
  options: { force?: boolean } = {}
): Promise<DriveBackupResult> {
  try {
    return await runDriveBackupIfDue(token, accountId, data, options);
  } catch (err) {
    console.warn("BikeVault: automatická záloha na Google Disk selhala.", err);
    return { ran: false, reason: err instanceof Error ? err.message : String(err) };
  }
}
