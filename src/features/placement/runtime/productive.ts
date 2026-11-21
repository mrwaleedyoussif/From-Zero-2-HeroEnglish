import "server-only";
import { ActionError } from "@/lib/action-result";
import type { Actor } from "@/lib/auth/session";
import { getStorage } from "@/lib/storage";
import { findLayoutFolder, initLayout } from "@/lib/storage/layout";
import { choosePrompts } from "./finish";
import { type Admin, ownSession, type SessionRow } from "./session";

export const MAX_AUDIO_BYTES = 8 * 1024 * 1024; // ~2 minutes of compressed speech
export const MAX_WRITING_CHARS = 5000;

/** Prompts chosen for this session's level that have no submission yet. */
export async function pendingPrompts(admin: Admin, s: SessionRow) {
  const prompts = await choosePrompts(admin, s.department_id, Number(s.theta ?? s.theta0));
  const { data: done } = await admin
    .from("productive_submissions")
    .select("item_id")
    .eq("session_id", s.id);
  const submitted = new Set((done ?? []).map((d) => d.item_id));
  return prompts.filter((p) => !submitted.has(p.id));
}

async function completeIfDone(admin: Admin, s: SessionRow) {
  if ((await pendingPrompts(admin, s)).length === 0) {
    await admin
      .from("test_sessions")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", s.id);
  }
}

async function promptFor(
  actor: Actor,
  sessionId: string,
  itemId: string,
  kind: "writing" | "speaking",
) {
  const { admin, s } = await ownSession(actor, sessionId);
  if (s.status !== "productive") throw new ActionError("testClosed");
  const prompt = (await pendingPrompts(admin, s)).find((p) => p.id === itemId && p.kind === kind);
  if (!prompt) throw new ActionError("notCurrentItem");
  return { admin, s, prompt };
}

export async function submitWriting(actor: Actor, sessionId: string, itemId: string, text: string) {
  const body = text.trim();
  if (body.length < 1 || body.length > MAX_WRITING_CHARS) throw new ActionError("invalid");
  const { admin, s, prompt } = await promptFor(actor, sessionId, itemId, "writing");
  const { error } = await admin.from("productive_submissions").insert({
    session_id: s.id,
    student_id: s.student_id,
    school_id: s.school_id,
    item_id: prompt.id,
    skill_id: prompt.skill_id,
    kind: "writing",
    body,
  });
  if (error) throw new ActionError(error.code === "23505" ? "alreadyAnswered" : "failed");
  await completeIfDone(admin, s);
}

/** Drive folder 03_Uploads/<school>/<year>/speaking (created on first use). */
async function speakingFolder(schoolCode: string): Promise<string> {
  const storage = await getStorage();
  const uploads =
    (await findLayoutFolder(storage, "03_Uploads")) ?? (await initLayout(storage))["03_Uploads"];
  if (!uploads) throw new ActionError("failed");
  const school = await storage.ensureFolder(uploads, schoolCode || "school");
  const year = await storage.ensureFolder(school.id, String(new Date().getFullYear()));
  return (await storage.ensureFolder(year.id, "speaking")).id;
}

export async function submitSpeaking(
  actor: Actor,
  sessionId: string,
  itemId: string,
  audio: File,
  durationMs: number,
) {
  if (audio.size === 0 || audio.size > MAX_AUDIO_BYTES || !audio.type.startsWith("audio/"))
    throw new ActionError("invalid");
  const { admin, s, prompt } = await promptFor(actor, sessionId, itemId, "speaking");
  const { data: school } = await admin
    .from("schools")
    .select("code")
    .eq("id", s.school_id)
    .single();
  const folder = await speakingFolder(school?.code ?? "");
  const ext = audio.type.includes("ogg") ? "ogg" : audio.type.includes("mp4") ? "m4a" : "webm";
  const file = await (
    await getStorage()
  ).upload(
    folder,
    `${s.id}-${prompt.id}.${ext}`,
    audio.type,
    new Uint8Array(await audio.arrayBuffer()),
  );
  const { error } = await admin.from("productive_submissions").insert({
    session_id: s.id,
    student_id: s.student_id,
    school_id: s.school_id,
    item_id: prompt.id,
    skill_id: prompt.skill_id,
    kind: "speaking",
    drive_file_id: file.id,
    mime_type: audio.type,
    duration_ms: Math.max(0, Math.round(durationMs)),
  });
  if (error) throw new ActionError(error.code === "23505" ? "alreadyAnswered" : "failed");
  await completeIfDone(admin, s);
}
