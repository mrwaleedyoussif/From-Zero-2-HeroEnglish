import "server-only";
import { createClient } from "@/lib/supabase/server";
import { teamPoints } from "./engine/kagan";
import { type Entry, leaderboard } from "./engine/leaderboard";
import { levelFor } from "./engine/levels";
import { emptyStreak, shownStreak, weekStart } from "./engine/streaks";
import { coinBalance, totalXp as sumXp } from "./totals";

export const today = () => new Date().toISOString().slice(0, 10);
/** This week's leaderboards start Monday 00:00 UTC (weekly reset, SPEC §10). */
export const thisWeek = () => `${weekStart(today())}T00:00:00Z`;

/** A learner's rewards summary (RLS: the learner, or staff with rewards:view over them). */
export async function rewardsSummary(studentId: string) {
  const db = await createClient();
  const [xp, coins, levels, streak, badges, owned, certs, redemptions] = await Promise.all([
    sumXp(db, studentId),
    coinBalance(db, studentId),
    db.from("levels").select("level, name_en, name_ar, xp_required").order("level"),
    db.from("streaks").select("*").eq("student_id", studentId).maybeSingle(),
    db
      .from("badges")
      .select("id, code, name_en, name_ar, description, media_asset_id")
      .eq("status", "active")
      .order("code"),
    db.from("user_badges").select("badge_id, awarded_at").eq("student_id", studentId),
    db
      .from("certificates")
      .select("id, kind, value, issued_at, departments(code, name_en, name_ar)")
      .eq("student_id", studentId)
      .order("issued_at", { ascending: false }),
    db
      .from("redemptions")
      .select("id, status, cost, created_at, reward_catalog(name_en, name_ar, emoji)")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  const totalXp = xp;
  const s = streak.data;
  const state = s
    ? {
        current: s.current,
        longest: s.longest,
        lastActiveOn: s.last_active_on,
        freezeWeek: s.freeze_week,
      }
    : emptyStreak;
  const earned = new Map((owned.data ?? []).map((o) => [o.badge_id, o.awarded_at]));
  return {
    xp: totalXp,
    coins,
    level: levelFor(totalXp, levels.data ?? []),
    streak: {
      days: shownStreak(state, today()),
      longest: state.longest,
      freezeUsed: state.freezeWeek === weekStart(today()),
    },
    badges: (badges.data ?? []).map((b) => ({ ...b, awardedAt: earned.get(b.id) ?? null })),
    certificates: certs.data ?? [],
    redemptions: redemptions.data ?? [],
  };
}
export type RewardsSummary = Awaited<ReturnType<typeof rewardsSummary>>;

/** Catalogue items the learner can buy (platform cosmetics + their school's real rewards). */
export async function catalog() {
  const db = await createClient();
  const { data } = await db
    .from("reward_catalog")
    .select("id, code, name_en, name_ar, emoji, kind, cost, needs_approval")
    .eq("status", "active")
    .order("cost");
  return data ?? [];
}

/** The learner's (first active) class and whether its leaderboard is on. */
export async function myClass(studentId: string) {
  const db = await createClient();
  const { data } = await db
    .from("enrolments")
    .select("class_id, classes(code)")
    .eq("student_id", studentId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const { data: settings } = await db
    .from("class_reward_settings")
    .select("leaderboard_enabled")
    .eq("class_id", data.class_id)
    .maybeSingle();
  return {
    id: data.class_id,
    code: data.classes?.code ?? "",
    leaderboardOn: settings?.leaderboard_enabled ?? true,
  };
}

/** Weekly class board and Kagan team board for a class, as `me` sees it (DB checks access). */
export async function boards(classId: string, me: string | null) {
  const db = await createClient();
  const since = thisWeek();
  const [cls, teams] = await Promise.all([
    db.rpc("class_leaderboard", { p_class: classId, p_since: since }),
    db.rpc("team_scores", { p_class: classId, p_since: since }),
  ]);
  const names = new Map((cls.data ?? []).map((r) => [r.student_id, r.full_name]));
  const byTeam = new Map<
    string,
    {
      name: string;
      members: { baseline: number | null; current: number | null }[];
      challenge: number;
      mine: boolean;
    }
  >();
  for (const r of teams.data ?? []) {
    const t = byTeam.get(r.team_id) ?? {
      name: r.team_name,
      members: [],
      challenge: Number(r.challenge),
      mine: false,
    };
    t.members.push({
      baseline: r.baseline === null ? null : Number(r.baseline),
      current: r.current === null ? null : Number(r.current),
    });
    if (r.student_id === me) t.mine = true;
    byTeam.set(r.team_id, t);
  }
  const teamEntries: Entry[] = [...byTeam].map(([id, t]) => ({
    id,
    points: teamPoints(t.members, t.challenge),
  }));
  const myTeam = [...byTeam].find(([, t]) => t.mine)?.[0] ?? null;
  return {
    students: leaderboard(
      (cls.data ?? []).map((r) => ({ id: r.student_id, points: Number(r.points) })),
      me,
    ),
    teams: leaderboard(teamEntries, myTeam),
    studentName: (id: string) => names.get(id) ?? "",
    teamName: (id: string) => byTeam.get(id)?.name ?? "",
  };
}
