import "server-only";
import { chunks, IN_BATCH, PAGE, selectAll } from "@/lib/supabase/batch";
import type { createClient } from "@/lib/supabase/server";

type Db = Awaited<ReturnType<typeof createClient>>;
type Row = { id: string; name: string | null };
type Page = PromiseLike<{ data: Row[] | null; error: { message: string } | null }>;

/**
 * Rows that name a media file but are not linked to it yet. This happens when the sheet was
 * applied before the file reached 02_Media (or the file was renamed since): the row itself did
 * not change, so the normal diff never touches it again.
 */
function sources(db: Db): { read: (after: string | null) => Page; link: Link }[] {
  const page = <Q extends { gt(c: "id", v: string): Q; order(c: "id"): { limit(n: number): Q } }>(
    q: Q,
    after: string | null,
  ) => (after ? q.gt("id", after) : q).order("id").limit(PAGE);
  return [
    {
      read: (after) =>
        page(
          db
            .from("passages")
            .select("id, name:media_file")
            .is("media_asset_id", null)
            .not("media_file", "is", null),
          after,
        ),
      link: (ids, asset) =>
        db.from("passages").update({ media_asset_id: asset }).in("id", ids).select("id"),
    },
    {
      read: (after) =>
        page(
          db
            .from("items")
            .select("id, name:media_file")
            .is("media_asset_id", null)
            .not("media_file", "is", null),
          after,
        ),
      link: (ids, asset) =>
        db.from("items").update({ media_asset_id: asset }).in("id", ids).select("id"),
    },
    {
      read: (after) =>
        page(
          db
            .from("lessons")
            .select("id, name:content_link")
            .is("media_asset_id", null)
            .not("content_link", "is", null),
          after,
        ),
      link: (ids, asset) =>
        db.from("lessons").update({ media_asset_id: asset }).in("id", ids).select("id"),
    },
    {
      read: (after) =>
        page(
          db
            .from("badges")
            .select("id, name:icon_file")
            .is("media_asset_id", null)
            .not("icon_file", "is", null),
          after,
        ),
      link: (ids, asset) =>
        db.from("badges").update({ media_asset_id: asset }).in("id", ids).select("id"),
    },
  ];
}
type Link = (
  ids: string[],
  asset: string,
) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;

async function pending(db: Db, known: (name: string) => boolean) {
  const out: { link: Link; byName: Map<string, string[]> }[] = [];
  for (const { read, link } of sources(db)) {
    const { data, error } = await selectAll(read, (r) => r.id);
    if (error || !data) throw new Error(`Could not read media links: ${error?.message}`);
    const byName = new Map<string, string[]>();
    for (const r of data)
      if (r.name && known(r.name)) byName.set(r.name, [...(byName.get(r.name) ?? []), r.id]);
    out.push({ link, byName });
  }
  return out;
}

/** How many rows would gain their media link on the next apply. */
export async function countUnlinkedMedia(db: Db, names: ReadonlySet<string>): Promise<number> {
  const groups = await pending(db, (n) => names.has(n));
  return groups.reduce(
    (n, g) => n + [...g.byName.values()].reduce((m, ids) => m + ids.length, 0),
    0,
  );
}

/** Link every such row to its file (name → media_assets.id). Returns how many were linked. */
export async function linkMedia(db: Db, media: ReadonlyMap<string, string>): Promise<number> {
  let linked = 0;
  for (const { link, byName } of await pending(db, (n) => media.has(n))) {
    for (const [name, ids] of byName) {
      const asset = media.get(name);
      if (!asset) continue;
      for (const batch of chunks(ids, IN_BATCH)) {
        const { error } = await link(batch, asset);
        if (error) throw new Error(`Could not link media: ${error.message}`);
        linked += batch.length;
      }
    }
  }
  return linked;
}
