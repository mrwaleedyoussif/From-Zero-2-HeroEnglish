import { getTranslations } from "next-intl/server";
import { GateSidebar } from "@/gates/components/gate-sidebar";

const LINKS = [
  ["home", "/", "sideHome"],
  ["learner", "/learner", "sideLearner"],
  ["studentLogin", "/student-login", "sideStudent"],
  ["staffLogin", "/login", "sideStaff"],
  ["departments", "/departments/general", "sideDepartments"],
] as const;

/**
 * The menu of the public pages (home, sign-in, departments): the same sidebar as inside the
 * portals, with the ways in. On a phone it is the bar at the bottom.
 */
export async function PublicSidebar() {
  const t = await getTranslations("Shell");
  const tg = await getTranslations("Gates");
  return (
    <GateSidebar
      labels={{
        nav: tg("navLabel"),
        collapse: tg("collapse"),
        expand: tg("expand"),
        more: tg("more"),
      }}
      profile={{ initials: "", name: t("appName"), line: t("sideLine"), image: "/brand/badge.png" }}
      items={LINKS.map(([icon, href, label]) => ({ icon, href, label: t(label) }))}
    />
  );
}
