/**
 * Visibility engine (SPEC §4). Pure: given the rules that apply to one user (from SQL
 * `visibility_rules_for`), decide whether a key is shown.
 *
 * Precedence (most specific wins): user > class > grade > school > role > plan > registry default.
 * Within one level, "hide" beats "show" (e.g. a teacher of two classes, one hidden).
 * Rules only count inside their [starts_at, ends_at) window.
 */

export const subjectTypes = ["user", "class", "grade", "school", "role", "plan"] as const;
export type SubjectType = (typeof subjectTypes)[number];

export interface VisibilityRule {
  id: string;
  target_key: string;
  subject_type: string;
  subject_id: string | null;
  effect: string;
  starts_at: string | null;
  ends_at: string | null;
}

export interface VisibilityDecision {
  visible: boolean;
  reason: "rule" | "default";
  rule?: VisibilityRule;
}

export function isLive(rule: VisibilityRule, now: Date): boolean {
  const t = now.getTime();
  if (rule.starts_at && new Date(rule.starts_at).getTime() > t) return false;
  if (rule.ends_at && new Date(rule.ends_at).getTime() <= t) return false;
  return true;
}

export function decide(
  rules: readonly VisibilityRule[],
  key: string,
  defaultVisible: boolean,
  now: Date = new Date(),
): VisibilityDecision {
  const live = rules.filter((r) => r.target_key === key && isLive(r, now));
  for (const level of subjectTypes) {
    const atLevel = live.filter((r) => r.subject_type === level);
    if (atLevel.length === 0) continue;
    const rule = atLevel.find((r) => r.effect === "hide") ?? atLevel[0];
    if (rule) return { visible: rule.effect === "show", reason: "rule", rule };
  }
  return { visible: defaultVisible, reason: "default" };
}

/** The rules a hypothetical subject set would receive (Studio tree: a class, grade or school node). */
export function rulesForSubjects(
  all: readonly VisibilityRule[],
  subjects: readonly { type: SubjectType; id: string }[],
): VisibilityRule[] {
  return all.filter((r) =>
    subjects.some((s) => s.type === r.subject_type && s.id === r.subject_id),
  );
}
