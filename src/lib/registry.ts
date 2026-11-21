/**
 * Registry of every module, page, widget, nav item, feature, department and
 * content collection (SPEC §4). Visibility rules, entitlements and gates refer
 * to these keys only. Keys are permanent: never rename or reuse one.
 *
 * Filled in Phase 2; empty in Phase 0.
 */

export type RegistryKind =
  "module" | "page" | "widget" | "nav" | "feature" | "department" | "collection";

export interface RegistryEntry {
  /** Dotted stable key, e.g. `widget.teacher.atRiskStudents`. Starts with its kind. */
  readonly key: string;
  readonly kind: RegistryKind;
  /** Visibility when no rule matches (lowest precedence). */
  readonly defaultVisible: boolean;
  readonly description: string;
}

export const registry = [] as const satisfies readonly RegistryEntry[];

export type RegistryKey = (typeof registry)[number]["key"];
