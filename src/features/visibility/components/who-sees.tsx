import { getLocale, getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { localName } from "@/lib/i18n-names";
import { defaultVisibility } from "@/lib/registry";
import { decide, rulesForSubjects, type SubjectType } from "@/lib/visibility/engine";
import type { StudioData } from "../queries";

type Subject = { type: SubjectType; id: string };

/**
 * "Who sees it": the key evaluated for each school → grade → class, and for each role on its own.
 * Individual user rules are shown in the rules list and in "Check a user".
 */
export async function WhoSees({ targetKey, data }: { targetKey: string; data: StudioData }) {
  const t = await getTranslations("Visibility");
  const locale = await getLocale();
  const def = defaultVisibility(targetKey);
  const freePlan = data.plans.find((p) => p.key === "free");
  const base: Subject[] = freePlan ? [{ type: "plan", id: freePlan.id }] : [];

  const mark = (subjects: Subject[]) => {
    const d = decide(rulesForSubjects(data.rules, subjects), targetKey, def);
    const why = d.rule ? t(`subjects.${d.rule.subject_type}`) : t("byDefault");
    return (
      <span className={d.visible ? "text-success" : "font-semibold text-destructive"}>
        {d.visible ? `✓ ${t("shown")}` : `✗ ${t("hidden")}`}{" "}
        <span className="text-xs text-muted-foreground">({why})</span>
      </span>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("whoSees")}</CardTitle>
        <CardDescription>{t("whoSeesHelp")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <ul className="flex flex-col gap-2 text-sm">
          {data.schools.map((s) => {
            const school: Subject[] = [...base, { type: "school", id: s.id }];
            return (
              <li key={s.id}>
                <div className="flex justify-between gap-2 font-medium">
                  {s.code} {mark(school)}
                </div>
                <ul className="ms-4 flex flex-col gap-1 border-s border-border ps-3">
                  {data.grades
                    .filter((g) => g.school_id === s.id)
                    .map((g) => {
                      const grade: Subject[] = [...school, { type: "grade", id: g.id }];
                      const classes = data.classes.filter((c) => c.grade_id === g.id);
                      return (
                        <li key={g.id}>
                          <div className="flex justify-between gap-2">
                            {localName(g, locale)} {mark(grade)}
                          </div>
                          <ul className="ms-4 flex flex-col gap-1 ps-3">
                            {classes.map((c) => (
                              <li
                                key={c.id}
                                className="flex justify-between gap-2"
                                data-class={c.code}
                              >
                                {c.code} {mark([...grade, { type: "class", id: c.id }])}
                              </li>
                            ))}
                          </ul>
                        </li>
                      );
                    })}
                </ul>
              </li>
            );
          })}
        </ul>
        <ul className="flex flex-col gap-1 text-sm">
          {data.roles.map((r) => (
            <li key={r.id} className="flex justify-between gap-2">
              {localName(r, locale)} {mark([...base, { type: "role", id: r.id }])}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
