import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { ClassPicker, pickClass } from "@/features/learning/components/class-picker";
import { groupsAndTeams, myClasses, roster } from "@/features/learning/teacher/queries";
import { LeaderboardCard } from "@/features/rewards/components/leaderboard-card";
import {
  KudosList,
  LeaderboardSwitch,
  RedemptionQueue,
  TeamPointsForm,
} from "@/features/rewards/components/teacher-panels";
import { boards } from "@/features/rewards/queries";
import { requirePermission } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";

/** Teacher rewards (SPEC §10): leaderboard switch, kudos, team challenge points, approvals. */
export default async function TeacherRewardsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/teacher/rewards">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "rewards:grant", "page.teacher.rewards");
  const t = await getTranslations("TeacherRewards");
  const classes = await myClasses(actor, "rewards:grant");
  const cls = pickClass(classes, (await searchParams).class);
  if (!cls)
    return (
      <>
        <PageHeader title={t("title")} description={t("intro")} />
        <p className="text-muted-foreground">{t("noClasses")}</p>
      </>
    );
  const db = await createClient();
  const [students, sets, board, settings] = await Promise.all([
    roster(cls.id),
    groupsAndTeams(cls.id),
    boards(cls.id, null),
    db
      .from("class_reward_settings")
      .select("leaderboard_enabled")
      .eq("class_id", cls.id)
      .maybeSingle(),
  ]);
  const { data: requests } = await db
    .from("redemptions")
    .select("id, cost, created_at, student_id, reward_catalog(name_en, name_ar, emoji)")
    .eq("status", "requested")
    .in(
      "student_id",
      students.map((s) => s.id),
    )
    .order("created_at");
  const name = new Map(students.map((s) => [s.id, s.name]));
  const on = settings.data?.leaderboard_enabled ?? true;
  const editable = !actor.viewAs;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t("title")} description={t("intro")} />
      <ClassPicker classes={classes} current={cls.id} basePath="/teacher/rewards" />
      <section className="flex flex-col gap-3" data-section="leaderboard">
        <h2 className="text-lg font-semibold">{t("leaderboard", { cls: cls.code })}</h2>
        {editable && <LeaderboardSwitch classId={cls.id} on={on} />}
        <div className="grid gap-4 md:grid-cols-2">
          <LeaderboardCard
            title={t("thisWeek")}
            board={board.students}
            name={board.studentName}
            me={null}
            testId="class"
          />
          {board.teams.top.length > 0 && (
            <LeaderboardCard
              title={t("teams")}
              board={board.teams}
              name={board.teamName}
              me={null}
              testId="teams"
            />
          )}
        </div>
      </section>
      {editable && (
        <>
          <section className="flex flex-col gap-3" data-section="requests">
            <h2 className="text-lg font-semibold">{t("requests")}</h2>
            <RedemptionQueue
              requests={(requests ?? []).map((r) => ({
                id: r.id,
                cost: r.cost,
                created_at: r.created_at,
                student: name.get(r.student_id) ?? "",
                item: `${r.reward_catalog?.emoji ?? ""} ${locale === "ar" ? r.reward_catalog?.name_ar : r.reward_catalog?.name_en}`.trim(),
              }))}
            />
          </section>
          {sets.teams.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold">{t("teamPoints")}</h2>
              <p className="text-sm text-muted-foreground">{t("teamPointsHelp")}</p>
              <TeamPointsForm classId={cls.id} teams={sets.teams} />
            </section>
          )}
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{t("kudosTitle")}</h2>
            <KudosList students={students} />
          </section>
        </>
      )}
    </div>
  );
}
