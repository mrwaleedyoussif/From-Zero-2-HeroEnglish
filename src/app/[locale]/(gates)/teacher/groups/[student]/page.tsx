import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { z } from "zod";
import { ActionForm } from "@/components/action-form";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { learnerLevels, learnerProfile, profileOptions } from "@/features/learning/profile/queries";
import { addLearnerNote } from "@/features/learning/teacher/assign-actions";
import { resetPin } from "@/features/users/actions";
import { SecretResultForm } from "@/features/users/components/secret-result-form";
import { can } from "@/lib/auth/can";
import { requirePermission } from "@/lib/auth/guard";
import { formatDate, localName } from "@/lib/i18n-names";
import { createClient } from "@/lib/supabase/server";

/** A learner seen by their teacher: profile, levels, and private teacher notes (SPEC §8). */
export default async function LearnerPage({
  params,
}: PageProps<"/[locale]/teacher/groups/[student]">) {
  const { locale, student } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "students:edit", "page.teacher.groups");
  if (
    !z.guid().safeParse(student).success ||
    !(await can(actor, "students:view", { userId: student }))
  )
    notFound();
  const t = await getTranslations("Groups");
  const tl = await getTranslations("Learning");
  const db = await createClient();
  const [{ data: person }, profile, levels, options, { data: notes }] = await Promise.all([
    db.from("profiles").select("full_name, username").eq("id", student).maybeSingle(),
    learnerProfile(student),
    learnerLevels(student),
    profileOptions(),
    db
      .from("learner_notes")
      .select("id, body, created_at, profiles!learner_notes_author_id_fkey(full_name)")
      .eq("student_id", student)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  if (!person) notFound();
  const canResetPin = !actor.viewAs && (await can(actor, "users:reset_pin", { userId: student }));
  const label = (kind: string, key: string) => {
    const o = options.find((x) => x.kind === kind && x.key === key);
    return o ? `${o.emoji ?? ""} ${locale === "ar" ? o.name_ar : o.name_en}`.trim() : key;
  };
  const groups: [string, string, readonly string[] | undefined][] = [
    ["interest", tl("wizard.interest"), profile?.interests],
    ["goal", tl("wizard.goal"), profile?.goals],
    ["format", tl("wizard.format"), profile?.preferred_formats],
    ["accommodation", tl("wizard.accommodation"), profile?.accommodations],
  ];

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader
        title={person.full_name}
        description={
          profile?.onboarded_at
            ? t("profileSince", { date: formatDate(profile.onboarded_at, locale) })
            : t("noProfile")
        }
      />
      <section className="flex flex-wrap gap-2">
        {levels.overall.map((l) => (
          <Badge key={l.department_id} variant="outline" className="text-sm">
            {l.departments ? localName(l.departments, locale) : ""}: {l.cefr ?? "—"}
          </Badge>
        ))}
        {profile?.mindset_score != null && (
          <Badge variant="secondary" className="text-sm">
            {t("mindset", { score: profile.mindset_score })}
          </Badge>
        )}
      </section>
      {groups.map(([kind, title, keys]) => (
        <section key={kind} className="flex flex-col gap-1">
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm">
            {keys?.length ? keys.map((k) => label(kind, k)).join(" · ") : "—"}
          </p>
        </section>
      ))}
      {canResetPin && (
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">{t("signIn")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("signInHelp", { username: person.username ?? "—" })}
          </p>
          <SecretResultForm action={resetPin}>
            <input type="hidden" name="user_id" value={student} />
            <Button type="submit" variant="outline" size="sm">
              {t("resetPin")}
            </Button>
          </SecretResultForm>
        </section>
      )}
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">{t("notes")}</h2>
        {!actor.viewAs && (
          <ActionForm action={addLearnerNote} className="flex flex-col gap-2">
            <input type="hidden" name="student_id" value={student} />
            <Textarea name="body" required maxLength={1000} rows={2} aria-label={t("newNote")} />
            <Button type="submit" size="sm" className="self-start">
              {t("addNote")}
            </Button>
          </ActionForm>
        )}
        <ul className="flex flex-col gap-2">
          {(notes ?? []).map((n) => (
            <li key={n.id} className="rounded-md border p-2 text-sm">
              <p className="whitespace-pre-wrap">{n.body}</p>
              <p className="text-xs text-muted-foreground">
                {n.profiles?.full_name} · {formatDate(n.created_at, locale)}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
