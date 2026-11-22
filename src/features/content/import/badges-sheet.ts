import { z } from "zod";
import { parseBadgeRule } from "@/features/rewards/engine/badges";
import type { Comparable } from "./diff";
import { id, intDefault, oneOfDefault, opt, req, STATUSES } from "./fields";

/** Badges sheet (docs/DATA_TEMPLATES.md): rules are JSON checked by the rewards engine. */
export const badgeRow = z.object({
  badge_id: id(),
  name_en: req(),
  name_ar: req(),
  description: opt(),
  icon_file: opt(),
  rule_json: req().refine((v) => parseBadgeRule(v) !== null, "badRule"),
  xp_bonus: intDefault(0, 10000, 0),
  status: oneOfDefault(STATUSES, "active"),
});
export type BadgeRow = z.infer<typeof badgeRow>;

const s = (v: unknown): string | null =>
  v === null || v === undefined || v === "" ? null : String(v);

/** Rules compare in canonical form, so spacing or key order in the sheet doesn't count as a change. */
const canonical = (rule: unknown) => JSON.stringify(parseBadgeRule(rule));

export const badgeRecord = (r: BadgeRow): Comparable => ({
  name_en: r.name_en,
  name_ar: r.name_ar,
  description: s(r.description),
  icon_file: s(r.icon_file),
  rule_json: canonical(r.rule_json),
  xp_bonus: r.xp_bonus,
  status: r.status,
});

export const dbBadgeRecord = (d: Record<string, unknown>): Comparable => ({
  name_en: s(d.name_en),
  name_ar: s(d.name_ar),
  description: s(d.description),
  icon_file: s(d.icon_file),
  rule_json: canonical(d.rule),
  xp_bonus: Number(d.xp_bonus),
  status: s(d.status),
});

/** The DB row to upsert (by code) for a sheet row. */
export const badgeUpsert = (r: BadgeRow, mediaId: (name: string | undefined) => string | null) => ({
  code: r.badge_id,
  name_en: r.name_en,
  name_ar: r.name_ar,
  description: r.description ?? null,
  icon_file: r.icon_file ?? null,
  media_asset_id: mediaId(r.icon_file),
  rule: parseBadgeRule(r.rule_json) ?? {},
  xp_bonus: r.xp_bonus,
  status: r.status,
});
