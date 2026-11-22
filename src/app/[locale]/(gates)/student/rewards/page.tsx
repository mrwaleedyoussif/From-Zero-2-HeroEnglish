import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { BadgeGrid } from "@/features/rewards/components/badge-grid";
import { CatalogList } from "@/features/rewards/components/catalog-list";
import { LeaderboardCard } from "@/features/rewards/components/leaderboard-card";
import { SummaryCards } from "@/features/rewards/components/summary-cards";
import { boards, catalog, myClass, rewardsSummary } from "@/features/rewards/queries";
import { requirePermission } from "@/lib/auth/guard";
import { formatDate, localName } from "@/lib/i18n-names";
import { isVisible } from "@/lib/visibility/server";

/** Learner rewards (SPEC §10): level, coins, streak, badges, leaderboards, shop, certificates. */
export default async function StudentRewardsPage({
  params,
}: PageProps<"/[locale]/student/rewards">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "rewards:view", "page.student.rewards");
  const t = await getTranslations("Rewards");
  const me = actor.effective.id;
  const [summary, items, cls, showBoards, showCoins, showStreak, showTeams] = await Promise.all([
    rewardsSummary(me),
    catalog(),
    myClass(me),
    isVisible(actor, "feature.leaderboards"),
    isVisible(actor, "feature.coins"),
    isVisible(actor, "feature.streaks"),
    isVisible(actor, "feature.kaganTeams"),
  ]);
  const board = cls && cls.leaderboardOn && showBoards ? await boards(cls.id, me) : null;
  const lang = await getLocale();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t("title")} description={t("intro")} />
      <SummaryCards summary={summary} showCoins={showCoins} showStreak={showStreak} />

      <section className="flex flex-col gap-3" data-section="badges">
        <h2 className="text-xl font-semibold">{t("badges")}</h2>
        <BadgeGrid badges={summary.badges} />
      </section>

      {board && (
        <section className="grid gap-4 md:grid-cols-2" data-section="leaderboards">
          <LeaderboardCard
            title={t("classBoard", { cls: cls?.code ?? "" })}
            board={board.students}
            name={board.studentName}
            me={me}
            testId="class"
          />
          {showTeams && board.teams.top.length + (board.teams.me ? 1 : 0) > 0 && (
            <LeaderboardCard
              title={t("teamBoard")}
              board={board.teams}
              name={board.teamName}
              me={null}
              testId="teams"
            />
          )}
        </section>
      )}
      {cls && !cls.leaderboardOn && (
        <p className="text-sm text-muted-foreground" data-board-off>
          {t("boardOff")}
        </p>
      )}

      {showCoins && (
        <section className="flex flex-col gap-3" data-section="shop">
          <h2 className="text-xl font-semibold">{t("shop")}</h2>
          <CatalogList
            items={items}
            coins={summary.coins}
            redemptions={summary.redemptions}
            readOnly={!!actor.viewAs}
          />
        </section>
      )}

      <section className="flex flex-col gap-2" data-section="certificates">
        <h2 className="text-xl font-semibold">{t("certificates")}</h2>
        {summary.certificates.length === 0 && (
          <p className="text-muted-foreground">{t("noCertificates")}</p>
        )}
        <ul className="flex flex-col gap-1">
          {summary.certificates.map((c) => (
            <li key={c.id}>
              <a
                href={`/api/certificates/${c.id}`}
                target="_blank"
                rel="noopener"
                className="text-primary hover:underline"
              >
                📜{" "}
                {c.kind === "level"
                  ? t("certLevel", { level: c.value })
                  : t("certCefr", {
                      cefr: c.value,
                      dept: c.departments ? localName(c.departments, lang) : "",
                    })}
              </a>{" "}
              <span className="text-sm text-muted-foreground">{formatDate(c.issued_at, lang)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
