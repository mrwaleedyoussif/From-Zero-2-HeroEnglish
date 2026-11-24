/** Every text on the home page, in one language. The page shows two: the reader's and the other. */
export const HOME_KEYS = [
  "brand",
  "tagline",
  "start",
  "choose",
  "chooseSchool",
  "chooseBranch",
  "chooseRole",
  "general",
  "generalHint",
  "school",
  "schoolHint",
  "soon",
  "student",
  "studentHint",
  "staff",
  "staffHint",
  "back",
  "continueAs",
  "soundOn",
  "soundOff",
  "replay",
  "schoolLine",
  "schoolLine2",
  "designedBy",
  "designer",
] as const;

export type HomeKey = (typeof HOME_KEYS)[number];
export type HomeCopy = Record<HomeKey, string>;

export interface HomeTexts {
  /** The reader's language. */
  main: { lang: "en" | "ar"; copy: HomeCopy };
  /** The other language, shown smaller beside it (bilingual labels). */
  other: { lang: "en" | "ar"; copy: HomeCopy };
}

/** The steps of the choice, and the heading each one shows. */
export type Step = "who" | "school" | "branch" | "role";
export const STEP_HEADING: Record<Step, HomeKey> = {
  who: "choose",
  school: "chooseSchool",
  branch: "chooseBranch",
  role: "chooseRole",
};
