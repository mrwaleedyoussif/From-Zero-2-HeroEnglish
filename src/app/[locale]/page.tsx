import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/** Public front door: one way in for students (school code + PIN), one for staff (email link). */
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Home");

  const doors = [
    {
      key: "student",
      href: "/student-login",
      title: t("studentTitle"),
      intro: t("studentIntro"),
      action: t("studentAction"),
    },
    {
      key: "staff",
      href: "/login",
      title: t("staffTitle"),
      intro: t("staffIntro"),
      action: t("staffAction"),
    },
  ] as const;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
      <header className="flex items-center justify-end gap-2">
        <LocaleSwitcher />
        <ThemeToggle />
      </header>

      <section className="flex flex-col gap-3 text-start">
        <h1 className="text-4xl font-bold text-primary">{t("title")}</h1>
        <p className="text-xl">{t("tagline")}</p>
        <p className="text-muted-foreground">{t("intro")}</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {doors.map((door) => (
          <div
            key={door.key}
            data-theme={door.key}
            className="flex flex-col gap-3 rounded-lg border border-border bg-background p-5 text-foreground"
          >
            <h2 className="text-lg font-semibold">{door.title}</h2>
            <p className="flex-1 text-sm text-muted-foreground">{door.intro}</p>
            <Button asChild size="lg">
              <Link href={door.href}>{door.action}</Link>
            </Button>
          </div>
        ))}
      </section>
    </main>
  );
}
