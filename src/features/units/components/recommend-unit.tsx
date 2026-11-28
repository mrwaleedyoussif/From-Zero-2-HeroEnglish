import { Send } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { groupsAndTeams, myClasses, roster } from "@/features/learning/teacher/queries";
import { Link } from "@/i18n/navigation";
import { canSomewhere } from "@/lib/auth/can";
import type { Actor } from "@/lib/auth/session";
import { recommendUnit } from "../recommend-actions";
import { recommendedCount } from "../recommended";
import { UnitPanel } from "./unit-panel";

const box =
  "flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background px-3 py-2";

/**
 * For teachers looking at a unit: recommend it to a whole class, some of its groups or some
 * students. Learners never see this panel.
 */
export async function RecommendUnit({
  actor,
  unitId,
  here,
  classId,
}: {
  actor: Actor;
  unitId: string;
  /** This unit's page, to come back to after choosing a class. */
  here: string;
  classId?: string;
}) {
  if (actor.viewAs || !(await canSomewhere(actor, "lessons:assign"))) return null;
  const t = await getTranslations("Units");
  const classes = await myClasses(actor, "lessons:assign");
  if (classes.length === 0) return null;
  const chosen =
    classes.find((c) => c.id === classId) ?? (classes.length === 1 ? classes[0] : null);
  const [students, sets, already] = await Promise.all([
    chosen ? roster(chosen.id) : [],
    chosen ? groupsAndTeams(chosen.id) : { groups: [] },
    recommendedCount(unitId),
  ]);
  return (
    <UnitPanel hue="violet" icon={Send} title={t("recommend.title")} part="recommend">
      <p className="text-sm text-muted-foreground" data-recommended={already}>
        {t("recommend.help")} {already > 0 && t("recommend.already", { count: already })}
      </p>
      <nav aria-label={t("recommend.pickClass")} className="flex flex-wrap gap-2">
        {classes.map((c) => (
          <Link
            key={c.id}
            href={`${here}?class=${c.id}`}
            aria-current={c.id === chosen?.id ? "true" : undefined}
            className={`rounded-full border px-3 py-1 text-sm font-semibold ${c.id === chosen?.id ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
          >
            {c.code}
          </Link>
        ))}
      </nav>
      {chosen && (
        <ActionForm
          action={recommendUnit}
          className="flex flex-col gap-3"
          successMessage="recommended"
        >
          <input type="hidden" name="unit" value={unitId} />
          <input type="hidden" name="class_id" value={chosen.id} />
          <label className={`${box} font-semibold`}>
            <input type="checkbox" name="whole" />
            {t("recommend.wholeClass", { name: chosen.code })}
          </label>
          {sets.groups.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {sets.groups.map((g) => (
                <label key={g.id} className={box}>
                  <input type="checkbox" name="group" value={g.id} />
                  {g.name} ({g.members.length})
                </label>
              ))}
            </div>
          )}
          <div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
            {students.map((s) => (
              <label key={s.id} className={box}>
                <input type="checkbox" name="student" value={s.id} />
                {s.name}
              </label>
            ))}
          </div>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            {t("recommend.note")}
            <input
              name="note"
              maxLength={300}
              dir="auto"
              className="min-h-11 rounded-xl border border-input bg-background px-3 font-normal"
            />
          </label>
          <Button type="submit" className="self-start" data-recommend>
            {t("recommend.send")}
          </Button>
        </ActionForm>
      )}
    </UnitPanel>
  );
}
