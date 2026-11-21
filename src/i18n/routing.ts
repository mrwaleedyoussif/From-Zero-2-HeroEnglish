import { defineRouting } from "next-intl/routing";

export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];

/** Locales written right-to-left. */
const rtlLocales: ReadonlySet<Locale> = new Set<Locale>(["ar"]);

export function directionOf(locale: Locale): "ltr" | "rtl" {
  return rtlLocales.has(locale) ? "rtl" : "ltr";
}

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
  localePrefix: "always",
});
