/**
 * Message namespaces that client components use (`useTranslations` in "use client" files).
 * Only these are sent to the browser — not the whole catalogue — which keeps every page,
 * especially Arabic ones, small. Add a namespace here when a client component starts using it.
 */
export const CLIENT_NAMESPACES = [
  "Auth",
  "Cards",
  "ContentErrors",
  "ContentSync",
  "Done",
  "ErrorPages",
  "Errors",
  "Import",
  "Integrations",
  "Learner",
  "Learning",
  "LocaleSwitcher",
  "Placement",
  "Rewards",
  "Roles",
  "SchoolTheme",
  "Shell",
  "ThemeToggle",
  "Units",
  "Users",
] as const;
