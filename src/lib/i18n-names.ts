/** Pick the bilingual name column for the current locale. */
export function localName(row: { name_en: string; name_ar: string }, locale: string): string {
  return locale === "ar" ? row.name_ar : row.name_en;
}

export function formatDate(value: string | Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-latn" : "en-GB", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function formatDateTime(value: string | Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-latn" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
