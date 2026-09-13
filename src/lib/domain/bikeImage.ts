/**
 * Doménové funkce pro práci s obrázky a hmotností kol v BikeVault.
 */

export interface BikeImageSource {
  uploadedImage?: string | null;
  uploadedImageData?: string | null;
  imageUrl?: string | null;
  photoUrl?: string | null;
}

/**
 * Deterministicky určí zdroj obrázku pro dané kolo.
 * Priorita:
 * 1. Nahraný obrázek (uploadedImage / uploadedImageData)
 * 2. URL fotografie kola (imageUrl / photoUrl)
 * 3. null (aplikace použije výchozí zástupný symbol / placeholder)
 */
export function resolveBikeImage(bike?: BikeImageSource | null): string | null {
  if (!bike) return null;

  if (typeof bike.uploadedImage === "string" && bike.uploadedImage.trim().length > 0) {
    return bike.uploadedImage.trim();
  }

  if (typeof bike.uploadedImageData === "string" && bike.uploadedImageData.trim().length > 0) {
    return bike.uploadedImageData.trim();
  }

  if (typeof bike.imageUrl === "string" && bike.imageUrl.trim().length > 0) {
    return bike.imageUrl.trim();
  }

  if (typeof bike.photoUrl === "string" && bike.photoUrl.trim().length > 0) {
    return bike.photoUrl.trim();
  }

  return null;
}

/**
 * Zpracuje a zvaliduje uživatelský vstup hmotnosti kola.
 * Podporuje český zápis s čárkou (např. "15,8") i mezinárodní s tečkou ("15.8").
 * Vrací zaokrouhlené číselné kilo (např. 15.8) nebo null pro prázdný vstup.
 */
export function parseWeightInput(input?: string | number | null): {
  valid: boolean;
  value: number | null;
  error?: string;
} {
  if (input === undefined || input === null) {
    return { valid: true, value: null };
  }

  if (typeof input === "number") {
    if (isNaN(input)) {
      return { valid: false, value: null, error: "Zadejte platnou číselnou hmotnost v kg." };
    }
    if (input <= 0) {
      return { valid: false, value: null, error: "Hmotnost kola musí být kladné číslo." };
    }
    if (input > 150) {
      return { valid: false, value: null, error: "Zadejte reálnou hmotnost kola (max. 150 kg)." };
    }
    return { valid: true, value: Math.round(input * 100) / 100 };
  }

  const str = input.trim();
  if (str === "") {
    return { valid: true, value: null };
  }

  // Nahrazení české čárky tečkou a odstranění textu jako "kg"
  const normalized = str.replace(",", ".").replace(/\s*kg$/i, "").trim();
  const parsed = Number(normalized);

  if (isNaN(parsed)) {
    return { valid: false, value: null, error: "Zadejte platnou číselnou hmotnost v kg." };
  }

  if (parsed <= 0) {
    return { valid: false, value: null, error: "Hmotnost kola musí být kladné číslo." };
  }

  if (parsed > 150) {
    return { valid: false, value: null, error: "Zadejte reálnou hmotnost kola (max. 150 kg)." };
  }

  return {
    valid: true,
    value: Math.round(parsed * 100) / 100,
  };
}

/**
 * Naformátuje hmotnost do českého formátu, např. "15,8 kg".
 * Pokud hmotnost není zadána, vrací null.
 */
export function formatWeightCs(weightKg?: number | null): string | null {
  if (weightKg === undefined || weightKg === null || isNaN(weightKg) || weightKg <= 0) {
    return null;
  }

  const formatted = weightKg.toLocaleString("cs-CZ", {
    minimumFractionDigits: weightKg % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 2,
  });

  return `${formatted} kg`;
}

export const MAX_IMAGE_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Ověří soubor a zkomprimuje jej na klientovi na přijatelnou velikost
 * pro uložení a synchronizaci na Google Drive.
 */
export async function processImageFile(
  file: File,
  maxWidth = 1200,
  maxHeight = 800,
  quality = 0.82
): Promise<string> {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  const isImage = file.type ? allowedTypes.includes(file.type.toLowerCase()) || file.type.startsWith("image/") : true;

  if (!isImage) {
    throw new Error("Podporovány jsou pouze obrázky ve formátu JPEG, PNG nebo WebP.");
  }

  if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
    throw new Error("Maximální povolená velikost souboru je 10 MB.");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Nepodařilo se načíst soubor obrázku."));
    reader.onload = () => {
      const dataUrl = reader.result as string;

      // Pokud běžíme v prostředí bez plného DOM/Canvas (např. Node testy), vrátíme přímo dataUrl
      if (typeof window === "undefined" || typeof document === "undefined" || typeof Image === "undefined") {
        return resolve(dataUrl);
      }

      const img = new Image();
      img.onerror = () => resolve(dataUrl);
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            return resolve(dataUrl);
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Pokus o export do WebP s fallbackem na JPEG
          let compressed = canvas.toDataURL("image/webp", quality);
          if (!compressed.startsWith("data:image/webp")) {
            compressed = canvas.toDataURL("image/jpeg", quality);
          }

          resolve(compressed);
        } catch {
          resolve(dataUrl);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}
