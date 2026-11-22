/**
 * Registry (SPEC §4): a stable key for every gate, module, page, nav item, widget, feature
 * and limit — including ones planned for later phases. Visibility rules, feature flags,
 * entitlements and gate configs refer to these keys only. Keys are permanent: never
 * rename or reuse one. Labels live in messages under `Registry.<key>`.
 */

export type RegistryKind = "gate" | "module" | "page" | "nav" | "widget" | "feature" | "limit";

export interface RegistryEntry<K extends string = string> {
  readonly key: K;
  readonly kind: RegistryKind;
  /** Visibility when no rule matches (lowest precedence). */
  readonly defaultVisible: boolean;
  /** Build phase that delivers it (docs/PHASES.md). Later phases render a placeholder. */
  readonly phase: number;
}

function group<const K extends readonly string[], Kind extends RegistryKind>(
  kind: Kind,
  phase: number,
  keys: K,
  defaultVisible = true,
) {
  return keys.map((k) => ({
    key: `${kind}.${k}` as `${Kind}.${K[number]}`,
    kind,
    phase,
    defaultVisible,
  }));
}

/** Pages and their nav items share names: page.teacher.home ↔ nav.teacher.home. */
function pages<const K extends readonly string[]>(phase: number, keys: K) {
  return [...group("page", phase, keys), ...group("nav", phase, keys)];
}

export const registry = [
  ...group("gate", 2, ["owner", "leadership", "coach", "teacher", "student"]),

  ...group("module", 1, ["core"]),
  ...group("module", 2, ["billing"]),
  ...group("module", 3, ["content"]),
  ...group("module", 4, ["placement"]),
  ...group("module", 5, ["learning"]),
  ...group("module", 6, ["rewards"]),
  ...group("module", 7, ["dashboards", "supervision"]),
  ...group("module", 8, ["reports"]),
  ...group("module", 99, ["ai"], false),

  ...pages(1, [
    "owner.schools",
    "owner.users",
    "owner.import",
    "owner.roles",
    "owner.supervision",
    "owner.audit",
  ]),
  ...pages(2, [
    "owner.home",
    "owner.visibility",
    "owner.plans",
    "leadership.home",
    "coach.home",
    "teacher.home",
    "student.home",
  ]),
  ...pages(3, ["owner.content", "owner.integrations", "teacher.library"]),
  ...pages(4, ["student.placement", "teacher.placement"]),
  ...pages(5, ["teacher.assignments", "teacher.groups", "student.lessons", "student.profile"]),
  ...pages(6, ["student.rewards", "teacher.rewards", "owner.rewards"]),
  ...pages(7, ["coach.coachingLog", "leadership.supervision"]),
  ...pages(8, ["owner.reports", "leadership.reports"]),

  ...group("widget", 2, ["owner.schools", "owner.auditLog"]),
  ...group("widget", 4, ["student.placementCta"]),
  ...group("widget", 5, [
    "teacher.assignmentTracker",
    "teacher.suggestedGroups",
    "teacher.quickActions",
    "student.fromMyTeacher",
    "student.recommended",
  ]),
  ...group("widget", 6, ["student.streak", "student.badges", "student.leaderboard"]),
  ...group("widget", 7, [
    "teacher.classRoster",
    "teacher.atRiskStudents",
    "teacher.skillHeatmap",
    "coach.supportedTeachers",
    "coach.coachingFollowUps",
    "coach.growthVsSchool",
    "leadership.schoolOverview",
    "leadership.gradeComparison",
    "leadership.placementDistribution",
    "leadership.engagement",
    "leadership.teacherUsage",
    "leadership.interventionList",
    "leadership.supervisionTree",
    "owner.budgetMeters",
    "owner.contentHealth",
    "student.progress",
  ]),
  ...group("widget", 8, ["leadership.reportArchive"]),

  ...group("feature", 4, ["placementWriting", "placementSpeaking"]),
  ...group("feature", 6, ["leaderboards", "coins", "streaks", "kaganTeams"]),
  ...group("feature", 99, ["webPush", "parentGate"], false),

  ...group("limit", 2, ["students", "staff", "aiScoringPerMonth"]),
] as const satisfies readonly RegistryEntry[];

export type RegistryKey = (typeof registry)[number]["key"];

/** Content-driven keys (Phase 3+) that cannot be listed statically. */
export const dynamicPrefixes = ["department.", "collection.", "test."] as const;

/** Any key visibility rules may target: a registry key or a dynamic content key. */
export type VisibilityKey = RegistryKey | `${(typeof dynamicPrefixes)[number]}${string}`;

const byKey = new Map<string, RegistryEntry>(registry.map((e) => [e.key, e]));

export function registryEntry(key: string): RegistryEntry | undefined {
  return byKey.get(key);
}

export function isKnownKey(key: string): key is VisibilityKey {
  return byKey.has(key) || dynamicPrefixes.some((p) => key.startsWith(p) && key.length > p.length);
}

/** Default visibility: registry default, or visible for dynamic content keys. */
export function defaultVisibility(key: string): boolean {
  return byKey.get(key)?.defaultVisible ?? true;
}
