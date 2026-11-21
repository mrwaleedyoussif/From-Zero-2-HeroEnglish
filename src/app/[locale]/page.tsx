import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { routing } from "@/i18n/routing";

const cefrLevels = [
  { label: "Pre-A1", className: "bg-cefr-pre-a1 text-cefr-light-fg" },
  { label: "A1", className: "bg-cefr-a1 text-cefr-light-fg" },
  { label: "A2", className: "bg-cefr-a2 text-cefr-light-fg" },
  { label: "B1", className: "bg-cefr-b1 text-cefr-light-fg" },
  { label: "B2", className: "bg-cefr-b2 text-cefr-dark-fg" },
  { label: "C1", className: "bg-cefr-c1 text-cefr-dark-fg" },
  { label: "C2", className: "bg-cefr-c2 text-cefr-dark-fg" },
] as const;

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Home");

  const themes = [
    { key: "staff", label: t("staffTheme") },
    { key: "student", label: t("studentTheme") },
  ] as const;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">{t("status")}</p>
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <section className="flex flex-col gap-3 text-start">
        <h1 className="text-4xl font-bold text-primary">{t("title")}</h1>
        <p className="text-xl">{t("tagline")}</p>
        <p className="text-muted-foreground">{t("intro")}</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {themes.map((theme) => (
          <div
            key={theme.key}
            data-theme={theme.key}
            className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4 text-foreground"
          >
            <h2 className="font-semibold">{theme.label}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <Button>{t("primaryAction")}</Button>
              <Button variant="secondary">{t("secondaryAction")}</Button>
              <span className="rounded-full bg-reward px-3 py-1 text-sm font-semibold text-reward-foreground">
                {t("reward")}
              </span>
            </div>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">{t("cefrScale")}</h2>
        {/* CEFR levels always read low → high in reading order; dir="ltr" keeps the scale consistent. */}
        <ol
          dir="ltr"
          className="grid grid-cols-7 overflow-hidden rounded-md text-center text-xs font-semibold"
        >
          {cefrLevels.map((level) => (
            <li key={level.label} className={`py-2 ${level.className}`}>
              {level.label}
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
