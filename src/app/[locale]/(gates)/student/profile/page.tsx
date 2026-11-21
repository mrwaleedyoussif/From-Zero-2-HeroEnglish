import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OnboardingWizard } from "@/features/learning/components/onboarding-wizard";
import { learnerLevels, learnerProfile, profileOptions } from "@/features/learning/profile/queries";
import { Link } from "@/i18n/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { localName } from "@/lib/i18n-names";

/** Learner profile: the onboarding wizard the first time (or ?edit=1), else a summary. */
export default async function StudentProfilePage({
  params,
  searchParams,
}: PageProps<"/[locale]/student/profile">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "learning:self", "page.student.profile");
  const t = await getTranslations("Learning");
  const [options, profile, levels] = await Promise.all([
    profileOptions(),
    learnerProfile(actor.effective.id),
    learnerLevels(actor.effective.id),
  ]);
  const edit = (await searchParams).edit === "1";

  if ((!profile?.onboarded_at || edit) && !actor.viewAs) {
    return (
      <>
        <PageHeader title={t("profileTitle")} description={t("wizardIntro")} />
        <OnboardingWizard options={options} initial={profile} />
      </>
    );
  }
  const label = (kind: string, key: string) => {
    const o = options.find((x) => x.kind === kind && x.key === key);
    return o ? `${o.emoji ?? ""} ${locale === "ar" ? o.name_ar : o.name_en}`.trim() : key;
  };
  const chips = (kind: string, keys: readonly string[] | undefined) =>
    keys?.length ? (
      <div className="flex flex-wrap gap-2">
        {keys.map((k) => (
          <Badge key={k} variant="secondary" className="text-sm">
            {label(kind, k)}
          </Badge>
        ))}
      </div>
    ) : (
      <p className="text-sm text-muted-foreground">—</p>
    );

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader title={t("profileTitle")} description={t("profileIntro")} />
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t("myLevels")}</h2>
        {levels.overall.length === 0 && <p className="text-muted-foreground">{t("noLevels")}</p>}
        <ul className="flex flex-col gap-1">
          {levels.overall.map((l) => (
            <li key={l.department_id} className="flex justify-between gap-4 rounded-md border p-2">
              <span>{l.departments ? localName(l.departments, locale) : ""}</span>
              <span className="font-semibold">{l.cefr ?? "—"}</span>
            </li>
          ))}
        </ul>
      </section>
      {(["interest", "goal", "format", "accommodation"] as const).map((kind) => (
        <section key={kind} className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{t(`wizard.${kind}`)}</h2>
          {chips(
            kind,
            kind === "interest"
              ? profile?.interests
              : kind === "goal"
                ? profile?.goals
                : kind === "format"
                  ? profile?.preferred_formats
                  : profile?.accommodations,
          )}
        </section>
      ))}
      {!actor.viewAs && (
        <Button asChild variant="outline" className="self-start">
          <Link href="/student/profile?edit=1">{t("editProfile")}</Link>
        </Button>
      )}
    </div>
  );
}
