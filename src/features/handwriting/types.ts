export const STYLES = ["print", "cursive"] as const;
export type Style = (typeof STYLES)[number];
export const isStyle = (v: string): v is Style => (STYLES as readonly string[]).includes(v);
export type Stage = "letters" | "joins" | "words" | "sentences" | "paragraphs";
export type { Mode } from "./strokes/grade";
