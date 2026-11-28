import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { canSomewhere } from "@/lib/auth/can";
import type { Actor } from "@/lib/auth/session";
import { presence } from "../queries";

/** The portals that have a "who is online" page. */
const WITH_PAGE = new Set(["owner", "leadership", "teacher"]);

/**
 * Under the person's name in the header: how many of the people they may see are online now.
 * It opens the full list. Shown only to those allowed to see who is online.
 */
export async function OnlineBadge({ actor, gate }: { actor: Actor; gate: string }) {
  if (!(await canSomewhere(actor, "presence:view"))) return null;
  const t = await getTranslations("Presence");
  const count = (await presence()).length;
  const text = (
    <>
      <span
        aria-hidden
        className={`size-2 rounded-full ${count ? "bg-emerald-400" : "bg-white/40"}`}
      />
      {t("badge", { count })}
    </>
  );
  const look = "flex items-center justify-end gap-1.5 pe-3 text-xs font-medium text-white/90";
  return WITH_PAGE.has(gate) ? (
    <Link href={`/${gate}/online`} data-online-badge={count} className={`${look} hover:underline`}>
      {text}
    </Link>
  ) : (
    <span data-online-badge={count} className={look}>
      {text}
    </span>
  );
}
