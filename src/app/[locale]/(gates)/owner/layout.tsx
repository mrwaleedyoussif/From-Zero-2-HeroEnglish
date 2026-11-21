import { getTranslations, setRequestLocale } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";
import { SignedInHeader } from "@/features/auth/components/signed-in-header";
import { consoleSections } from "@/features/owner/sections";
import { Link } from "@/i18n/navigation";
import { canSomewhere } from "@/lib/auth/can";
import { requireActor } from "@/lib/auth/guard";

export default async function OwnerLayout({ children, params }: LayoutProps<"/[locale]/owner">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const actor = await requireActor(locale);
  const t = await getTranslations("Console");
  const visible = [];
  for (const s of consoleSections) if (await canSomewhere(actor, s.permission)) visible.push(s);

  return (
    <div className="flex flex-1 flex-col">
      <SignedInHeader actor={actor} />
      <div className="flex flex-1 flex-col md:flex-row">
        <nav
          aria-label={t("title")}
          className="flex gap-1 overflow-x-auto border-b border-border bg-card p-2 md:w-52 md:flex-col md:border-e md:border-b-0 print:hidden"
        >
          {visible.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="rounded-md px-3 py-2 text-sm whitespace-nowrap hover:bg-accent hover:text-accent-foreground"
            >
              {t(`nav.${s.key}`)}
            </Link>
          ))}
        </nav>
        <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 md:p-6">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
