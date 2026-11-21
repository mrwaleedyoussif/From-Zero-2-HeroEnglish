/**
 * Teacher "smart suggestions" (SPEC §9): students who share a weak skill, with lessons for them.
 * "These 6 students are weak in past-tense grammar → suggested lessons" — approved with one click.
 */
import { type CandidateLesson, cefrIndex } from "./engine.ts";

export interface StudentSkills {
  id: string;
  /** CEFR index of the student's level, if placed. */
  level: number | null;
  /** Skill id → gap in logits below the student's overall level (positive = weaker). */
  gaps: ReadonlyMap<string, number>;
}

export interface Suggestion {
  skillId: string;
  studentIds: string[];
  /** Most common level among those students (lessons are picked at this level). */
  level: number | null;
  lessonIds: string[];
}

export const GAP_THRESHOLD = 0.5;
export const MIN_STUDENTS = 2;

function modeLevel(levels: readonly (number | null)[]): number | null {
  const counts = new Map<number, number>();
  for (const l of levels) if (l !== null) counts.set(l, (counts.get(l) ?? 0) + 1);
  let best: number | null = null;
  let bestCount = 0;
  for (const [level, c] of counts) {
    if (c > bestCount || (c === bestCount && best !== null && level < best)) {
      best = level;
      bestCount = c;
    }
  }
  return best;
}

export function suggestGroups(
  students: readonly StudentSkills[],
  lessons: readonly CandidateLesson[],
  lessonsPerSuggestion = 3,
): Suggestion[] {
  const bySkill = new Map<string, StudentSkills[]>();
  for (const s of students)
    for (const [skill, gap] of s.gaps)
      if (gap >= GAP_THRESHOLD) bySkill.set(skill, [...(bySkill.get(skill) ?? []), s]);

  const out: Suggestion[] = [];
  for (const [skillId, group] of bySkill) {
    if (group.length < MIN_STUDENTS) continue;
    const level = modeLevel(group.map((s) => s.level));
    const distance = (l: CandidateLesson) => {
      const i = cefrIndex(l.cefr);
      return i === null || level === null ? 9 : Math.abs(i - level);
    };
    const lessonIds = lessons
      .filter((l) => l.skillId === skillId)
      .sort((a, b) => distance(a) - distance(b) || a.id.localeCompare(b.id))
      .slice(0, lessonsPerSuggestion)
      .map((l) => l.id);
    if (lessonIds.length === 0) continue;
    out.push({ skillId, studentIds: group.map((s) => s.id).sort(), level, lessonIds });
  }
  return out.sort(
    (a, b) => b.studentIds.length - a.studentIds.length || a.skillId.localeCompare(b.skillId),
  );
}
