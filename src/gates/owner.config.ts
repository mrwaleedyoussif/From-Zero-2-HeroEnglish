import { defineGate } from "./types";

export const ownerGate = defineGate({
  key: "owner",
  basePath: "/owner",
  permission: "gate:owner",
  priority: 10,
  theme: "staff",
  nav: [
    { key: "nav.owner.home", href: "/owner" },
    { key: "nav.owner.schools", href: "/owner/schools", permission: "schools:view" },
    { key: "nav.owner.users", href: "/owner/users", permission: "users:view" },
    { key: "nav.owner.import", href: "/owner/users/import", permission: "users:import" },
    { key: "nav.owner.roles", href: "/owner/roles", permission: "roles:view" },
    { key: "nav.owner.supervision", href: "/owner/supervision", permission: "supervision:view" },
    { key: "nav.owner.visibility", href: "/owner/visibility", permission: "visibility:manage" },
    { key: "nav.owner.plans", href: "/owner/plans", permission: "billing:manage" },
    { key: "nav.owner.content", href: "/owner/content", permission: "content:import" },
    {
      key: "nav.owner.integrations",
      href: "/owner/integrations",
      permission: "integrations:manage",
    },
    { key: "nav.owner.audit", href: "/owner/audit", permission: "audit:view" },
  ],
  homeWidgets: [
    "widget.owner.schools",
    "widget.owner.auditLog",
    "widget.owner.budgetMeters",
    "widget.owner.contentHealth",
  ],
});
