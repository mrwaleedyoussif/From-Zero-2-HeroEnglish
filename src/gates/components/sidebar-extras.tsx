import { ArrowRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { audienceFor, departmentHref } from "@/features/departments/catalog";
import { allDepartments, departmentsFor } from "@/features/departments/states";
import { departmentIcon } from "@/features/departments/icons";
import { Link } from "@/i18n/navigation";
import { canSomewhere } from "@/lib/auth/can";
import type { Actor } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isVisible } from "@/lib/visibility/server";
import type { SidebarBlock } from "../types";
import "@/features/departments/components/department-grid.css";

/** One tap back to learning: lessons once the learner has a level, the level test before. */
async function Continue({ actor }: { actor: Actor }) {
  const t = await getTranslations("Journey");
  const db = await createClient();
  const { count } = await db
    .from("ability_estimates")
    .select("student_id", { count: "exact", head: true })
    .eq("student_id", actor.effective.id);
  // While the level test is switched off, Continue always leads to learning.
  const placed = (count ?? 0) > 0 || !(await isVisible(actor, "module.placement"));
  return (
    <Link
      href={placed ? "/student/lessons" : "/student/placement"}
      data-sidebar="continue"
      className="flex min-h-11 items-center justify-between gap-2 rounded-xl bg-[linear-gradient(110deg,#f6dc9c,#e2bd72)] px-3 text-sm font-bold text-[#1a1304] hover:brightness-105"
    >
      {placed ? t("continue") : t("findLevel")}
      <ArrowRight aria-hidden className="size-4 rtl:rotate-180" />
    </Link>
  );
}

/** The person's departments, each in its colour; "Soon" until it opens. */
async function Departments({ actor }: { actor: Actor }) {
  const staff = await canSomewhere(actor, "content:view");
  const schoolId = actor.effective.school_id;
  const db = await createClient();
  const { data: school } =
    staff || !schoolId
      ? { data: null }
      : await db.from("schools").select("code, name_en").eq("id", schoolId).maybeSingle();
  const audience = school && audienceFor(school);
  if (!staff && !audience) return null;
  const list = staff ? allDepartments() : audience ? await departmentsFor(audience) : [];
  const locale = (await getLocale()) === "ar" ? "ar" : "en";
  const t = await getTranslations({ locale, namespace: "Departments" });
  return (
    <details data-sidebar="departments" className="rounded-xl border border-border">
      <summary className="flex min-h-10 cursor-pointer items-center px-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {t("mine")}
      </summary>
      <ul className="flex flex-col gap-0.5 p-1.5 pt-0">
        {list.map((d) => {
          const Icon = departmentIcon(d.key);
          return (
            <li key={d.key} data-hue={d.hue} className="flex items-center gap-2 px-1 py-1 text-sm">
              <span aria-hidden className="icon-tile size-7 rounded-lg">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1 truncate">{t(`names.${d.key}`)}</span>
              {d.soon ? (
                <span className="dept-soon rounded-full px-1.5 text-[11px] font-semibold">
                  {t("soon")}
                </span>
              ) : (
                departmentHref(d) && (
                  <Link
                    href={departmentHref(d) ?? ""}
                    className="dept-soon rounded-full px-2 py-0.5 text-[11px] font-bold hover:underline"
                  >
                    {t("open")}
                  </Link>
                )
              )}
            </li>
          );
        })}
      </ul>
    </details>
  );
}

const BLOCKS: Record<SidebarBlock, (props: { actor: Actor }) => Promise<React.ReactNode>> = {
  continue: Continue,
  departments: Departments,
};

/** The blocks a gate's config asks for, above its menu. */
export function SidebarExtras({
  blocks,
  actor,
}: {
  blocks: readonly SidebarBlock[];
  actor: Actor;
}) {
  return blocks.map((block) => {
    const Block = BLOCKS[block];
    return <Block key={block} actor={actor} />;
  });
}
