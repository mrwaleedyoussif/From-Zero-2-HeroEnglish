import type { Option } from "@/components/field";
import { localName } from "@/lib/i18n-names";
import type { StudioData } from "./queries";

export interface SubjectLabels {
  user: string;
  class: string;
  grade: string;
  school: string;
  role: string;
  plan: string;
}

/** "type:id" options for rule/flag pickers, most specific first (matches precedence). */
export function subjectOptions(d: StudioData, l: SubjectLabels, locale: string): Option[] {
  const schoolCode = new Map(d.schools.map((s) => [s.id, s.code]));
  return [
    { value: "user:", label: l.user },
    ...d.classes.map((c) => ({
      value: `class:${c.id}`,
      label: `${l.class}: ${schoolCode.get(c.school_id) ?? ""} · ${c.code}`,
    })),
    ...d.grades.map((g) => ({
      value: `grade:${g.id}`,
      label: `${l.grade}: ${schoolCode.get(g.school_id) ?? ""} · ${localName(g, locale)}`,
    })),
    ...d.schools.map((s) => ({ value: `school:${s.id}`, label: `${l.school}: ${s.code}` })),
    ...d.roles.map((r) => ({ value: `role:${r.id}`, label: `${l.role}: ${localName(r, locale)}` })),
    ...d.plans.map((p) => ({ value: `plan:${p.id}`, label: `${l.plan}: ${localName(p, locale)}` })),
  ];
}

/** Human label for a rule's subject. */
export function subjectLabel(
  d: StudioData,
  type: string,
  id: string | null,
  locale: string,
): string {
  if (!id) return "—";
  const schoolCode = new Map(d.schools.map((s) => [s.id, s.code]));
  switch (type) {
    case "class": {
      const c = d.classes.find((x) => x.id === id);
      return c ? `${schoolCode.get(c.school_id) ?? ""} · ${c.code}` : id.slice(0, 8);
    }
    case "grade": {
      const g = d.grades.find((x) => x.id === id);
      return g ? `${schoolCode.get(g.school_id) ?? ""} · ${localName(g, locale)}` : id.slice(0, 8);
    }
    case "school":
      return schoolCode.get(id) ?? id.slice(0, 8);
    case "role": {
      const r = d.roles.find((x) => x.id === id);
      return r ? localName(r, locale) : id.slice(0, 8);
    }
    case "plan": {
      const p = d.plans.find((x) => x.id === id);
      return p ? localName(p, locale) : id.slice(0, 8);
    }
    default:
      return id.slice(0, 8);
  }
}
