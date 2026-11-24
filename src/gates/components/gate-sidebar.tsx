"use client";

import { Ellipsis, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Fragment, type ReactNode, useSyncExternalStore } from "react";
import { usePathname } from "@/i18n/navigation";
import { type NavLink, NavItem, useCurrent } from "./gate-nav-links";

/** Whether the sidebar is folded to icons: remembered on this device, never required to work. */
const KEY = "z2h-nav-collapsed";
const listeners = new Set<() => void>();
let chosen: boolean | null = null;
const subscribe = (f: () => void) => {
  listeners.add(f);
  return () => void listeners.delete(f);
};
const isCollapsed = () => {
  if (chosen !== null) return chosen;
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};
const setCollapsed = (value: boolean) => {
  chosen = value;
  try {
    localStorage.setItem(KEY, value ? "1" : "0");
  } catch {
    // not remembered; still folds for this visit
  }
  listeners.forEach((f) => f());
};

export interface SidebarLabels {
  nav: string;
  collapse: string;
  expand: string;
  more: string;
}

/**
 * The portal's menu. On a computer: a sidebar with the person on top, grouped coloured items
 * with counters, and a button that folds it to icons. On a phone: a bar at the bottom with the
 * first items and "More" for the rest.
 */
export function GateSidebar({
  items,
  labels,
  profile,
  extra,
}: {
  items: readonly NavLink[];
  labels: SidebarLabels;
  profile: { initials: string; name: string; line: string };
  /** Extra blocks: `top` under the person (a student's "Continue"), `bottom` under the menu. */
  extra?: { top?: ReactNode; bottom?: ReactNode };
}) {
  const current = useCurrent(items);
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribe, isCollapsed, () => false);
  const inBar = items.length > 5 ? items.slice(0, 4) : items;
  const rest = items.slice(inBar.length);
  const waiting = rest.reduce((n, i) => n + (i.badge?.n ?? 0), 0);

  return (
    <>
      <nav
        aria-label={labels.nav}
        data-collapsed={collapsed}
        className="side dark group/side hidden w-64 shrink-0 flex-col gap-1 p-3 transition-[width] duration-300 data-[collapsed=true]:w-[4.5rem] data-[collapsed=true]:overflow-x-hidden md:sticky md:top-0 md:flex md:h-dvh md:self-start md:overflow-y-auto print:hidden"
      >
        <div className="side-profile mb-1 flex items-center gap-2.5 rounded-2xl p-2 group-data-[collapsed=true]/side:bg-transparent group-data-[collapsed=true]/side:p-1 group-data-[collapsed=true]/side:shadow-none">
          <span
            aria-hidden
            className="side-avatar flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
          >
            {profile.initials}
          </span>
          <span className="flex min-w-0 flex-1 flex-col group-data-[collapsed=true]/side:hidden">
            <span className="truncate text-sm font-semibold">{profile.name}</span>
            <span className="truncate text-xs text-[#f6dc9c]">{profile.line}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-expanded={!collapsed}
          title={collapsed ? labels.expand : labels.collapse}
          className="side-item flex min-h-11 items-center gap-2.5 rounded-xl px-2.5 text-sm"
        >
          <span
            aria-hidden
            data-hue="blue"
            className="icon-tile size-8 rounded-lg rtl:-scale-x-100"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-[18px]" />
            ) : (
              <PanelLeftClose className="size-[18px]" />
            )}
          </span>
          <span className="group-data-[collapsed=true]/side:sr-only">
            {collapsed ? labels.expand : labels.collapse}
          </span>
        </button>
        <div className="flex flex-col gap-2 group-data-[collapsed=true]/side:hidden empty:hidden">
          {extra?.top}
        </div>
        {items.map((item, i) => (
          <Fragment key={item.href}>
            {item.group && item.group !== items[i - 1]?.group && (
              <p className="side-group px-2.5 pt-3 pb-0.5 text-xs font-semibold tracking-wide uppercase group-data-[collapsed=true]/side:invisible group-data-[collapsed=true]/side:h-2 group-data-[collapsed=true]/side:p-0">
                {item.group}
              </p>
            )}
            <NavItem item={item} current={item.href === current} shape="side" />
          </Fragment>
        ))}
        <div className="flex flex-col gap-2 pt-3 group-data-[collapsed=true]/side:hidden empty:hidden">
          {extra?.bottom}
        </div>
      </nav>

      <nav
        aria-label={labels.nav}
        className="side-bar dark fixed inset-x-0 bottom-0 z-40 grid auto-cols-fr grid-flow-col gap-1 px-2 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] md:hidden print:hidden"
      >
        {inBar.map((item) => (
          <NavItem key={item.href} item={item} current={item.href === current} shape="bar" />
        ))}
        {rest.length > 0 && (
          // Remounted on every page change, so the sheet closes after a choice.
          <details key={pathname} className="group/more min-w-0">
            <summary className="flex min-h-14 cursor-pointer list-none flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] leading-tight">
              <span className="relative">
                <span aria-hidden data-hue="violet" className="icon-tile size-8 rounded-lg">
                  <Ellipsis className="size-[18px]" />
                </span>
                {waiting > 0 && (
                  <span className="absolute -end-1.5 -top-1.5 min-w-5 rounded-full bg-[#be123c] px-1 text-center text-xs leading-5 font-bold text-white">
                    {waiting > 99 ? "99+" : waiting}
                  </span>
                )}
              </span>
              {labels.more}
            </summary>
            <div className="absolute inset-x-2 bottom-full mb-2 grid max-h-[70dvh] grid-cols-2 gap-1 overflow-y-auto rounded-2xl border border-border bg-card p-2 shadow-xl">
              {rest.map((item) => (
                <NavItem
                  key={item.href}
                  item={item}
                  current={item.href === current}
                  shape="sheet"
                />
              ))}
            </div>
          </details>
        )}
      </nav>
    </>
  );
}
