import { type Level, LEVELS } from "./schema";

export interface Step {
  id: string;
  level: Level;
  unit: number;
  done: boolean;
}

/**
 * Which units a learner may open, in course order. Levels below the learner's level are open;
 * from their level on they go one unit at a time: the first unit at their level is open, and
 * each later unit opens when the one before it is finished. Higher levels stay closed until the
 * learner reaches them. A finished unit always stays open for review. With no level yet, the
 * learner starts at the beginning of the course.
 */
export function openUnits(steps: readonly Step[], level: Level | null): Set<string> {
  const from = level ? LEVELS.indexOf(level) : 0;
  const start = steps.findIndex((s) => LEVELS.indexOf(s.level) >= from);
  const open = new Set<string>();
  steps.forEach((s, i) => {
    if (s.done || start < 0 || i <= start || steps[i - 1]?.done) open.add(s.id);
  });
  return open;
}

/** The placement result (A1…C2) as a course level; anything else means "no level yet". */
export const courseLevel = (cefr: string | null | undefined): Level | null =>
  (LEVELS as readonly string[]).includes(cefr ?? "") ? (cefr as Level) : null;
