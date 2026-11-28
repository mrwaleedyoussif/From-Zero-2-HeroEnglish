"use client";

import { Link, usePathname } from "@/i18n/navigation";
import type { NavBadge } from "../nav-badges";
import { ClipboardCheck, Sparkles } from "lucide-react";
import { hueOf, ICONS } from "./nav-icons";

export interface NavLink {
  href: string;
  label: string;
  icon: string;
  group?: string;
  badge?: NavBadge;
  /** One of the gate's main pages: a shortcut in the side menu. */
  main?: boolean;
}

/** The item whose page (or a page beneath it) is open. */
export function useCurrent(items: readonly NavLink[]): string | undefined {
  const pathname = usePathname();
  return items
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

const BADGE = { rose: "bg-[#be123c] text-white", amber: "bg-[#fcd34d] text-[#1a1304]" } as const;

/**
 * One menu item: a coloured icon tile, its name and, when something waits there, a counter.
 * `bar` is the phone's bottom bar (icon above a small name); `side` hides the name when the
 * sidebar is collapsed (the name stays as a tooltip and for screen readers).
 */
export function NavItem({
  item,
  current,
  shape,
}: {
  item: NavLink;
  current: boolean;
  shape: "side" | "bar" | "sheet";
}) {
  const Icon = ICONS[item.icon] ?? (item.icon === "placementCta" ? ClipboardCheck : Sparkles);
  const bar = shape === "bar";
  return (
    <Link
      href={item.href}
      title={item.label}
      aria-current={current ? "page" : undefined}
      data-nav={item.icon}
      className={
        bar
          ? "side-bar-item group flex min-h-14 w-[4.75rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] leading-tight"
          : "side-item group flex min-h-11 items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-sm"
      }
    >
      <span className="relative shrink-0">
        <span aria-hidden data-hue={hueOf(item.icon)} className="icon-tile size-8 rounded-lg">
          <Icon className="size-[18px]" />
        </span>
        {item.badge && (
          <span
            data-badge={item.badge.n}
            className={`side-badge absolute -end-1.5 -top-1.5 min-w-5 rounded-full px-1 text-center text-xs leading-5 font-bold ${BADGE[item.badge.tone]}`}
          >
            {item.badge.n > 99 ? "99+" : item.badge.n}
          </span>
        )}
      </span>
      <span className={bar ? "w-full truncate text-center" : "flex-1 truncate"}>{item.label}</span>
    </Link>
  );
}
