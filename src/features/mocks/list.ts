import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface MockCard {
  id: string;
  title: string;
  set: string;
  best: number | null;
  inProgress: boolean;
  sittings: number;
}

/** Every mock with the learner's best score and whether a sitting is under way. */
export async function mockCards(studentId: string): Promise<MockCard[]> {
  const admin = createAdminClient();
  const [{ data: exams }, { data: attempts }] = await Promise.all([
    admin.from("mock_exams").select("id, title, set_code").eq("status", "active").order("id"),
    admin
      .from("mock_attempts")
      .select("exam_id, score, finished_at")
      .eq("student_id", studentId)
      .limit(2000),
  ]);
  return (exams ?? []).map((e) => {
    const mine = (attempts ?? []).filter((a) => a.exam_id === e.id);
    const scores = mine.flatMap((a) => (a.finished_at && a.score !== null ? [a.score] : []));
    return {
      id: e.id,
      title: e.title,
      set: e.set_code,
      best: scores.length ? Math.max(...scores) : null,
      inProgress: mine.some((a) => !a.finished_at),
      sittings: mine.length,
    };
  });
}

/** Recordings of a mock by track code → media URL (files named "<track>.mp3"). */
export async function mockAudio(tracks: string[]): Promise<Record<string, string>> {
  if (tracks.length === 0) return {};
  const { data } = await createAdminClient()
    .from("media_assets")
    .select("id, file_name")
    .in(
      "file_name",
      tracks.map((t) => `${t}.mp3`),
    )
    .eq("status", "active");
  return Object.fromEntries(
    (data ?? []).map((m) => [m.file_name.replace(/\.mp3$/i, ""), `/api/media/${m.id}`]),
  );
}
