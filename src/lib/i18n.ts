import cs from "@/locales/cs.json";

export type TranslationKeys = typeof cs;

/**
 * Type-safe translation accessor for BikeVault.
 * Fallback to key path if string not found.
 */
export function t(path: string): string {
  const parts = path.split(".");
  let current: any = cs;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return path;
    }
  }
  return typeof current === "string" ? current : path;
}

export function formatCzk(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) return "0 Kč";
  const num = Math.round(Number(amount));
  return `${num.toLocaleString("cs-CZ")} Kč`;
}

export function formatKm(km: number | string | null | undefined): string {
  if (km === null || km === undefined || isNaN(Number(km))) return "0 km";
  const num = Number(km);
  const formatted = num % 1 === 0 ? num.toLocaleString("cs-CZ") : num.toLocaleString("cs-CZ", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `${formatted} km`;
}

export function formatMinutes(totalMinutes: number | null | undefined): string {
  if (!totalMinutes || totalMinutes <= 0) return "0 h";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) return `${hours} h`;
  if (hours === 0) return `${minutes} min`;
  return `${hours} h ${minutes} min`;
}

export function formatHoursDecimal(totalMinutes: number | null | undefined): string {
  if (!totalMinutes || totalMinutes <= 0) return "0 h";
  const hours = totalMinutes / 60;
  return `${hours.toLocaleString("cs-CZ", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} h`;
}

export function formatBar(bar: number | string | null | undefined): string {
  if (bar === null || bar === undefined || isNaN(Number(bar))) return "- bar";
  return `${Number(bar).toLocaleString("cs-CZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} bar`;
}

export function formatPsi(psi: number | string | null | undefined): string {
  if (psi === null || psi === undefined || isNaN(Number(psi))) return "- psi";
  return `${Math.round(Number(psi))} psi`;
}

export function formatDateCs(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric"
  });
}
