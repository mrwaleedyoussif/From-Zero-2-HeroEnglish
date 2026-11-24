import { getTranslations } from "next-intl/server";
import { canSomewhere } from "@/lib/auth/can";
import { isKnownKey } from "@/lib/registry";
import type { Actor } from "@/lib/auth/session";
import { visibleOnly } from "@/lib/visibility/server";
import type { GateConfig } from "../types";
import { GateNavLinks } from "./gate-nav-links";

/** Nav items from the gate config, minus hidden ones and ones the user lacks permission for. */
export async function GateNav({ gate, actor }: { gate: GateConfig; actor: Actor }) {
  const t = await getTranslations("Registry");
  const tg = await getTranslations("Gates");
  // A link is shown only if its page is too: hiding `page.x` must not leave a link that 404s.
  const pageKey = (key: string) => {
    const page = key.replace(/^nav\./, "page.");
    return isKnownKey(page) ? page : key;
  };
  const shown = await visibleOnly(actor, gate.nav, (item) => item.key);
  const visible = await visibleOnly(actor, shown, (item) => pageKey(item.key));
  const items = [];
  for (const item of visible) {
    if (!item.permission || (await canSomewhere(actor, item.permission))) items.push(item);
  }
  if (items.length <= 1) return null;

  return (
    <nav
      aria-label={tg("navLabel")}
      className="flex gap-1 overflow-x-auto border-b border-border bg-card p-2 md:w-60 md:flex-col md:gap-0.5 md:border-e md:border-b-0 md:p-3 print:hidden"
    >
      <GateNavLinks
        items={items.map((item) => ({
          href: item.href,
          label: t(item.key),
          icon: item.key.split(".").at(-1) ?? "",
          group: item.group ? tg(`groups.${item.group}`) : undefined,
        }))}
      />
    </nav>
  );
}
