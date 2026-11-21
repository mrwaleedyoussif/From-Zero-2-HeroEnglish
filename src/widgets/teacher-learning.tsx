import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { shownStatus } from "@/features/learning/lessons/queries";
import {
  assignableLessons,
  myClasses,
  roster,
  skillNames,
  tracker,
} from "@/features/learning/teacher/queries";
import { classSuggestions } from "@/features/learning/teacher/suggestions";
import { Link } from "@/i18n/navigation";
import { canSomewhere } from "@/lib/auth/can";
import { localName } from "@/lib/i18n-names";
import type { WidgetProps } from ".";

/** Teacher home: latest assignments per class with done / total and overdue counts. */
export async function TeacherAssignmentTrackerWidget({ actor }: WidgetProps) {
  const t = await getTranslations("Registry");
  const ta = await getTranslations("Assign");
  const locale = await getLocale();
  const classes = await myClasses(actor, "lessons:assign");
  const rows = (
    await Promise.all(
      classes.map(async (c) => (await tracker(c.id)).slice(0, 3).map((a) => ({ ...a, cls: c }))),
    )
  ).flat();
  return (
    <Card data-widget="widget.teacher.assignmentTracker">
      <CardHeader>
        <CardTitle className="text-base">{t("widget.teacher.assignmentTracker")}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 && <p className="text-sm text-muted-foreground">{ta("noneYet")}</p>}
        <ul className="flex flex-col gap-1 text-sm">
          {rows.map((a) => {
            const p = a.assignment_progress;
            const doneCount = p.filter((x) => x.status === "done").length;
            const late = p.filter((x) => shownStatus(x.status, a.due_at) === "overdue").length;
            return (
              <li key={a.id} className="flex justify-between gap-2" data-tracker={a.lessons?.code}>
                <Link
                  href={`/teacher/assignments?class=${a.cls.id}`}
                  className="text-primary hover:underline"
                >
                  {a.cls.code} · {locale === "ar" ? a.lessons?.title_ar : a.lessons?.title_en}
                </Link>
                <span className="text-muted-foreground">
                  {doneCount}/{p.length}
                  {late ? ` · ${ta("overdueCount", { n: late })}` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

/** Teacher home: the biggest "weak in the same skill" group per class. */
export async function TeacherSuggestedGroupsWidget({ actor }: WidgetProps) {
  const t = await getTranslations("Registry");
  const ta = await getTranslations("Assign");
  const locale = await getLocale();
  const [classes, lessons, skills] = await Promise.all([
    myClasses(actor, "lessons:assign"),
    assignableLessons(actor),
    skillNames(),
  ]);
  const top = await Promise.all(
    classes.map(async (c) => ({
      cls: c,
      s: (await classSuggestions(await roster(c.id), lessons))[0],
    })),
  );
  const shown = top.filter((x) => x.s);
  return (
    <Card data-widget="widget.teacher.suggestedGroups">
      <CardHeader>
        <CardTitle className="text-base">{t("widget.teacher.suggestedGroups")}</CardTitle>
      </CardHeader>
      <CardContent>
        {shown.length === 0 && (
          <p className="text-sm text-muted-foreground">{ta("noSuggestions")}</p>
        )}
        <ul className="flex flex-col gap-1 text-sm">
          {shown.map(({ cls, s }) => {
            const skill = s ? skills.get(s.skillId) : undefined;
            return (
              <li key={cls.id}>
                <Link
                  href={`/teacher/assignments?class=${cls.id}`}
                  className="text-primary hover:underline"
                >
                  {cls.code}:{" "}
                  {ta("weakIn", {
                    count: s?.studentIds.length ?? 0,
                    skill: skill ? localName(skill, locale) : "",
                  })}
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

/** Teacher home: shortcuts to the actions the teacher may take. */
export async function TeacherQuickActionsWidget({ actor }: WidgetProps) {
  const t = await getTranslations("Registry");
  const links = [
    { perm: "lessons:assign", href: "/teacher/assignments", key: "nav.teacher.assignments" },
    { perm: "students:edit", href: "/teacher/groups", key: "nav.teacher.groups" },
    { perm: "content:view", href: "/teacher/library", key: "nav.teacher.library" },
    { perm: "placement:view_results", href: "/teacher/placement", key: "nav.teacher.placement" },
  ];
  const allowed = [];
  for (const l of links) if (await canSomewhere(actor, l.perm)) allowed.push(l);
  return (
    <Card data-widget="widget.teacher.quickActions">
      <CardHeader>
        <CardTitle className="text-base">{t("widget.teacher.quickActions")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {allowed.map((l) => (
          <Button key={l.href} asChild variant="outline" size="sm">
            <Link href={l.href}>{t(l.key)}</Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
