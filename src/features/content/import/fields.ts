import { z } from "zod";

/**
 * Field builders for sheet rows. Every failure message is an error code shown to the Owner
 * through `ContentErrors.<code>` with the column name and row number (SPEC §6).
 */
const blank = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : typeof v === "string" ? v.trim() : v;

export const CEFR = ["PreA1", "A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const GRADE_BANDS = ["K-2", "3-5", "6-8", "9-12"] as const;
export const STATUSES = ["active", "draft", "retired"] as const;

export const req = () =>
  z.preprocess(blank, z.string({ error: "required" }).min(1, "required").max(4000, "tooLong"));
export const opt = () => z.preprocess(blank, z.string().max(8000, "tooLong").optional());

/** Stable ids like GEN, GEN-GRAM-0001, L-GEN-GRAM-010, P-0001. */
export const id = () =>
  z.preprocess(
    blank,
    z.string({ error: "required" }).regex(/^[A-Za-z0-9][A-Za-z0-9_.-]{0,59}$/, "badId"),
  );
export const code = () =>
  z.preprocess(blank, z.string({ error: "required" }).regex(/^[A-Z0-9_]{2,20}$/, "badCode"));

function numberIn(min: number, max: number, integer: boolean) {
  const base = z.coerce.number({ error: integer ? "integer" : "number" });
  const n = integer ? base.int("integer") : base;
  return n.min(min, `range:${min}:${max}`).max(max, `range:${min}:${max}`);
}
export const int = (min: number, max: number) => z.preprocess(blank, numberIn(min, max, true));
export const intOpt = (min: number, max: number) =>
  z.preprocess(blank, numberIn(min, max, true).optional());
export const num = (min: number, max: number) => z.preprocess(blank, numberIn(min, max, false));
export const numDefault = (min: number, max: number, d: number) =>
  z.preprocess(blank, numberIn(min, max, false).default(d));
export const intDefault = (min: number, max: number, d: number) =>
  z.preprocess(blank, numberIn(min, max, true).default(d));

export function oneOf<const T extends readonly [string, ...string[]]>(values: T) {
  return z.preprocess(blank, z.enum(values, { error: `oneOf:${values.join("|")}` }));
}
export function oneOfOpt<const T extends readonly [string, ...string[]]>(values: T) {
  return z.preprocess(blank, z.enum(values, { error: `oneOf:${values.join("|")}` }).optional());
}
export function oneOfDefault<const T extends readonly [string, ...string[]]>(
  values: T,
  d: T[number],
) {
  return z.preprocess(blank, z.enum(values, { error: `oneOf:${values.join("|")}` }).default(d));
}

/** "a;b; c" → ["a", "b", "c"] (cells list values with ";"). */
export const list = () =>
  z.preprocess(
    (v) =>
      typeof v === "string"
        ? v
            .split(";")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    z.array(z.string().max(200, "tooLong")).max(50, "tooMany"),
  );

export const isUrl = (v: string) => /^https?:\/\/\S+$/i.test(v);
