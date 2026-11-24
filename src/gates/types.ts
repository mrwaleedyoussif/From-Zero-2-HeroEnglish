/**
 * A gate is a portal (SPEC §4) — its own layout, nav, theme and home dashboard.
 * Entry is a permission (`gate:<key>`), never a role name, so the Owner controls it in
 * the Roles matrix. A gate can also be hidden with visibility key `gate.<key>`.
 */
export interface GateNavItem {
  /** Registry key (`nav.<gate>.<page>`); also the visibility key and the label key. */
  key: string;
  /** Path below the locale, e.g. "/teacher" or "/owner/users". */
  href: string;
  /** Optional extra permission needed to see this item. */
  permission?: string;
  /** Optional menu section (label key `Gates.groups.<group>`); consecutive items share one. */
  group?: string;
}

export interface GateConfig {
  key: string;
  basePath: `/${string}`;
  permission: `gate:${string}`;
  /** Lower = preferred landing gate when a user can enter several. */
  priority: number;
  theme: "staff" | "student";
  nav: readonly GateNavItem[];
  /** Registry widget keys shown on the gate home, in order. */
  homeWidgets: readonly string[];
}

export function defineGate<const G extends GateConfig>(gate: G): G {
  return gate;
}
