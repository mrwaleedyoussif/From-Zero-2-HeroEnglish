/**
 * Schools for the home page's "choose your school and branch" step. A school row named
 * "Andalus International Schools · Taif Boys" is the branch "Taif Boys" of the school
 * "Andalus International Schools": the Owner names schools this way in Owner → Schools
 * (" · ", " - " or " | " between the two parts). A name without a branch part is one school.
 */
export interface SchoolRow {
  code: string;
  name_en: string;
  name_ar: string;
}
export interface Named {
  en: string;
  ar: string;
}
export interface BranchChoice {
  code: string;
  name: Named | null;
}
export interface SchoolChoice {
  name: Named;
  branches: BranchChoice[];
}

const SEPARATOR = /\s+[·•|–—-]\s+/;

function split(name: string): [school: string, branch: string | null] {
  const [school = name, ...rest] = name.trim().split(SEPARATOR);
  return [school.trim(), rest.length ? rest.join(" · ").trim() : null];
}

export function groupSchools(rows: readonly SchoolRow[]): SchoolChoice[] {
  const bySchool = new Map<string, SchoolChoice>();
  for (const row of rows) {
    const [en, branchEn] = split(row.name_en);
    const [ar, branchAr] = split(row.name_ar);
    const school = bySchool.get(en) ?? { name: { en, ar }, branches: [] };
    school.branches.push({
      code: row.code,
      name: branchEn ? { en: branchEn, ar: branchAr ?? branchEn } : null,
    });
    bySchool.set(en, school);
  }
  return [...bySchool.values()]
    .map((s) => ({
      ...s,
      branches: s.branches.sort((a, b) => (a.name?.en ?? "").localeCompare(b.name?.en ?? "")),
    }))
    .sort((a, b) => a.name.en.localeCompare(b.name.en));
}
