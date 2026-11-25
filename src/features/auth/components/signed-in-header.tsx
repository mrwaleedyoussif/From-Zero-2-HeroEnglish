import { ChevronDown } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { AppNav } from "@/components/app-nav";
import { InstallApp } from "@/components/install-app";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Actor } from "@/lib/auth/session";
import { stopViewAs } from "@/features/users/view-as-actions";
import { signOut } from "../actions";

/** "Omar Saleh" → "OS" (works for Arabic names too). */
const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => [...w][0] ?? "")
    .join("")
    .toUpperCase();

export async function SignedInHeader({ actor, extra }: { actor: Actor; extra?: ReactNode }) {
  const t = await getTranslations("Shell");
  const locale = await getLocale();

  return (
    <>
      {actor.viewAs && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-center gap-3 bg-reward px-4 py-2 text-sm font-medium text-reward-foreground print:hidden"
        >
          <span>{t("viewingAs", { name: actor.viewAs.full_name })}</span>
          <form action={stopViewAs}>
            <input type="hidden" name="locale" value={locale} />
            <Button type="submit" size="sm" variant="outline">
              {t("exitViewAs")}
            </Button>
          </form>
        </div>
      )}
      {/* Brand bar: navy with a gold edge, the same in every portal (dark scope for its buttons). */}
      <header className="dark flex items-center justify-between gap-3 border-b-2 border-[#e2bd72] bg-[linear-gradient(100deg,#0e223d,#16356b_55%,#3b2a7a)] px-4 py-2.5 text-white print:hidden">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <AppNav home="/home" />
          <Link
            href="/home"
            className="hidden text-lg font-extrabold tracking-tight text-[#f6dc9c] sm:inline"
          >
            {t("appName")}
          </Link>
          {extra}
        </div>
        {/* Account menu: language, theme and sign-out live behind the initials (no script needed). */}
        <details className="relative">
          <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-full pe-3 hover:bg-white/10">
            <span className="sr-only">{t("account")}</span>
            <span
              aria-hidden
              className="flex size-9 items-center justify-center rounded-full bg-[#f6dc9c] text-sm font-bold text-[#0e223d]"
            >
              {initials(actor.real.full_name)}
            </span>
            <span className="hidden text-sm font-medium sm:inline">{actor.real.full_name}</span>
            <ChevronDown aria-hidden className="size-4" />
          </summary>
          <div className="absolute end-0 z-50 mt-2 flex w-64 max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-xl border border-white/15 bg-[#0e223d] p-3 shadow-xl">
            <p className="px-1 text-sm font-semibold">{actor.real.full_name}</p>
            <div className="flex items-center justify-between gap-2">
              <LocaleSwitcher />
              <ThemeToggle />
            </div>
            {actor.real.kind === "staff" && (
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/account">{t("password")}</Link>
              </Button>
            )}
            <InstallApp />
            <form action={signOut}>
              <input type="hidden" name="locale" value={locale} />
              <Button type="submit" variant="outline" size="sm" className="w-full">
                {t("signOut")}
              </Button>
            </form>
          </div>
        </details>
      </header>
    </>
  );
}
