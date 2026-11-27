import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { formatDateTime } from "@/lib/i18n-names";
import { createClient } from "@/lib/supabase/server";
import { isOnline, presence } from "../queries";

/** Who is online now, then who was here today: students and staff the viewer may see. */
export async function OnlineView() {
  const t = await getTranslations("Presence");
  const locale = await getLocale();
  const people = await presence(24 * 60);
  const db = await createClient();
  const schoolIds = [...new Set(people.map((p) => p.school_id).filter((s): s is string => !!s))];
  const { data: schools } =
    schoolIds.length > 1
      ? await db.from("schools").select("id, name_en, name_ar").in("id", schoolIds)
      : { data: [] };
  const school = (id: string | null) => {
    const s = schools?.find((x) => x.id === id);
    return s ? (locale === "ar" ? s.name_ar : s.name_en) : "";
  };
  const now = people.filter((p) => isOnline(p.seen_at));
  const earlier = people.filter((p) => !isOnline(p.seen_at));
  const list = (rows: typeof people, online: boolean) => (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((p) => (
        <li
          key={p.user_id}
          data-person={p.user_id}
          data-online={online}
          className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2"
        >
          <span
            aria-hidden
            className={`size-3 shrink-0 rounded-full ${online ? "bg-success" : "bg-muted-foreground/40"}`}
          />
          <span className="flex min-w-0 flex-col">
            <strong className="truncate">{p.full_name}</strong>
            <span className="text-xs text-muted-foreground">
              {t(p.kind === "student" ? "student" : "staff")}
              {school(p.school_id) && ` · ${school(p.school_id)}`}
              {!online && ` · ${formatDateTime(p.seen_at, locale)}`}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
  return (
    <>
      <PageHeader title={t("title")} description={t("intro")} />
      <section className="flex flex-col gap-3" data-online-now={now.length}>
        <h2 className="text-lg font-bold">{t("now", { count: now.length })}</h2>
        {now.length === 0 ? (
          <p className="text-muted-foreground">{t("nobody")}</p>
        ) : (
          list(now, true)
        )}
      </section>
      {earlier.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">{t("today", { count: earlier.length })}</h2>
          {list(earlier, false)}
        </section>
      )}
    </>
  );
}
