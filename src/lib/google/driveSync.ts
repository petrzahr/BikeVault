/**
 * Google Drive Synchronizační vrstva pro BikeVault
 * Stahuje a ukládá soubor bikevault_data.json přes Google Drive API v3.
 */

import { BikeVaultData } from "@/types/vault";
import { clearStoredAuth } from "./googleAuth";

export const BIKEVAULT_DATA_FILENAME = "bikevault_data.json";

export interface DriveFileInfo {
  id: string;
  name: string;
  modifiedTime?: string;
  size?: string;
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
 * Stáhne a naparsuje obsah souboru z Google Disku
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

  const content = await res.json();
  if (!content || typeof content !== "object") {
    throw new Error("Data stažená z Google Disku nejsou ve validním formátu JSON.");
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
 * Uloží data na Google Drive (PATCH pokud existuje soubor, jinak POST)
 */
export async function uploadVaultData(
  token: string,
  vaultData: BikeVaultData,
  existingFileId?: string
): Promise<DriveFileInfo> {
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

/**
 * Sloučí data z cloudu a lokální paměti
 * Pokud je cloud novější než lokál, použije cloud. Pokud je lokál novější, ponechá lokál.
 */
export function mergeVaultData(cloudData: BikeVaultData, localData: BikeVaultData): BikeVaultData {
  if (JSON.stringify(cloudData) === JSON.stringify(localData)) {
    return cloudData;
  }

  const cloudTime = new Date(cloudData.updatedAt || 0).getTime();
  const localTime = new Date(localData.updatedAt || 0).getTime();

  // Cloud je novější nebo stejný
  if (cloudTime >= localTime) {
    return cloudData;
  }

  // Lokál je novější (uživatel provedl změny offline před připojením)
  return localData;
}
