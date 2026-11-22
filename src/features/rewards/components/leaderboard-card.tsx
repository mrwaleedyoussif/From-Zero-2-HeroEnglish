import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Board } from "../engine/leaderboard";

const MEDAL = ["🥇", "🥈", "🥉"];

/** Weekly top 10 + your own rank (never bottom ranks, SPEC §10). */
export async function LeaderboardCard({
  title,
  board,
  name,
  me,
  testId,
}: {
  title: string;
  board: Board;
  name: (id: string) => string;
  me: string | null;
  testId: string;
}) {
  const t = await getTranslations("Rewards");
  return (
    <Card data-board={testId}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {board.top.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("boardEmpty")}</p>
        )}
        <ol className="flex flex-col gap-1">
          {board.top.map((r) => (
            <li
              key={r.id}
              className={`flex items-center justify-between gap-2 rounded-md px-2 py-1 ${r.id === me ? "bg-primary/10 font-semibold" : ""}`}
            >
              <span>
                <span className="inline-block w-8">{MEDAL[r.rank - 1] ?? `${r.rank}.`}</span>
                {name(r.id)}
              </span>
              <span className="tabular-nums">{t("xpShort", { n: r.points })}</span>
            </li>
          ))}
        </ol>
        {board.me && (
          <p className="text-sm text-muted-foreground" data-my-rank={board.me.rank ?? ""}>
            {board.me.rank
              ? t("myRank", { rank: board.me.rank, n: board.me.points })
              : t("keepGoing", { n: board.me.points })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
