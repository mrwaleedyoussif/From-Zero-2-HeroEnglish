import { z } from "zod";

/** Mindset statements are answered 1 (disagree) … 4 (agree); fixed-mindset wording is reversed. */
export const MINDSET_SCALE = [1, 2, 3, 4] as const;

const keys = z.array(z.string().trim().min(1).max(40)).max(20);

export const profileInput = z.object({
  interests: keys,
  goals: keys,
  preferred_formats: keys,
  accommodations: keys,
  mindset_answers: z.record(z.string().max(20), z.number().int().min(1).max(4)),
  language_background: z.string().trim().max(200).optional(),
});
export type ProfileInput = z.infer<typeof profileInput>;

/** Growth-mindset score 0–100 from the answered statements, or null when none were answered. */
export function mindsetScore(
  answers: Readonly<Record<string, number>>,
  statements: readonly { key: string; reverse_scored: boolean }[],
): number | null {
  let total = 0;
  let n = 0;
  for (const s of statements) {
    const a = answers[s.key];
    if (a === undefined) continue;
    total += (s.reverse_scored ? 5 - a : a) - 1; // 0…3
    n++;
  }
  return n === 0 ? null : Math.round((total / (n * 3)) * 100);
}

/** Keep only option keys the Owner has defined (the browser could send anything). */
export function onlyKnown(values: readonly string[], allowed: ReadonlySet<string>): string[] {
  return [...new Set(values)].filter((v) => allowed.has(v));
}
