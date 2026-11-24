import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { AUDIENCES, isAudience } from "@/features/departments/catalog";
import { DepartmentGrid } from "@/features/departments/components/department-grid";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import "@/features/home/home.css";

const LOGO: Partial<Record<string, string>> = {
  "andalus-international": "/brand/schools/andalus-international.webp",
};

export const generateStaticParams = () => AUDIENCES.map((audience) => ({ audience }));

/** Public: what general learners, or a school's people, will find in the app. */
export default async function DepartmentsPage({
  params,
}: PageProps<"/[locale]/departments/[audience]">) {
  const { locale, audience } = await params;
  if (!hasLocale(routing.locales, locale) || !isAudience(audience)) notFound();
  setRequestLocale(locale);
  const other = locale === "ar" ? "en" : "ar";
  const t = await getTranslations({ locale, namespace: "Departments" });
  const o = await getTranslations({ locale: other, namespace: "Departments" });
  const logo = LOGO[audience];

  return (
    <div className="z2h dark flex min-h-dvh flex-1 flex-col">
      <div aria-hidden className="z2h-aurora">
        <i />
        <i />
        <i />
        <i />
      </div>
      <header className="relative flex flex-wrap items-center justify-between gap-2 p-4">
        <AppNav />
        <div className="flex gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </header>
      <main className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 pb-12">
        <div className="z2h-rise flex flex-col items-center gap-2 text-center">
          {logo && (
            <Image
              src={logo}
              alt=""
              width={80}
              height={80}
              className="size-20 rounded-2xl bg-white object-contain p-1"
            />
          )}
          <h1 className="flex flex-wrap items-baseline justify-center gap-x-3 text-3xl font-extrabold">
            <span className="z2h-rainbow">{t("title")}</span>
            <span lang={other} dir={other === "ar" ? "rtl" : "ltr"} className="text-xl">
              {o("title")}
            </span>
          </h1>
          <p className="flex flex-wrap items-baseline justify-center gap-x-3 text-lg font-semibold text-[#f6dc9c]">
            <span>{t(`audience.${audience}`)}</span>
            <span
              lang={other}
              dir={other === "ar" ? "rtl" : "ltr"}
              className="font-normal text-[var(--z-soft)]"
            >
              {o(`audience.${audience}`)}
            </span>
          </p>
          <p className="max-w-xl text-[var(--z-soft)]">{t("intro")}</p>
        </div>
        <DepartmentGrid audience={audience} locale={locale} />
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-1 self-start rounded-full px-4 text-[var(--z-soft)] outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-white"
        >
          <ChevronLeft aria-hidden className="size-5 rtl:rotate-180" />
          {t("home")}
        </Link>
      </main>
    </div>
  );
}
