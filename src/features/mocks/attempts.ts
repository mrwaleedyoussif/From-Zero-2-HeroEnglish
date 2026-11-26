import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/db";
import { type Mock, mockSchema, scoreMock } from "./schema";

/** Seconds allowed after a section's time is up (a slow connection must not lose answers). */
const GRACE = 15;

export interface Attempt {
  id: string;
  student_id: string;
  exam_id: string;
  section: number;
  section_started_at: string;
  answers: Record<string, string>;
  played: string[];
  finished_at: string | null;
  score: number | null;
  section_scores: { n: number; right: number; total: number }[] | null;
  created_at: string;
}
const COLUMNS =
  "id, student_id, exam_id, section, section_started_at, answers, played, finished_at, score, section_scores, created_at";

export async function loadMock(id: string): Promise<Mock | null> {
  if (!/^M\d{2}$/.test(id)) return null;
  const { data } = await createAdminClient()
    .from("mock_exams")
    .select("content, status")
    .eq("id", id)
    .maybeSingle();
  if (!data || data.status !== "active") return null;
  const mock = mockSchema.safeParse(data.content);
  return mock.success ? mock.data : null;
}

/** The learner's latest sitting of an exam (finished or not), brought up to date with the clock. */
export async function latestAttempt(studentId: string, mock: Mock): Promise<Attempt | null> {
  const { data } = await createAdminClient()
    .from("mock_attempts")
    .select(COLUMNS)
    .eq("student_id", studentId)
    .eq("exam_id", mock.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? settle(data as unknown as Attempt, mock) : null;
}

/** When the current section ends, in ms since 1970. */
export function sectionEnds(attempt: Attempt, mock: Mock): number {
  const section = mock.sections.find((s) => s.n === attempt.section);
  return new Date(attempt.section_started_at).getTime() + (section?.minutes ?? 0) * 60_000;
}

/**
 * Move a sitting on as the clock says: a section whose time is up is closed and the next one
 * starts when the last one ended; after the last section the exam is marked.
 */
export async function settle(attempt: Attempt, mock: Mock, leave = false): Promise<Attempt> {
  if (attempt.finished_at) return attempt;
  let { section } = attempt;
  let started = new Date(attempt.section_started_at).getTime();
  const now = Date.now();
  const order = mock.sections.map((s) => s.n);
  let moved = false;
  for (;;) {
    const s = mock.sections.find((x) => x.n === section);
    const ends = started + (s?.minutes ?? 0) * 60_000;
    if (!leave && now <= ends + GRACE * 1000) break;
    leave = false;
    moved = true;
    const next = order[order.indexOf(section) + 1];
    if (next === undefined) return finish(attempt, mock);
    section = next;
    started = Math.min(ends, now);
  }
  if (!moved) return attempt;
  const update = { section, section_started_at: new Date(started).toISOString() };
  await createAdminClient().from("mock_attempts").update(update).eq("id", attempt.id);
  return { ...attempt, ...update };
}

async function finish(attempt: Attempt, mock: Mock): Promise<Attempt> {
  const result = scoreMock(mock, attempt.answers);
  const done = {
    finished_at: new Date().toISOString(),
    score: result.score,
    section_scores: result.sections,
  };
  await createAdminClient()
    .from("mock_attempts")
    .update({ ...done, section_scores: result.sections as unknown as NonNullable<Json> })
    .eq("id", attempt.id)
    .is("finished_at", null);
  return { ...attempt, ...done };
}

export async function attemptById(id: string): Promise<Attempt | null> {
  const { data } = await createAdminClient()
    .from("mock_attempts")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as Attempt) ?? null;
}
