import "server-only";
import { createClient } from "@/lib/supabase/server";
import { strengthsAndGaps } from "./engine/score";

/**
 * A finished session as the viewer may see it (RLS: the student, or staff with
 * placement:view_results over them), with skill names and starting lessons (SPEC §7 output).
 */
export async function sessionResult(sessionId: string) {
  const db = await createClient();
  const { data: s } = await db
    .from("test_sessions")
    .select(
      "id, student_id, kind, status, theta, se, cefr, scaled_score, items_count, tab_switches, stop_reason, started_at, completed_at, skill_estimates, department_id, departments(code, name_en, name_ar), profiles(full_name)",
    )
    .eq("id", sessionId)
    .maybeSingle();
  if (!s) return null;
  const [skills, responses, submissions] = await Promise.all([
    db.from("skills").select("id, code, name_en, name_ar").eq("department_id", s.department_id),
    db
      .from("responses")
      .select("seq, correct, time_ms, b_used, theta_after, se_after, items(code, item_type)")
      .eq("session_id", sessionId)
      .order("seq"),
    db
      .from("productive_submissions")
      .select("id, kind, body, status, items(stem), submission_scores(cefr, scores, comment)")
      .eq("session_id", sessionId),
  ]);
  const skillName = new Map((skills.data ?? []).map((k) => [k.id, k]));
  const estimates = (
    (s.skill_estimates as { skill_id: string; theta: number; se: number; n: number }[]) ?? []
  ).map((e) => ({ ...e, skill: e.skill_id, info: skillName.get(e.skill_id) }));
  const theta = Number(s.theta ?? 0);
  const { strengths, gaps } = strengthsAndGaps(estimates, theta);

  // Starting lessons: this level, weakest skills first (lessons the viewer may see).
  const gapIds = [...gaps, ...estimates.map((e) => e.skill)].filter(
    (v, i, a) => a.indexOf(v) === i,
  );
  const { data: lessons } = s.cefr
    ? await db
        .from("lessons")
        .select("id, code, title_en, title_ar, format, skill_id, media_asset_id, content_url")
        .eq("department_id", s.department_id)
        .eq("cefr", s.cefr)
        .eq("status", "active")
        .limit(20)
    : { data: [] };
  const rank = (skillId: string) => {
    const i = gapIds.indexOf(skillId);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  const recommended = [...(lessons ?? [])]
    .sort((a, b) => rank(a.skill_id) - rank(b.skill_id))
    .slice(0, 4);

  return {
    session: s,
    estimates,
    strengths: strengths.map((id) => skillName.get(id)).filter((x) => x !== undefined),
    gaps: gaps.map((id) => skillName.get(id)).filter((x) => x !== undefined),
    responses: responses.data ?? [],
    submissions: submissions.data ?? [],
    recommended,
  };
}

export type SessionResult = NonNullable<Awaited<ReturnType<typeof sessionResult>>>;
