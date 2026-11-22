import { getLocale, getTranslations } from "next-intl/server";
import { supervisionForSchool } from "@/features/supervision/queries";
import { formatDate } from "@/lib/i18n-names";
import { createClient } from "@/lib/supabase/server";

interface Node {
  id: string;
  name: string;
  kind: string;
  children: Node[];
}

/** Staff supervision tree (SPEC §11): roots are staff nobody in the school supervises. */
export async function SupervisionTree({
  schoolId,
  depth = 6,
}: {
  schoolId: string;
  depth?: number;
}) {
  const t = await getTranslations("Insights");
  const locale = await getLocale();
  const [{ groups, staff }, { data: seen }] = await Promise.all([
    supervisionForSchool(schoolId),
    (await createClient()).rpc("staff_last_seen", { p_school: schoolId }),
  ]);
  const lastSeen = new Map((seen ?? []).map((s) => [s.user_id, s.last_sign_in_at]));
  const edges = new Map<string, { id: string; name: string; kind: string }[]>();
  const supervised = new Set<string>();
  for (const g of groups)
    for (const l of g.links)
      if (l.supervisor && l.supervisee) {
        edges.set(l.supervisor.id, [
          ...(edges.get(l.supervisor.id) ?? []),
          { id: l.supervisee.id, name: l.supervisee.full_name, kind: l.kind },
        ]);
        supervised.add(l.supervisee.id);
      }
  const build = (id: string, name: string, kind: string, path: Set<string>): Node => ({
    id,
    name,
    kind,
    children:
      path.size >= depth
        ? []
        : (edges.get(id) ?? [])
            .filter((c) => !path.has(c.id))
            .map((c) => build(c.id, c.name, c.kind, new Set([...path, c.id]))),
  });
  const roots = staff
    .filter((s) => !supervised.has(s.id) && edges.has(s.id))
    .map((s) => build(s.id, s.full_name, "", new Set([s.id])));
  if (roots.length === 0)
    return <p className="text-sm text-muted-foreground">{t("noSupervision")}</p>;

  const render = (n: Node) => {
    const seenAt = lastSeen.get(n.id);
    return (
      <li key={`${n.id}-${n.kind}`} className="flex flex-col gap-1">
        <span className="flex flex-wrap items-baseline gap-2" data-person={n.name}>
          <span className="font-medium">{n.name}</span>
          {n.kind && (
            <span className="rounded bg-muted px-1.5 text-xs">{t(`linkKind.${n.kind}`)}</span>
          )}
          <span className="text-xs text-muted-foreground">
            {seenAt ? t("lastSeen", { date: formatDate(seenAt, locale) }) : t("neverSignedIn")}
          </span>
        </span>
        {n.children.length > 0 && (
          <ul className="ms-4 flex flex-col gap-1 border-s ps-3">{n.children.map(render)}</ul>
        )}
      </li>
    );
  };
  return (
    <ul className="flex flex-col gap-2" data-tree>
      {roots.map(render)}
    </ul>
  );
}
