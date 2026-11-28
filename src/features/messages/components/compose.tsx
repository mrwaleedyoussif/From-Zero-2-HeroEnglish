import { getTranslations } from "next-intl/server";
import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { groupsAndTeams, roster } from "@/features/learning/teacher/queries";
import { sendMessage } from "../actions";

const box =
  "flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background px-3 py-2";

async function Body({ label }: { label: string }) {
  const t = await getTranslations("Messages");
  return (
    <>
      <label className="flex flex-col gap-1 font-semibold">
        {label}
        <textarea
          name="body"
          required
          maxLength={2000}
          rows={4}
          dir="auto"
          className="rounded-xl border border-input bg-background p-3 font-normal"
        />
      </label>
      <Button type="submit" className="self-start" data-send>
        {t("send")}
      </Button>
    </>
  );
}

/** Write to students: pick a class, then the whole class, some groups or some students. */
export async function ComposeToStudents({
  base,
  classes,
  classId,
}: {
  base: string;
  classes: { id: string; code: string }[];
  classId?: string;
}) {
  const t = await getTranslations("Messages");
  const chosen =
    classes.find((c) => c.id === classId) ?? (classes.length === 1 ? classes[0] : null);
  const [students, sets] = chosen
    ? await Promise.all([roster(chosen.id), groupsAndTeams(chosen.id)])
    : [[], { groups: [] }];
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="text-lg font-bold">{t("toStudents")}</h2>
      {classes.length === 0 && <p className="text-muted-foreground">{t("noClasses")}</p>}
      <nav aria-label={t("pickClass")} className="flex flex-wrap gap-2">
        {classes.map((c) => (
          <Link
            key={c.id}
            href={`${base}?class=${c.id}`}
            aria-current={c.id === chosen?.id ? "true" : undefined}
            className={`rounded-full border px-3 py-1 text-sm font-semibold ${c.id === chosen?.id ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
          >
            {c.code}
          </Link>
        ))}
      </nav>
      {chosen && (
        <ActionForm
          action={sendMessage}
          className="flex flex-col gap-3"
          successMessage="messageSent"
        >
          <input type="hidden" name="audience" value="students" />
          <label className={`${box} font-semibold`}>
            <input type="checkbox" name="class" value={chosen.id} />
            {t("wholeClass", { name: chosen.code })}
          </label>
          {sets.groups.length > 0 && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-semibold">{t("groups")}</legend>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {sets.groups.map((g) => (
                  <label key={g.id} className={box}>
                    <input type="checkbox" name="group" value={g.id} />
                    {g.name} ({g.members.length})
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold">{t("students")}</legend>
            <div className="grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
              {students.map((s) => (
                <label key={s.id} className={box}>
                  <input type="checkbox" name="student" value={s.id} />
                  {s.name}
                </label>
              ))}
            </div>
          </fieldset>
          <Body label={t("message")} />
        </ActionForm>
      )}
    </section>
  );
}

/** Write to teachers (leaders and coaches): everyone, or the ones ticked. */
export async function ComposeToTeachers({
  teachers,
}: {
  teachers: { id: string; name: string }[];
}) {
  const t = await getTranslations("Messages");
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="text-lg font-bold">{t("toTeachers")}</h2>
      {teachers.length === 0 ? (
        <p className="text-muted-foreground">{t("noTeachers")}</p>
      ) : (
        <ActionForm
          action={sendMessage}
          className="flex flex-col gap-3"
          successMessage="messageSent"
        >
          <input type="hidden" name="audience" value="staff" />
          <label className={`${box} font-semibold`}>
            <input type="checkbox" name="all_teachers" />
            {t("allTeachers")} ({teachers.length})
          </label>
          <div className="grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
            {teachers.map((p) => (
              <label key={p.id} className={box}>
                <input type="checkbox" name="teacher" value={p.id} />
                {p.name}
              </label>
            ))}
          </div>
          <Body label={t("message")} />
        </ActionForm>
      )}
    </section>
  );
}
