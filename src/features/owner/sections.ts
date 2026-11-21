/**
 * Owner console sections and the permission each needs. Phase 2 moves these into the
 * owner gate config + registry keys; until then this is the single list.
 */
export const consoleSections = [
  { key: "schools", href: "/owner/schools", permission: "schools:view" },
  { key: "users", href: "/owner/users", permission: "users:view" },
  { key: "import", href: "/owner/users/import", permission: "users:import" },
  { key: "roles", href: "/owner/roles", permission: "roles:view" },
  { key: "supervision", href: "/owner/supervision", permission: "supervision:view" },
  { key: "audit", href: "/owner/audit", permission: "audit:view" },
] as const;

export type ConsoleSection = (typeof consoleSections)[number];
