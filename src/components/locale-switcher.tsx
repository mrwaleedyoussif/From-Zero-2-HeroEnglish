"use client";

import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const current = useLocale();
  const pathname = usePathname();

  return (
    <nav aria-label={t("label")} className="flex gap-1">
      {routing.locales.map((locale) => (
        <Button key={locale} asChild size="sm" variant={locale === current ? "default" : "ghost"}>
          <Link
            href={pathname}
            locale={locale}
            lang={locale}
            aria-current={locale === current ? "true" : undefined}
          >
            {t(locale)}
          </Link>
        </Button>
      ))}
    </nav>
  );
}
