import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { canSomewhere } from "@/lib/auth/can";
import type { Actor } from "@/lib/auth/session";
import { presence } from "../queries";

/** The portals that have a "who is online" page. */
const WITH_PAGE = new Set(["owner", "leadership", "teacher"]);

const SHOWN = 3;

/**
 * Under the person's name in the header: the names of the people they may see who are here
 * now (the first few, then "+N"). It opens the full list. Shown only to those allowed.
 */
export async function OnlineBadge({ actor, gate }: { actor: Actor; gate: string }) {
  if (!(await canSomewhere(actor, "presence:view"))) return null;
  const t = await getTranslations("Presence");
  const people = await presence();
  const count = people.length;
  const names = people.slice(0, SHOWN).map((p) => p.full_name);
  const text = (
    <>
      <span
        aria-hidden
        className={`size-2 shrink-0 rounded-full ${count ? "bg-emerald-400" : "bg-white/40"}`}
      />
      <span className="sr-only">{t("badgeLabel")}</span>
      <span className="truncate" dir="auto">
        {count ? names.join(t("comma")) : t("badgeNone")}
      </span>
      {count > SHOWN && <span className="shrink-0">+{count - SHOWN}</span>}
    </>
  );
  const look =
    "flex max-w-[min(70vw,26rem)] items-center justify-end gap-1.5 pe-3 text-xs font-medium text-white/90";
  return WITH_PAGE.has(gate) ? (
    <Link
      href={`/${gate}/online`}
      data-online-badge={count}
      title={people.map((p) => p.full_name).join(t("comma"))}
      className={`${look} hover:underline`}
    >
      {text}
    </Link>
  ) : (
    <span data-online-badge={count} className={look}>
      {text}
    </span>
  );
}
