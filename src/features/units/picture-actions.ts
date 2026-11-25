"use server";

import { z } from "zod";
import { ActionError, type ActionResult, runAction } from "@/lib/action-result";
import { aiPictures, askAi } from "@/lib/ai";
import { assertCanWrite } from "@/lib/auth/can";
import { platformTarget } from "@/lib/auth/scope";
import { getActor } from "@/lib/auth/session";
import { getStorage } from "@/lib/storage";
import { findLayoutFolder } from "@/lib/storage/layout";
import { createAdminClient } from "@/lib/supabase/admin";
import { cleanSvg, pictureFile } from "./pictures";

/** Words drawn in one request: few enough to finish inside the time a request may take. */
const STEP = 3;
const FOLDER = "02_Media";

async function allowed() {
  const actor = await getActor();
  if (!actor) throw new ActionError("signedOut");
  await assertCanWrite(actor, "content:import", platformTarget);
  if (!aiPictures()) throw new ActionError("aiOff");
}

interface Word {
  id: string;
  word: string;
  pos?: string;
  definition: string;
}

/** Units that still have words without a picture (or a "no picture fits" note) in Drive. */
export async function wordsWithoutPictures(): Promise<
  ActionResult<{ words: number; units: { id: string; missing: number }[] }>
> {
  return runAction(async () => {
    await allowed();
    const admin = createAdminClient();
    const [{ data: units }, { data: media }] = await Promise.all([
      admin
        .from("course_units")
        .select("id, words:content->vocabulary")
        .eq("status", "active")
        .limit(1200),
      admin
        .from("media_assets")
        .select("file_name")
        .eq("status", "active")
        .or("file_name.ilike.%.svg,file_name.ilike.%.none.txt,mime_type.like.image/%")
        .limit(20000),
    ]);
    const have = new Set(
      (media ?? []).map((m) => m.file_name.replace(/(\.none)?\.[a-z0-9]+$/i, "")),
    );
    const out = (units ?? []).flatMap((u) => {
      const missing = ((u.words ?? []) as unknown as Word[]).filter((w) => !have.has(w.id)).length;
      return missing ? [{ id: u.id, missing }] : [];
    });
    return { words: out.reduce((n, u) => n + u.missing, 0), units: out };
  });
}

const shape = z.object({
  pictures: z.array(z.object({ id: z.string(), svg: z.string() })),
});

const SYSTEM = `You draw small, friendly, flat pictures as SVG for English vocabulary cards used by school learners in Saudi Arabia. For each word you are given its meaning; draw the thing or action so a learner recognises the meaning at a glance.

Each drawing: one <svg viewBox="0 0 120 120"> element using only g, path, rect, circle, ellipse, line, polygon and polyline, coloured with fill and stroke attributes. No text or letters, no style attributes or elements, no links, images or references of any kind. Keep it simple: at most about 25 shapes, clear outlines, warm colours on a soft background shape. People, if any, are simple and modestly dressed. Nothing unsuitable for a school.

If a word is abstract and no simple picture would honestly help a learner (for example "paradigm" or "although"), return an empty string for its svg. A missing picture is better than a confusing one.

Return one entry for every id you were given.`;

/**
 * Draw pictures for up to three words of one unit that have none, and save them to Drive
 * 02_Media/pictures as "<word id>.svg". Returns how many words were handled.
 */
export async function drawWordPictures(
  unitId: string,
): Promise<ActionResult<{ drawn: number; skipped: number }>> {
  return runAction(async () => {
    await allowed();
    const id = z
      .string()
      .regex(/^[A-Z0-9-]{3,40}$/)
      .parse(unitId);
    const admin = createAdminClient();
    const { data: unit } = await admin
      .from("course_units")
      .select("level, words:content->vocabulary")
      .eq("id", id)
      .maybeSingle();
    const all = ((unit?.words ?? []) as unknown as Word[]) ?? [];
    const storage = await getStorage();
    const media = await findLayoutFolder(storage, FOLDER);
    if (!media) throw new ActionError("failed");
    const folder = await storage.ensureFolder(media, "pictures");
    const have = new Set(
      (await storage.list(folder.id)).map((f) => f.name.replace(/(\.none)?\.[a-z0-9]+$/i, "")),
    );
    const words = all.filter((w) => !have.has(w.id)).slice(0, STEP);
    if (words.length === 0) return { drawn: 0, skipped: 0 };
    const answer = await askAi(
      shape,
      SYSTEM,
      `Level: ${unit?.level ?? ""}\n${words.map((w) => `id: ${w.id}\nword: ${w.word}${w.pos ? ` (${w.pos})` : ""}\nmeaning: ${w.definition}`).join("\n\n")}`,
      { timeout: 50_000, maxTokens: 12_000 },
    );
    if (!answer) throw new ActionError("aiFailed");
    let drawn = 0;
    for (const w of words) {
      const svg = cleanSvg(answer.pictures.find((p) => p.id === w.id)?.svg ?? "");
      const body = new TextEncoder().encode(svg ?? "no picture fits this word");
      await storage.upload(
        folder.id,
        pictureFile(w.id, !!svg),
        svg ? "image/svg+xml" : "text/plain",
        body,
      );
      if (svg) drawn++;
    }
    return { drawn, skipped: words.length - drawn };
  });
}
