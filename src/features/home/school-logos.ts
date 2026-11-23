/**
 * Logos of the school groups, matched by name (the app has no logo upload yet): any school
 * whose English name contains all of a logo's words gets it, e.g. "Andalus International
 * Schools · Taif Boys" or "Al-Andalus Private School · Primary Taif Boys".
 */
const LOGOS: readonly { words: readonly string[]; src: string }[] = [
  { words: ["andalus", "international"], src: "/brand/schools/andalus-international.webp" },
  { words: ["andalus", "private"], src: "/brand/schools/alandalus-private.webp" },
];

export function schoolLogo(nameEn: string): string | null {
  const name = nameEn.toLowerCase().replace(/[^a-z ]/g, "");
  return LOGOS.find((l) => l.words.every((w) => name.includes(w)))?.src ?? null;
}
