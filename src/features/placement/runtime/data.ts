import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { itemB } from "../engine/rasch";
import type { Blueprint, CutScore, EngineAnswer, EngineItem } from "../engine/types";
import { allowedBands, type GradeBand, gradeBand } from "./rules";
import { PAGE, selectAll } from "@/lib/supabase/batch";

/**
 * Loaders for the test runtime. They use the service-role client because questions carry
 * answer keys that students may not read; every caller has already checked ownership.
 */
type Admin = ReturnType<typeof createAdminClient>;
const SEEN_WINDOW_DAYS = 180;
const MIN_POOL = 20;

export interface StudentContext {
  id: string;
  schoolId: string;
  schoolCode: string;
  classIds: string[];
  band: GradeBand | null;
}

export async function studentContext(
  admin: Admin,
  studentId: string,
): Promise<StudentContext | null> {
  const { data } = await admin
    .from("profiles")
    .select("id, school_id, schools(code), enrolments(class_id, status, classes(grades(code)))")
    .eq("id", studentId)
    .maybeSingle();
  if (!data?.school_id) return null;
  const active = data.enrolments.filter((e) => e.status === "active");
  return {
    id: data.id,
    schoolId: data.school_id,
    schoolCode: data.schools?.code ?? "",
    classIds: active.map((e) => e.class_id),
    band: gradeBand(active[0]?.classes?.grades?.code),
  };
}

export interface LoadedBlueprint extends Blueprint {
  cooldownDays: number;
}

export async function loadBlueprint(
  admin: Admin,
  departmentId: string,
  kind: "placement" | "progress",
): Promise<LoadedBlueprint | null> {
  const [{ data: bp }, { data: skills }] = await Promise.all([
    admin
      .from("test_blueprints")
      .select("*")
      .eq("department_id", departmentId)
      .eq("kind", kind)
      .eq("status", "active")
      .maybeSingle(),
    admin
      .from("skills")
      .select("id, blueprint_min_share")
      .eq("department_id", departmentId)
      .eq("status", "active"),
  ]);
  if (!bp) return null;
  return {
    minItems: bp.min_items,
    maxItems: bp.max_items,
    targetSe: Number(bp.target_se),
    timeLimitSec: bp.time_limit_sec,
    cooldownDays: bp.retake_cooldown_days,
    skillMinShares: Object.fromEntries(
      (skills ?? []).map((s) => [s.id, Number(s.blueprint_min_share)]),
    ),
  };
}

export interface PoolItem extends EngineItem {
  version: number;
}

/**
 * Eligible receptive items: active, this department, grade band ±1 (or untagged), not answered
 * by this learner in the last 180 days. Falls back to the whole department when the filtered
 * bank is too small to adapt (early content).
 */
export async function loadPool(
  admin: Admin,
  departmentId: string,
  student: StudentContext,
): Promise<PoolItem[]> {
  const since = new Date(Date.now() - SEEN_WINDOW_DAYS * 86_400_000).toISOString();
  const [{ data: items }, { data: seen }] = await Promise.all([
    // Banks hold thousands of items; the API returns 1000 rows per request, so read by pages.
    selectAll(
      (after) => {
        const q = admin
          .from("items")
          .select("id, skill_id, difficulty, b_calibrated, version, grade_band, item_type")
          .eq("department_id", departmentId)
          .eq("status", "active")
          .not("item_type", "in", "(writing_prompt,speaking_prompt)");
        return (after ? q.gt("id", after) : q).order("id").limit(PAGE);
      },
      (i) => i.id,
    ),
    admin.from("responses").select("item_id").eq("student_id", student.id).gte("created_at", since),
  ]);
  const seenIds = new Set((seen ?? []).map((r) => r.item_id));
  const all = (items ?? [])
    .filter((i) => !seenIds.has(i.id))
    .map((i) => ({
      id: i.id,
      skill: i.skill_id,
      b: itemB({
        difficulty: i.difficulty,
        b_calibrated: i.b_calibrated === null ? null : Number(i.b_calibrated),
      }),
      version: i.version,
      band: i.grade_band,
    }));
  const bands = allowedBands(student.band);
  const inBand = bands ? all.filter((i) => !i.band || bands.has(i.band)) : all;
  return (inBand.length >= MIN_POOL ? inBand : all).map(({ band: _band, ...item }) => item);
}

export async function loadAnswers(admin: Admin, sessionId: string): Promise<EngineAnswer[]> {
  const { data } = await admin
    .from("responses")
    .select("item_id, skill_id, b_used, correct")
    .eq("session_id", sessionId)
    .not("correct", "is", null)
    .order("seq");
  return (data ?? []).map((r) => ({
    itemId: r.item_id,
    skill: r.skill_id,
    b: Number(r.b_used),
    correct: r.correct === true,
  }));
}

/** θ₀ (SPEC §7): last estimate in this department → grade-band prior → 0. */
export async function priorTheta(
  admin: Admin,
  studentId: string,
  departmentId: string,
  band: GradeBand | null,
): Promise<number> {
  const { data: last } = await admin
    .from("ability_estimates")
    .select("theta")
    .eq("student_id", studentId)
    .eq("department_id", departmentId)
    .is("skill_id", null)
    .order("measured_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last) return Number(last.theta);
  if (!band) return 0;
  const { data: prior } = await admin
    .from("ability_priors")
    .select("theta0")
    .eq("department_id", departmentId)
    .eq("grade_band", band)
    .maybeSingle();
  return prior ? Number(prior.theta0) : 0;
}

export async function loadCuts(admin: Admin, departmentId: string): Promise<CutScore[]> {
  const { data } = await admin
    .from("cut_scores")
    .select("cefr, min_theta, max_theta")
    .eq("department_id", departmentId);
  return (data ?? []).map((c) => ({
    cefr: c.cefr,
    min: Number(c.min_theta),
    max: Number(c.max_theta),
  }));
}
