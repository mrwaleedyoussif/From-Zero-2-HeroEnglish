import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { AppNav } from "@/components/app-nav";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Actor } from "@/lib/auth/session";
import { stopViewAs } from "@/features/users/view-as-actions";
import { signOut } from "../actions";

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
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <AppNav home="/home" />
          <Link href="/home" className="text-lg font-bold text-primary">
            {t("appName")}
          </Link>
          {extra}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">{actor.real.full_name}</span>
          <LocaleSwitcher />
          <ThemeToggle />
          <form action={signOut}>
            <input type="hidden" name="locale" value={locale} />
            <Button type="submit" variant="ghost" size="sm">
              {t("signOut")}
            </Button>
          </form>
        </div>
      </header>
    </>
  );
}
