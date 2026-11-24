/**
 * The departments each kind of learner is offered, in the Owner's order. Names live in the
 * "Departments" messages (English and Arabic); `inside` lists what a department contains.
 * A department stays `soon` until its content is loaded: shown, but not yet open.
 */
export const HUES = ["violet", "blue", "green", "amber", "rose", "teal", "pink", "orange"] as const;
export type Hue = (typeof HUES)[number];

export interface Department {
  key: string;
  hue: Hue;
  inside?: readonly string[];
  soon: boolean;
}

const dept = (key: string, hue: Hue, inside?: readonly string[]): Department => ({
  key,
  hue,
  inside,
  soon: true,
});

const PREP = ["units", "mockExams"] as const;
const SKILLS = [
  dept("phonics", "rose"),
  dept("listeningSpeaking", "blue"),
  dept("shadowing", "violet"),
  dept("readingWriting", "green"),
  dept("languageUsage", "amber", ["grammar", "vocabulary"]),
];
const EXAMS = [
  dept("step", "teal", PREP),
  dept("ielts", "pink", PREP),
  dept("sat", "orange", PREP),
  dept("gat", "violet", PREP),
];

export const AUDIENCES = ["general", "andalus-international"] as const;
export type Audience = (typeof AUDIENCES)[number];

export const CATALOG: Record<Audience, readonly Department[]> = {
  general: [...SKILLS, dept("handwriting", "blue"), ...EXAMS],
  "andalus-international": [
    ...SKILLS,
    dept("ghars", "green", ["wordLine", "performingArts"]),
    dept("mcgrawHill", "rose", ["grades3to12"]),
    dept("mapTest", "blue"),
    ...EXAMS,
  ],
};

export const isAudience = (value: string): value is Audience =>
  (AUDIENCES as readonly string[]).includes(value);

/**
 * Which list a school's people see, by the school's English name (as its logo is matched).
 * General learners have their own; a school without a list yet gets none.
 */
export function audienceFor(school: { code: string; name_en: string }): Audience | null {
  if (school.code === "GENERAL") return "general";
  const name = school.name_en.toLowerCase().replace(/[^a-z ]/g, "");
  return name.includes("andalus") && name.includes("international")
    ? "andalus-international"
    : null;
}
