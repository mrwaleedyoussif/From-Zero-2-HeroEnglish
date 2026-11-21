import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

/** What the browser may see of a question: never `correct`, `explanation` or difficulty. */
export interface PublicItem {
  id: string;
  type: string;
  stem: string;
  options: { label: string; body: string }[];
  passage: { title: string; body: string } | null;
  /** /api/media/<id> for listening items. */
  mediaId: string | null;
  timeLimitSec: number | null;
}

export async function publicItem(admin: Admin, itemId: string): Promise<PublicItem | null> {
  const { data } = await admin
    .from("items")
    .select(
      "id, item_type, stem, media_asset_id, time_limit_sec, item_options(label, body), passages(title, body)",
    )
    .eq("id", itemId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    type: data.item_type,
    stem: data.stem,
    options: [...data.item_options].sort((a, b) => a.label.localeCompare(b.label)),
    passage: data.passages ? { title: data.passages.title, body: data.passages.body } : null,
    mediaId: data.media_asset_id,
    timeLimitSec: data.time_limit_sec,
  };
}
