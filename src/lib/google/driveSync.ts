/**
 * Google Drive Synchronizační vrstva pro BikeVault
 * Stahuje a ukládá soubor bikevault_data.json přes Google Drive API v3.
 * Google Drive je autoritativním zdrojem pravdy.
 */

import { BikeVaultData } from "@/types/vault";
import { clearStoredAuth } from "./googleAuth";
import { validateVaultData } from "../storage/storageService";

export const BIKEVAULT_DATA_FILENAME = "bikevault_data.json";

export interface DriveFileInfo {
  id: string;
  name: string;
  modifiedTime?: string;
  size?: string;
}

export class CorruptedCloudDataError extends Error {
  public readonly rawPayload?: unknown;
  constructor(message: string, rawPayload?: unknown) {
    super(message);
    this.name = "CorruptedCloudDataError";
    this.rawPayload = rawPayload;
  }
}

/**
 * Vyhledá soubor bikevault_data.json na Disku uživatele
 */
export async function findVaultFile(token: string): Promise<DriveFileInfo | null> {
  const query = `name = '${BIKEVAULT_DATA_FILENAME}' and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,modifiedTime,size)`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401) {
    clearStoredAuth();
    throw new Error("Platnost přihlášení k Google Disku vypršela. Přihlaste se prosím znovu.");
  }

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`Chyba při hledání souboru na Google Disku (HTTP ${res.status}): ${errorText}`);
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0] as DriveFileInfo;
  }

  return null;
}

/**
 * Stáhne, naparsuje a zvaliduje autoritativní obsah souboru z Google Disku.
 * Pokud je soubor poškozený nebo neodpovídá schématu, vyhodí CorruptedCloudDataError.
 */
export async function downloadVaultData(token: string, fileId: string): Promise<BikeVaultData> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401) {
    clearStoredAuth();
    throw new Error("Platnost přihlášení k Google Disku vypršela. Přihlaste se prosím znovu.");
  }

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`Nepodařilo se stáhnout data z Google Disku (HTTP ${res.status}): ${errorText}`);
  }

  let content: unknown;
  try {
    content = await res.json();
  } catch (parseErr) {
    throw new CorruptedCloudDataError(
      "Data stažená z Google Disku nejsou ve validním formátu JSON. Soubor je pravděpodobně poškozen.",
      parseErr
    );
  }

  const validation = validateVaultData(content);
  if (!validation.valid) {
    throw new CorruptedCloudDataError(
      `Data stažená z Google Disku neobsahují platné schéma BikeVault: ${validation.errors.join("; ")}`,
      content
    );
  }

  return content as BikeVaultData;
}

/**
 * Sestaví tělo požadavku pro multipart upload
 */
function buildMultipartRequestBody(
  metadata: Record<string, unknown>,
  payloadJson: string,
  boundary: string
): string {
  const delimiter = `--${boundary}`;
  const closeDelimiter = `--${boundary}--`;

  return [
    delimiter,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    delimiter,
    "Content-Type: application/json; charset=UTF-8",
    "",
    payloadJson,
    closeDelimiter,
  ].join("\r\n");
}

/**
 * Uloží data na Google Drive (PATCH pokud existuje soubor, jinak POST).
 * Před odesláním data striktně validuje, aby se na Google Drive nikdy nedostala poškozená data.
 */
export async function uploadVaultData(
  token: string,
  vaultData: BikeVaultData,
  existingFileId?: string
): Promise<DriveFileInfo> {
  const validation = validateVaultData(vaultData);
  if (!validation.valid) {
    throw new Error(`Zápis na Google Disk zamítnut: Data nejsou platná (${validation.errors.join("; ")})`);
  }

  const payloadJson = JSON.stringify(vaultData, null, 2);
  const boundary = `-------BikeVaultBoundary${Date.now()}`;

  let url: string;
  let method: string;
  let metadata: Record<string, unknown>;

  if (existingFileId) {
    url = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart&fields=id,name,modifiedTime,size`;
    method = "PATCH";
    metadata = {
      name: BIKEVAULT_DATA_FILENAME,
    };
  } else {
    url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,size";
    method = "POST";
    metadata = {
      name: BIKEVAULT_DATA_FILENAME,
    };
  }

  const body = buildMultipartRequestBody(metadata, payloadJson, boundary);

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (res.status === 401) {
    clearStoredAuth();
    throw new Error("Platnost přihlášení k Google Disku vypršela. Přihlaste se prosím znovu.");
  }

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`Nepodařilo se uložit data na Google Disk (HTTP ${res.status}): ${errorText}`);
  }

  const result = await res.json();
  return result as DriveFileInfo;
}
