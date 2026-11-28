import { getTranslations } from "next-intl/server";
import { canSomewhere } from "@/lib/auth/can";
import { isKnownKey } from "@/lib/registry";
import type { Actor } from "@/lib/auth/session";
import { visibleOnly } from "@/lib/visibility/server";
import type { GateConfig } from "../types";
import { navBadges } from "../nav-badges";
import { GateSidebar } from "./gate-sidebar";
import { SidebarExtras } from "./sidebar-extras";

/** "Omar Saleh" → "OS" (works for Arabic names too). */
const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => [...w][0] ?? "")
    .join("")
    .toUpperCase();

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
  const badges = await navBadges(actor, gate.key);
  const name = actor.effective.full_name;
  const blocks = gate.sidebar ?? [];

  return (
    <GateSidebar
      labels={{
        nav: tg("navLabel"),
        collapse: tg("collapse"),
        expand: tg("expand"),
        more: tg("more"),
        shortcuts: tg("shortcuts"),
      }}
      profile={{ initials: initials(name), name, line: t(`gate.${gate.key}`) }}
      extra={{
        top: <SidebarExtras blocks={blocks.filter((b) => b === "continue")} actor={actor} />,
        bottom: <SidebarExtras blocks={blocks.filter((b) => b !== "continue")} actor={actor} />,
      }}
      items={items.map((item) => ({
        href: item.href,
        label: t(item.key),
        icon: item.key.split(".").at(-1) ?? "",
        group: item.group ? tg(`groups.${item.group}`) : undefined,
        badge: badges[item.key],
        main: item.main,
      }))}
    />
  );
}
