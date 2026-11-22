import { getLocale, getTranslations } from "next-intl/server";
import type { Actor } from "@/lib/auth/session";
import { formatDate } from "@/lib/i18n-names";
import { readNotification } from "./actions";
import { myNotifications } from "./queries";

/** Plain-text values a notification's message may use (level name, who sent kudos, approved). */
function textParams(params: unknown, locale: string) {
  const p = (params ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    name: str(locale === "ar" ? p.name_ar : p.name_en),
    from: str(p.from),
    approved: p.approved === true ? "yes" : "no",
  };
}

/** Header bell (SPEC §12 in-app): unread count and the latest notifications. No JS needed. */
export async function NotificationBell({ actor }: { actor: Actor }) {
  const t = await getTranslations("Notifications");
  const locale = await getLocale();
  const items = await myNotifications(actor.effective.id);
  const unread = items.filter((n) => !n.read_at).length;

  return (
    <details className="relative" data-notifications={unread}>
      <summary
        className="flex size-9 cursor-pointer list-none items-center justify-center rounded-md hover:bg-muted"
        aria-label={t("open", { count: unread })}
      >
        <span aria-hidden>🔔</span>
        {unread > 0 && (
          <span className="absolute -end-1 -top-1 min-w-5 rounded-full bg-destructive px-1 text-center text-xs text-white">
            {unread}
          </span>
        )}
      </summary>
      <div className="absolute end-0 z-50 mt-2 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-1 rounded-lg border bg-popover p-2 shadow-lg">
        <div className="flex items-center justify-between px-2 py-1">
          <span className="font-medium">{t("title")}</span>
          {unread > 0 && !actor.viewAs && (
            <form action={readNotification}>
              <input type="hidden" name="locale" value={locale} />
              <button type="submit" className="text-xs text-primary hover:underline">
                {t("markAllRead")}
              </button>
            </form>
          )}
        </div>
        {items.length === 0 && (
          <p className="px-2 py-3 text-sm text-muted-foreground">{t("empty")}</p>
        )}
        {items.map((n) => (
          <form key={n.id} action={readNotification}>
            <input type="hidden" name="id" value={n.id} />
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              disabled={!!actor.viewAs}
              className={`flex w-full flex-col items-start rounded-md px-2 py-2 text-start text-sm hover:bg-muted ${n.read_at ? "text-muted-foreground" : "font-medium"}`}
            >
              <span>
                {t(n.kind, {
                  title: n.lesson ? (locale === "ar" ? n.lesson.title_ar : n.lesson.title_en) : "",
                  ...textParams(n.params, locale),
                })}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDate(n.created_at, locale)}
                {n.dueAt ? ` · ${t("due", { date: formatDate(n.dueAt, locale) })}` : ""}
              </span>
            </button>
          </form>
        ))}
      </div>
    </details>
  );
}
