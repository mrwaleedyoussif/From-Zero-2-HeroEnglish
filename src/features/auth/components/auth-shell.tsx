import Image from "next/image";
import type { ReactNode } from "react";
import { AppNav } from "@/components/app-nav";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "@/i18n/navigation";
import "@/features/home/home.css";
import "@/features/home/home-cards.css";
import "./auth-shell.css";

/** Letters drifting behind the form: [glyph, left %, delay s, colour]. */
const FLOATERS = [
  ["A", 8, 0, "violet"],
  ["✦", 24, 6, "gold"],
  ["B", 76, 3, "sky"],
  ["★", 90, 9, "rose"],
] as const;

/**
 * The frame of every sign-in page, in the home page's look: moving colour behind, the logo on
 * top, and the form on a glass card whose accent colour says who it is for (violet students,
 * blue staff, green general learners).
 */
export function AuthShell({
  title,
  description,
  children,
  footer,
  tone = "sky",
  icon,
  badge,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  tone?: "violet" | "sky" | "mint";
  icon?: ReactNode;
  /** Extra line above the title, e.g. the school the learner picked on the home page. */
  badge?: ReactNode;
}) {
  return (
    <main className="z2h dark flex min-h-dvh flex-1 flex-col">
      <div aria-hidden className="z2h-aurora">
        <i />
        <i />
        <i />
        <i />
      </div>
      {FLOATERS.map(([glyph, left, delay, colour]) => (
        <span
          key={glyph}
          aria-hidden
          className="z2h-floater"
          data-tone={colour}
          style={{ left: `${left}%`, animationDelay: `${delay}s` }}
        >
          {glyph}
        </span>
      ))}
      <header className="flex flex-wrap items-center justify-between gap-2 p-4">
        <AppNav />
        <div className="flex gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </header>
      <div className="flex flex-1 flex-col items-center justify-start gap-5 px-4 pt-2 pb-16 sm:justify-center">
        <Link href="/" tabIndex={-1} aria-hidden className="z2h-logo-wrap block w-full max-w-56">
          <Image
            src="/brand/wordmark.webp"
            alt=""
            width={900}
            height={589}
            priority
            className="z2h-logo h-auto w-full"
          />
        </Link>
        <section data-tone={tone} className="z2h-auth z2h-rise w-full max-w-md rounded-3xl p-6">
          <div className="mb-5 flex items-center gap-4">
            {icon && (
              <span
                aria-hidden
                className="z2h-auth-icon flex size-14 shrink-0 items-center justify-center rounded-2xl"
              >
                {icon}
              </span>
            )}
            <div className="flex flex-col gap-1">
              {badge}
              <h1 className="text-2xl font-extrabold">{title}</h1>
              <p className="text-sm text-[var(--z-soft)]">{description}</p>
            </div>
          </div>
          <div className="flex flex-col gap-6">
            {children}
            {footer && <div className="text-center text-sm">{footer}</div>}
          </div>
        </section>
      </div>
    </main>
  );
}
