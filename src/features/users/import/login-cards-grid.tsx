"use client";

import { useTranslations } from "next-intl";

export interface LoginCard {
  fullName: string;
  schoolCode: string;
  username: string;
  pin: string;
  classCode?: string;
}

/**
 * Printable login cards (browser print → paper or "Save as PDF"). The browser renders Arabic
 * names and RTL correctly, which PDF libraries often do not. 2 columns, cut along the dashes.
 */
export function LoginCardsGrid({ cards }: { cards: LoginCard[] }) {
  const t = useTranslations("Cards");
  return (
    <div
      data-theme="student"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 print:grid-cols-2 print:gap-0"
    >
      {cards.map((c) => (
        <section
          key={`${c.schoolCode}/${c.username}`}
          className="flex break-inside-avoid flex-col gap-2 rounded-lg border-2 border-dashed border-border bg-card p-4 print:rounded-none"
        >
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-lg font-bold">{c.fullName}</h3>
            {c.classCode && <span className="text-sm text-muted-foreground">{c.classCode}</span>}
          </div>
          <p className="text-sm text-muted-foreground">{t("goTo")}</p>
          <dl dir="ltr" className="grid grid-cols-[auto_1fr] gap-x-3 font-mono text-base">
            <dt className="text-muted-foreground">{t("school")}</dt>
            <dd className="font-bold">{c.schoolCode}</dd>
            <dt className="text-muted-foreground">{t("username")}</dt>
            <dd className="font-bold">{c.username}</dd>
            <dt className="text-muted-foreground">{t("pin")}</dt>
            <dd className="font-bold tracking-widest">{c.pin}</dd>
          </dl>
        </section>
      ))}
    </div>
  );
}
