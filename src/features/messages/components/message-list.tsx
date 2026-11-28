import { getLocale, getTranslations } from "next-intl/server";
import { formatDateTime } from "@/lib/i18n-names";
import type { MessageRow } from "../queries";

/** A list of messages: who wrote, to whom, when, and (for the sender) how many have read it. */
export async function MessageList({
  rows,
  kind,
  empty,
}: {
  rows: MessageRow[];
  kind: "inbox" | "sent";
  empty: string;
}) {
  const t = await getTranslations("Messages");
  const locale = await getLocale();
  if (rows.length === 0) return <p className="text-muted-foreground">{empty}</p>;
  return (
    <ul className="flex flex-col gap-3" data-messages={kind}>
      {rows.map((m) => (
        <li
          key={m.id}
          data-message={m.id}
          data-unread={m.unread ? "true" : undefined}
          className={`rounded-2xl border bg-card p-4 ${m.unread ? "border-primary ring-1 ring-primary/40" : "border-border"}`}
        >
          <p className="flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
            <strong className="text-base text-foreground">
              {kind === "inbox" ? m.from : t("from", { name: m.from })}
            </strong>
            {kind === "sent" && (
              <span>
                {t("to", { names: m.to.includes("*") ? t("allTeachers") : m.to.join(", ") })}
              </span>
            )}
            <span>{formatDateTime(m.created_at, locale)}</span>
            {m.unread && (
              <span className="rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground">
                {t("new")}
              </span>
            )}
          </p>
          <p dir="auto" className="mt-2 text-start whitespace-pre-line">
            {m.body}
          </p>
          {m.read !== null && (
            <p className="mt-2 text-xs text-muted-foreground" data-read={m.read}>
              {t("readBy", { read: m.read, total: m.recipients })}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
