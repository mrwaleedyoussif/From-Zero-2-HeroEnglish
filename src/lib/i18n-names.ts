import { appTimeZone } from "./time";

/** Pick the bilingual name column for the current locale. */
export function localName(row: { name_en: string; name_ar: string }, locale: string): string {
  return locale === "ar" ? row.name_ar : row.name_en;
}

const tag = (locale: string) => (locale === "ar" ? "ar-SA-u-nu-latn" : "en-GB");
/** A plain date ("2026-11-23") is already a calendar day; an instant is shown in the app's zone. */
const zoneFor = (value: string | Date) =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? "UTC" : appTimeZone();

export function formatDate(value: string | Date, locale: string): string {
  return new Intl.DateTimeFormat(tag(locale), {
    dateStyle: "medium",
    timeZone: zoneFor(value),
  }).format(new Date(value));
}

export function formatDateTime(value: string | Date, locale: string): string {
  return new Intl.DateTimeFormat(tag(locale), {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: appTimeZone(),
  }).format(new Date(value));
}
