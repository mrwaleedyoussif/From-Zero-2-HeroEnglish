import {
  Coins,
  Flame,
  GraduationCap,
  Heart,
  Pencil,
  Sparkles,
  Star,
  Target,
  Tv,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { OnboardingWizard } from "@/features/learning/components/onboarding-wizard";
import { learnerLevels, learnerProfile, profileOptions } from "@/features/learning/profile/queries";
import { rewardsSummary } from "@/features/rewards/queries";
import { Link } from "@/i18n/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { localName } from "@/lib/i18n-names";

import "./profile.css";

const SECTIONS = [
  { kind: "interest", hue: "rose", Icon: Heart },
  { kind: "goal", hue: "green", Icon: Target },
  { kind: "format", hue: "violet", Icon: Tv },
  { kind: "accommodation", hue: "amber", Icon: Sparkles },
] as const;

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => [...w][0] ?? "")
    .join("")
    .toUpperCase();

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
  const chosen = {
    interest: profile?.interests,
    goal: profile?.goals,
    format: profile?.preferred_formats,
    accommodation: profile?.accommodations,
  };
  const summary = await rewardsSummary(actor.effective.id);
  const name = actor.effective.full_name;
  const tj = await getTranslations("Journey");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("profileTitle")} description={t("profileIntro")} />
      {/* Who I am: name, level, streak and coins at a glance. */}
      <section className="profile-card flex flex-wrap items-center gap-5 rounded-3xl p-5 text-white">
        <span
          aria-hidden
          className="profile-avatar flex size-20 shrink-0 items-center justify-center rounded-full text-2xl font-extrabold"
        >
          {initials(name)}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="truncate text-2xl font-extrabold">{name}</p>
          <ul className="flex flex-wrap gap-2 text-sm font-semibold">
            <li className="profile-chip">
              <Star aria-hidden className="size-4 text-[#fcd34d]" />
              {summary.level.current
                ? localName(summary.level.current, locale)
                : tj("level", { n: 1 })}{" "}
              · {tj("xp", { xp: summary.xp })}
            </li>
            <li className="profile-chip">
              <Flame aria-hidden className="size-4 text-[#fdba74]" />
              {tj("streak", { days: summary.streak.days })}
            </li>
            <li className="profile-chip">
              <Coins aria-hidden className="size-4 text-[#fde68a]" />
              {tj("coins", { n: summary.coins })}
            </li>
          </ul>
        </div>
        {!actor.viewAs && (
          <Button asChild className="bg-[#f6dc9c] font-bold text-[#1a1304] hover:bg-[#e2bd72]">
            <Link href="/student/profile?edit=1">
              <Pencil aria-hidden />
              {t("editProfile")}
            </Link>
          </Button>
        )}
      </section>

      <section data-hue="blue" className="profile-panel flex flex-col gap-3 rounded-2xl p-5">
        <h2 className="flex items-center gap-2.5 text-lg font-bold">
          <span aria-hidden className="icon-tile size-9 rounded-xl">
            <GraduationCap className="size-5" />
          </span>
          {t("myLevels")}
        </h2>
        {levels.overall.length === 0 && <p className="text-muted-foreground">{t("noLevels")}</p>}
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {levels.overall.map((l) => (
            <li
              key={l.department_id}
              className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background p-3"
            >
              <span className="font-medium">
                {l.departments ? localName(l.departments, locale) : ""}
              </span>
              <span className="profile-level rounded-full px-3 py-1 text-sm font-extrabold">
                {l.cefr ?? "—"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {SECTIONS.map(({ kind, hue, Icon }) => (
          <section
            key={kind}
            data-hue={hue}
            className="profile-panel flex flex-col gap-3 rounded-2xl p-5"
          >
            <h2 className="flex items-center gap-2.5 text-lg font-bold">
              <span aria-hidden className="icon-tile size-9 rounded-xl">
                <Icon className="size-5" />
              </span>
              {t(`wizard.${kind}`)}
            </h2>
            {chosen[kind]?.length ? (
              <ul className="flex flex-wrap gap-2">
                {chosen[kind].map((k) => (
                  <li key={k} className="profile-pick rounded-full px-3 py-1.5 text-sm font-medium">
                    {label(kind, k)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
