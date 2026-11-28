"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { type NavLink, NavItem, useCurrent } from "./gate-nav-links";
import "./gate-shell.css";

export interface SidebarLabels {
  nav: string;
  collapse: string;
  expand: string;
  more: string;
}

/** How long the open menu waits, with nobody on it, before it tucks itself away again. */
const IDLE_MS = 6000;

/**
 * The portal's menu. It stays out of the way as a small button in the middle of the right
 * edge; pressing it slides the menu in, and it closes by itself after a choice, a click outside,
 * Escape, or a few seconds with nobody on it. A long menu turns like a wheel: scrolling past
 * the last item brings the first one round again, without an end.
 */
export function GateSidebar({
  items,
  labels,
  profile,
  extra,
}: {
  items: readonly NavLink[];
  labels: SidebarLabels;
  /** `image` (the app badge on public pages) replaces the initials. */
  profile: { initials: string; name: string; line: string; image?: string };
  /** Extra blocks: `top` under the person (a student's "Continue"), `bottom` under the menu. */
  extra?: { top?: ReactNode; bottom?: ReactNode };
}) {
  const current = useCurrent(items);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [turn, setTurn] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const shift = useRef(0);
  const idle = useRef<ReturnType<typeof setTimeout>>(undefined);
  const waiting = items.reduce((n, i) => n + (i.badge?.n ?? 0), 0);

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

  // The wheel: one row per item (and the extra blocks), turned by `turn`.
  const rows: { key: string; node: ReactNode; group?: string }[] = [
    ...(extra?.top ? [{ key: "#top", node: extra.top }] : []),
    ...items.map((item) => ({
      key: item.href,
      group: item.group,
      node: <NavItem item={item} current={item.href === current} shape="side" />,
    })),
    ...(extra?.bottom ? [{ key: "#bottom", node: extra.bottom }] : []),
  ];
  const at = ((turn % rows.length) + rows.length) % rows.length;
  const turned = [...rows.slice(at), ...rows.slice(0, at)];

  const onScroll = () => {
    const el = scroller.current;
    if (!el || el.scrollHeight <= el.clientHeight + 8 || shift.current !== 0) return;
    const first = el.firstElementChild as HTMLElement | null;
    const last = el.lastElementChild as HTMLElement | null;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2 && first) {
      shift.current = -first.offsetHeight;
      setTurn((t) => t + 1);
    } else if (el.scrollTop <= 1 && last) {
      shift.current = last.offsetHeight;
      setTurn((t) => t - 1);
    }
  };
  // After a row moved to the other end, keep what the person sees where it was.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && shift.current !== 0) el.scrollTop += shift.current;
    shift.current = 0;
  }, [turn]);
  useLayoutEffect(() => {
    const el = scroller.current;
    if (open && el && el.scrollHeight > el.clientHeight + 8 && el.scrollTop < 2) el.scrollTop = 2;
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
        aria-label={labels.nav}
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
        <div
          ref={scroller}
          onScroll={onScroll}
          data-menu-wheel
          className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain"
        >
          {turned.map((row, i) => (
            <div key={row.key} className="flex shrink-0 flex-col gap-1">
              {row.group && row.group !== turned[i - 1]?.group && (
                <p className="side-group px-2.5 pt-3 pb-0.5 text-xs font-semibold tracking-wide uppercase">
                  {row.group}
                </p>
              )}
              {row.node}
            </div>
          ))}
        </div>
      </nav>
    </>
  );
}
