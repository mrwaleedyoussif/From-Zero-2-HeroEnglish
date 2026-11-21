import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { canSomewhere } from "@/lib/auth/can";
import type { Actor } from "@/lib/auth/session";
import { visibleOnly } from "@/lib/visibility/server";
import type { GateConfig } from "../types";

/** Nav items from the gate config, minus hidden ones and ones the user lacks permission for. */
export async function GateNav({ gate, actor }: { gate: GateConfig; actor: Actor }) {
  const t = await getTranslations("Registry");
  const tg = await getTranslations("Gates");
  const visible = await visibleOnly(actor, gate.nav, (item) => item.key);
  const items = [];
  for (const item of visible) {
    if (!item.permission || (await canSomewhere(actor, item.permission))) items.push(item);
  }
  if (items.length <= 1) return null;

  return (
    <nav
      aria-label={tg("navLabel")}
      className="flex gap-1 overflow-x-auto border-b border-border bg-card p-2 md:w-52 md:flex-col md:border-e md:border-b-0 print:hidden"
    >
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className="rounded-md px-3 py-2 text-sm whitespace-nowrap hover:bg-accent hover:text-accent-foreground"
        >
          {t(item.key)}
        </Link>
      ))}
    </nav>
  );
}
