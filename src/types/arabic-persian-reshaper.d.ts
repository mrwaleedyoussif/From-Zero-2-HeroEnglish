/** Minimal types for arabic-persian-reshaper (MIT): joins Arabic letters into presentation forms. */
declare module "arabic-persian-reshaper" {
  export const ArabicShaper: { convertArabic(text: string): string };
  export const PersianShaper: { convertArabic(text: string): string };
}
