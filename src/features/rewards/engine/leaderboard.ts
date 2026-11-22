/**
 * Class and team leaderboards (SPEC §10): weekly, top 10 plus your own rank, never bottom ranks.
 * Only learners with points this week are ranked; your rank is shown only in the top half —
 * below that you see your points and an encouragement instead of a low number.
 */

export interface Entry {
  id: string;
  points: number;
}

export interface Ranked extends Entry {
  rank: number;
}

export interface Board {
  top: Ranked[];
  me: { points: number; rank: number | null } | null;
}

/** Standard competition ranking (100, 100, 90 → 1, 1, 3); ties ordered by id for stable output. */
export function rankAll(entries: readonly Entry[]): Ranked[] {
  const list = entries
    .filter((e) => e.points > 0)
    .sort((a, b) => b.points - a.points || a.id.localeCompare(b.id));
  return list.map((e, i) => {
    let first = i;
    while (first > 0 && (list[first - 1] as Entry).points === e.points) first--;
    return { ...e, rank: first + 1 };
  });
}

export function leaderboard(entries: readonly Entry[], me: string | null, size = 10): Board {
  const ranked = rankAll(entries);
  const mine = me ? ranked.find((r) => r.id === me) : undefined;
  const half = Math.ceil(ranked.length / 2);
  return {
    top: ranked.slice(0, size),
    me: !me
      ? null
      : mine
        ? { points: mine.points, rank: mine.rank <= half ? mine.rank : null }
        : { points: 0, rank: null },
  };
}
