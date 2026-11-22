export type SuggestionKey =
  "contactAtRisk" | "remindAssignments" | "practiceSkill" | "followUps" | "checkInTeachers";

/** The stored content of one report (reports.data). Sections appear only when the recipient's
 * scope produced data for them — never chosen by role (SPEC §12 content per role). */
export interface ReportData {
  period: "weekly" | "monthly";
  start: string;
  end: string;
  school: string;
  classes: {
    code: string;
    students: number;
    active: number;
    lessons: number;
    accuracy: number | null;
    atRisk: number;
    overdue: number;
    growth: number | null;
  }[];
  improvers: { name: string; class: string; gain: number }[];
  atRisk: { name: string; class: string; flags: string[] }[];
  assignments: { class: string; assigned: number; done: number }[];
  skillGaps: { class: string; skill: string; theta: number }[];
  teachers: { name: string; assignments: number; kudos: number; lastSignIn: string | null }[];
  followUps: { teacher: string; date: string }[];
  cefr: { cefr: string; n: number; change: number | null }[];
  coaching: { coach: string; teacher: string; date: string }[];
  suggestions: { key: SuggestionKey; params: Record<string, string | number> }[];
}

/** Key numbers for the digest email and the archive list. */
export function headline(d: ReportData) {
  const students = d.classes.reduce((s, c) => s + c.students, 0);
  const active = d.classes.reduce((s, c) => s + c.active, 0);
  return {
    classes: d.classes.length,
    students,
    activePct: students ? Math.round((active / students) * 100) : 0,
    lessons: d.classes.reduce((s, c) => s + c.lessons, 0),
    atRisk: d.classes.reduce((s, c) => s + c.atRisk, 0),
    followUps: d.followUps.length,
  };
}

/** Next-week suggestions from the data (rules, SPEC §12 "suggested actions"). */
export function suggest(d: Omit<ReportData, "suggestions">): ReportData["suggestions"] {
  const out: ReportData["suggestions"] = [];
  if (d.atRisk.length) out.push({ key: "contactAtRisk", params: { n: d.atRisk.length } });
  for (const a of d.assignments)
    if (a.assigned > 0 && a.done / a.assigned < 0.6)
      out.push({ key: "remindAssignments", params: { cls: a.class } });
  const weakest = [...d.skillGaps].sort((a, b) => a.theta - b.theta)[0];
  if (weakest)
    out.push({ key: "practiceSkill", params: { cls: weakest.class, skill: weakest.skill } });
  if (d.followUps.length) out.push({ key: "followUps", params: { n: d.followUps.length } });
  const quiet = d.teachers.filter((t) => t.assignments === 0).length;
  if (quiet) out.push({ key: "checkInTeachers", params: { n: quiet } });
  return out.slice(0, 5);
}
