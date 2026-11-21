/**
 * Automatic scoring per item type (DATA_TEMPLATES): `correct` holds letters ("C", "A;C") or
 * accepted answers separated by "|" ("went|had gone"). Productive prompts return null —
 * a teacher scores them with a rubric.
 */
export type ItemType =
  | "mcq_single"
  | "mcq_multi"
  | "true_false"
  | "gap_fill"
  | "matching"
  | "ordering"
  | "short_answer"
  | "writing_prompt"
  | "speaking_prompt";

export const PRODUCTIVE_TYPES: ReadonlySet<ItemType> = new Set([
  "writing_prompt",
  "speaking_prompt",
]);

/** Lower-case, trim, single spaces, straight quotes, no trailing punctuation. */
export function normalizeText(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?,;:]+$/, "");
}

function letters(s: string): string[] {
  return [
    ...new Set(
      s
        .toUpperCase()
        .split(/[;,\s]+/)
        .filter(Boolean),
    ),
  ].sort();
}

export function isCorrect(
  type: ItemType,
  key: string | null,
  answer: string | readonly string[],
): boolean | null {
  if (PRODUCTIVE_TYPES.has(type)) return null;
  if (!key) return false;
  const given = Array.isArray(answer) ? answer.join(";") : String(answer);
  switch (type) {
    case "mcq_single":
    case "true_false":
    case "mcq_multi":
      return letters(given).join(";") === letters(key).join(";") && letters(given).length > 0;
    case "gap_fill":
    case "short_answer":
      return key
        .split("|")
        .some(
          (accepted) => normalizeText(accepted) === normalizeText(given) && given.trim() !== "",
        );
    case "matching":
    case "ordering":
      return (
        normalizeText(given).replace(/\s*([;,-])\s*/g, "$1") ===
        normalizeText(key).replace(/\s*([;,-])\s*/g, "$1")
      );
    default:
      return false;
  }
}
