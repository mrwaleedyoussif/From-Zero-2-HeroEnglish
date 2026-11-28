"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { type NavLink, NavItem, useCurrent } from "./gate-nav-links";
import "./gate-shell.css";

export interface SidebarLabels {
  nav: string;
  collapse: string;
  expand: string;
  more: string;
  shortcuts: string;
}

/** How long the open menu waits, with nobody on it, before it tucks itself away again. */
const IDLE_MS = 6000;

/** How many shortcuts the side menu holds when the gate does not name its main pages. */
const SHORT = 5;

/**
 * The portal's navigation, in two parts. A task bar along the bottom of every page holds an
 * icon for each page (it scrolls sideways when there are many). A small button in the middle
 * of the right edge opens a short menu with the main pages only; it closes by itself after a
 * choice, a click outside, Escape, or a few seconds with nobody on it.
 */
export function GateSidebar({
  items,
  labels,
  profile,
  extra,
  taskbar = true,
}: {
  items: readonly NavLink[];
  labels: SidebarLabels;
  /** `image` (the app badge on public pages) replaces the initials. */
  profile: { initials: string; name: string; line: string; image?: string };
  /** Extra blocks: `top` under the person (a student's "Continue"), `bottom` under the menu. */
  extra?: { top?: ReactNode; bottom?: ReactNode };
  /** Public pages have a few links only: no task bar, every link in the side menu. */
  taskbar?: boolean;
}) {
  const current = useCurrent(items);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const bar = useRef<HTMLElement>(null);
  const idle = useRef<ReturnType<typeof setTimeout>>(undefined);
  const waiting = items.reduce((n, i) => n + (i.badge?.n ?? 0), 0);
  const main = items.filter((i) => i.main);
  const short = !taskbar ? items : main.length ? main : items.slice(0, SHORT);

  // Keep the open page's icon in view on the task bar.
  useEffect(() => {
    bar.current
      ?.querySelector("[aria-current='page']")
      ?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [current]);

  const rest = useCallback(() => clearTimeout(idle.current), []);
  const tuck = useCallback(() => {
    clearTimeout(idle.current);
    idle.current = setTimeout(() => setOpen(false), IDLE_MS);
  }, []);
  // A choice was made: the page changed, so the menu goes back to its button.
  const [seen, setSeen] = useState(pathname);
  if (seen !== pathname) {
    setSeen(pathname);
    setOpen(false);
  }
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      clearTimeout(idle.current);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="side-menu"
        title={labels.expand}
        data-menu-button
        hidden={open}
        className="side-tab dark fixed top-1/2 right-0 z-40 flex size-12 -translate-y-1/2 items-center justify-center rounded-s-2xl print:hidden"
      >
        <Menu aria-hidden className="size-6" />
        <span className="sr-only">{labels.expand}</span>
        {waiting > 0 && (
          <span className="absolute -start-1.5 -top-1.5 min-w-5 rounded-full bg-[#be123c] px-1 text-center text-xs leading-5 font-bold text-white">
            {waiting > 99 ? "99+" : waiting}
          </span>
        )}
      </button>
      {open && (
        <div
          aria-hidden
          data-menu-backdrop
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/35 print:hidden"
        />
      )}
      <nav
        id="side-menu"
        aria-label={labels.shortcuts}
        data-open={open}
        inert={!open}
        onPointerEnter={rest}
        onPointerLeave={tuck}
        onFocus={rest}
        className="side dark fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] translate-x-full flex-col gap-1 p-3 transition-transform duration-300 data-[open=true]:translate-x-0 print:hidden"
      >
        <div className="side-profile mb-1 flex items-center gap-2.5 rounded-2xl p-2">
          {profile.image ? (
            <Image src={profile.image} alt="" width={40} height={40} className="size-10 shrink-0" />
          ) : (
            <span
              aria-hidden
              className="side-avatar flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
            >
              {profile.initials}
            </span>
          )}
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold">{profile.name}</span>
            <span className="truncate text-xs text-[#f6dc9c]">{profile.line}</span>
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={labels.collapse}
            title={labels.collapse}
            className="side-item flex size-11 shrink-0 items-center justify-center rounded-xl"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain">
          {extra?.top}
          {short.map((item) => (
            <NavItem key={item.href} item={item} current={item.href === current} shape="side" />
          ))}
          {extra?.bottom}
        </div>
      </nav>
      {taskbar && (
        <nav
          ref={bar}
          aria-label={labels.nav}
          data-taskbar
          className="side-bar dark fixed inset-x-0 bottom-0 z-30 flex justify-start gap-1 overflow-x-auto px-2 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] sm:justify-center print:hidden"
        >
          {items.map((item) => (
            <NavItem key={item.href} item={item} current={item.href === current} shape="bar" />
          ))}
        </nav>
      )}
    </>
  );
}
