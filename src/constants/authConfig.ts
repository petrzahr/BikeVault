/**
 * Konfigurace a pomocné funkce pro autentizaci a žádosti o přístup do BikeVault.
 */

// Cílová e-mailová adresa pro zasílání žádostí o přístup do testovacího režimu
export const ACCESS_REQUEST_EMAIL =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_ACCESS_REQUEST_EMAIL) ||
  "bikevault@byzahr.app";

// Předmět e-mailu
export const ACCESS_REQUEST_SUBJECT = "Žádost o přístup do aplikace BikeVault";

// Předvyplněné tělo e-mailu
export const ACCESS_REQUEST_BODY = [
  "Dobrý den,",
  "",
  "žádám o přístup do aplikace BikeVault.",
  "",
  "E-mail účtu Google, kterým se budu přihlašovat:",
  "[DOPLŇTE E-MAIL]",
  "",
  "Děkuji.",
].join("\r\n");

/**
 * Bezpečně sestaví URL pro přímé otevření editoru zpráv ve webovém Gmailu (Compose).
 * Formát: https://mail.google.com/mail/?view=cm&fs=1&to=...&su=...&body=...
 */
export function buildGmailComposeUrl(email: string = ACCESS_REQUEST_EMAIL): string {
  const encodedTo = encodeURIComponent(email);
  const encodedSubject = encodeURIComponent(ACCESS_REQUEST_SUBJECT);
  const encodedBody = encodeURIComponent(ACCESS_REQUEST_BODY);
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodedTo}&su=${encodedSubject}&body=${encodedBody}`;
}

/**
 * Sestaví standardní mailto: odkaz pro otevření výchozího e-mailového klienta
 */
export function buildAccessRequestMailtoUrl(email: string = ACCESS_REQUEST_EMAIL): string {
  const encodedSubject = encodeURIComponent(ACCESS_REQUEST_SUBJECT);
  const encodedBody = encodeURIComponent(ACCESS_REQUEST_BODY);
  return `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`;
}
