import { Andika, Playwrite_US_Trad } from "next/font/google";

// The model letters. Andika is drawn for people learning to read and write (clear a, g, l, I);
// Playwrite US Trad is the looped, joined school hand. Loaded only on the handwriting pages.
const print = Andika({ subsets: ["latin"], weight: "400", preload: false });
const cursive = Playwrite_US_Trad({ weight: "400" });

export const STYLES = ["print", "cursive"] as const;
export type Style = (typeof STYLES)[number];
export const isStyle = (v: string): v is Style => (STYLES as readonly string[]).includes(v);
export const familyOf = (style: Style) => (style === "print" ? print : cursive).style.fontFamily;
export const fontClass = (style: Style) => (style === "print" ? print : cursive).className;
