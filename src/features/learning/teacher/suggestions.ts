import "server-only";
import { cefrIndex } from "../recommend/engine";
import { type StudentSkills, suggestGroups } from "../recommend/suggest";
import type { AssignableLesson, RosterStudent } from "./queries";
import { classAbilities } from "./queries";

/** "These students are weak in <skill> → suggested lessons" for one class (SPEC §9). */
export async function classSuggestions(students: RosterStudent[], lessons: AssignableLesson[]) {
  const rows = await classAbilities(students.map((s) => s.id));
  const input: StudentSkills[] = students.map((s) => {
    const mine = rows.filter((r) => r.student_id === s.id);
    const overall = new Map(
      mine.filter((r) => r.skill_id === null).map((r) => [r.department_id, r]),
    );
    const latestOverall = [...overall.values()].sort((a, b) =>
      b.measured_at.localeCompare(a.measured_at),
    )[0];
    const gaps = new Map<string, number>();
    for (const r of mine) {
      const o = overall.get(r.department_id);
      if (r.skill_id && o) gaps.set(r.skill_id, Number(o.theta) - Number(r.theta));
    }
    return { id: s.id, level: cefrIndex(latestOverall?.cefr ?? null), gaps };
  });
  return suggestGroups(
    input,
    lessons.map((l) => ({
      id: l.id,
      skillId: l.skill_id,
      cefr: l.cefr,
      tags: l.tags,
      format: l.format,
    })),
  );
}
