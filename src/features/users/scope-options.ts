import type { Option } from "@/components/field";
import { localName } from "@/lib/i18n-names";
import type { SchoolStructure } from "./queries";

/** Scope choices for role/override pickers, encoded "type:id". */
export function scopeOptions(
  structure: SchoolStructure | null,
  labels: { platform: string; self: string; school: string; grade: string; class: string },
  locale: string,
  opts: { platform: boolean; self: boolean },
): Option[] {
  const options: Option[] = [];
  if (opts.platform) options.push({ value: "platform:", label: labels.platform });
  if (structure?.school) {
    options.push({
      value: `school:${structure.school.id}`,
      label: `${labels.school}: ${structure.school.code}`,
    });
    for (const g of structure.grades) {
      options.push({ value: `grade:${g.id}`, label: `${labels.grade}: ${localName(g, locale)}` });
    }
    for (const c of structure.classes) {
      options.push({ value: `class:${c.id}`, label: `${labels.class}: ${c.code}` });
    }
  }
  if (opts.self) options.push({ value: "self:", label: labels.self });
  return options;
}
