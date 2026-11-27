/**
 * The departments each kind of learner is offered, in the Owner's order. Names live in the
 * "Departments" messages (English and Arabic); `inside` lists what a department contains.
 * `soon` here is only the default: the Owner opens, closes or hides each department per audience
 * (Owner → Departments, table department_states), and `departmentsFor` applies that choice.
 */
export const HUES = [
  "violet",
  "blue",
  "green",
  "amber",
  "rose",
  "teal",
  "pink",
  "orange",
  "indigo",
  "cyan",
  "lime",
  "fuchsia",
  "brown",
  "slate",
] as const;
export type Hue = (typeof HUES)[number];

export interface Department {
  key: string;
  hue: Hue;
  inside?: readonly string[];
  soon: boolean;
  /** The course units behind the department, once loaded (see features/units). */
  strand?: string;
  /** A department with several courses (STEP: four booklets) and its own page. */
  strands?: readonly string[];
  home?: string;
}

/** Where an open department leads inside the app. */
export const departmentHref = (d: Department) =>
  d.home ?? (d.strand ? `/student/units/${d.strand}` : undefined);

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
  // STEP Foundation: four booklets (Grammar, Reading, Listening, Composition) and mock exams.
  {
    ...dept("step", "teal", PREP),
    soon: false,
    strands: ["SG", "SR", "SL", "SC"],
    home: "/student/step",
  },
  dept("ielts", "pink", PREP),
  dept("sat", "orange", PREP),
  dept("gat", "fuchsia", PREP),
];

// Two handwriting departments: print letters and a joined (cursive) hand, each from letters to
// paragraphs with tracing and writing that are marked (see features/handwriting).
const HANDWRITING: Department[] = [
  { ...dept("handwriting", "cyan"), soon: false, home: "/student/handwriting/print" },
  { ...dept("cursiveHandwriting", "slate"), soon: false, home: "/student/handwriting/cursive" },
];

/** The course-unit strand behind a department, where general learners have one. */
const STRANDS: Partial<Record<string, string>> = {
  readingWriting: "RW",
  listeningSpeaking: "LS",
  shadowing: "SH",
  languageUsage: "LU",
};

export const AUDIENCES = ["general", "andalus-international"] as const;
export type Audience = (typeof AUDIENCES)[number];

export const CATALOG: Record<Audience, readonly Department[]> = {
  // General learners' four skill departments are open: their units are loaded (see STRANDS).
  general: [
    ...SKILLS.map((d) => (STRANDS[d.key] ? { ...d, soon: false, strand: STRANDS[d.key] } : d)),
    ...HANDWRITING,
    ...EXAMS,
  ],
  // School students get the same units as general learners, open unless the Owner closes them.
  "andalus-international": [
    ...SKILLS.map((d) => (STRANDS[d.key] ? { ...d, soon: false, strand: STRANDS[d.key] } : d)),
    ...HANDWRITING,
    dept("ghars", "lime", ["wordLine", "performingArts"]),
    dept("mcgrawHill", "brown", ["grades3to12"]),
    dept("mapTest", "indigo"),
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

export const DEPARTMENT_STATES = ["open", "soon", "hidden"] as const;
export type DepartmentState = (typeof DEPARTMENT_STATES)[number];

/** A department as learners of one audience see it, after the Owner's choice. */
export function applyStates(
  audience: Audience,
  chosen: ReadonlyMap<string, DepartmentState>,
): Department[] {
  return CATALOG[audience].flatMap((d) => {
    const state = chosen.get(d.key);
    if (state === "hidden") return [];
    return [state ? { ...d, soon: state === "soon" } : d];
  });
}
