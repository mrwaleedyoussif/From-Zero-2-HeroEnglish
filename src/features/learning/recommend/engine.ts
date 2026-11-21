/**
 * Lesson recommendations (SPEC §8): rules first, simple additive scoring.
 *   score = gap weight + level fit + interest overlap + format preference + novelty − repetition
 * Teacher-assigned lessons are not ranked here: they always come first (the "From my teacher" list).
 * Formats are preferences to vary content, never labels — the top picks always mix formats.
 */

export const CEFR_ORDER = ["PreA1", "A1", "A2", "B1", "B2", "C1", "C2"] as const;

export const WEIGHTS = {
  gapMax: 2, // a skill ≥ GAP_FULL logits below the learner's overall level
  gapFull: 1.5,
  interestPerTag: 1,
  interestMax: 2,
  format: 1,
  novelty: 1,
  done: -3,
  recent: -1, // opened in the last RECENT_DAYS days
  recentDays: 3,
} as const;

export interface Learner {
  /** CEFR index (0 = PreA1) of the learner's level in the lesson's department, if placed. */
  level: number | null;
  /** Skill id → how far (logits) the skill sits below the overall level; positive = gap. */
  skillGaps: ReadonlyMap<string, number>;
  interests: readonly string[];
  formats: readonly string[];
}

export interface CandidateLesson {
  id: string;
  skillId: string;
  cefr: string | null;
  tags: readonly string[];
  format: string;
}

export interface LessonHistory {
  status: "in_progress" | "done";
  lastOpenedAt: Date;
}

export type Reason = "gap" | "level" | "interest" | "format" | "new";

export interface Scored {
  id: string;
  score: number;
  reasons: Reason[];
}

export const cefrIndex = (cefr: string | null): number | null => {
  const i = CEFR_ORDER.indexOf(cefr as (typeof CEFR_ORDER)[number]);
  return i === -1 ? null : i;
};

/** Level fit: right level best, one above (a stretch) next, one below next, further away negative. */
export function levelFit(lesson: number | null, learner: number | null): number {
  if (lesson === null || learner === null) return 0;
  const d = lesson - learner;
  if (d === 0) return 2;
  if (d === 1) return 1.5;
  if (d === -1) return 1;
  return -Math.abs(d);
}

export function scoreLesson(
  lesson: CandidateLesson,
  learner: Learner,
  history: LessonHistory | undefined,
  now: Date,
): Scored {
  const reasons: Reason[] = [];
  const gap = Math.max(0, learner.skillGaps.get(lesson.skillId) ?? 0);
  const gapScore = (Math.min(gap, WEIGHTS.gapFull) / WEIGHTS.gapFull) * WEIGHTS.gapMax;
  if (gapScore >= 1) reasons.push("gap");

  const fit = levelFit(cefrIndex(lesson.cefr), learner.level);
  if (fit >= 1.5) reasons.push("level");

  const interests = new Set(learner.interests.map((t) => t.toLowerCase()));
  const overlap = lesson.tags.filter((t) => interests.has(t.toLowerCase())).length;
  const interestScore = Math.min(overlap * WEIGHTS.interestPerTag, WEIGHTS.interestMax);
  if (overlap > 0) reasons.push("interest");

  const formatScore = learner.formats.includes(lesson.format) ? WEIGHTS.format : 0;
  if (formatScore) reasons.push("format");

  let historyScore: number = WEIGHTS.novelty;
  if (!history) reasons.push("new");
  else {
    historyScore = history.status === "done" ? WEIGHTS.done : 0;
    const days = (now.getTime() - history.lastOpenedAt.getTime()) / 86_400_000;
    if (days < WEIGHTS.recentDays) historyScore += WEIGHTS.recent;
  }

  const score = gapScore + fit + interestScore + formatScore + historyScore;
  return { id: lesson.id, score: Math.round(score * 100) / 100, reasons };
}

/**
 * Pick `n` lessons by score, varying formats: no format takes more than `maxPerFormat` places
 * while other formats still have candidates. Ties break by id for stable output.
 */
export function mixFormats<T extends { score: number; id: string; format: string }>(
  ranked: readonly T[],
  n: number,
  maxPerFormat = 2,
): T[] {
  const sorted = [...ranked].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const picked: T[] = [];
  const perFormat = new Map<string, number>();
  for (const l of sorted) {
    if (picked.length === n) break;
    const used = perFormat.get(l.format) ?? 0;
    if (used >= maxPerFormat) continue;
    picked.push(l);
    perFormat.set(l.format, used + 1);
  }
  // Not enough variety in the pool: fill the rest by score.
  for (const l of sorted) {
    if (picked.length === n) break;
    if (!picked.includes(l)) picked.push(l);
  }
  return picked;
}

export function recommend(
  lessons: readonly CandidateLesson[],
  learner: Learner,
  history: ReadonlyMap<string, LessonHistory>,
  assigned: ReadonlySet<string>,
  now: Date,
  n = 6,
): (Scored & { format: string })[] {
  const scored = lessons
    .filter((l) => !assigned.has(l.id))
    .map((l) => ({ ...scoreLesson(l, learner, history.get(l.id), now), format: l.format }));
  return mixFormats(scored, n);
}
