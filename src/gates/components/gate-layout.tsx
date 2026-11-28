import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { SignedInHeader } from "@/features/auth/components/signed-in-header";
import { trialIsOver } from "@/features/learners/trial";
import { Heartbeat } from "@/features/presence/components/heartbeat";
import { NotificationBell } from "@/features/learning/notifications/bell";
import { enterableGates, requireGate } from "../access";
import type { GateConfig } from "../types";
import { FreePeriodBanner } from "./free-period-banner";
import { GateNav } from "./gate-nav";
import { GateSwitcher } from "./gate-switcher";
import { SchoolThemeStyle } from "./school-theme-style";
import "./gate-shell.css";

/** Shared layout for every gate: header, gate switcher, nav from config, theme. */
export async function GateLayout({
  gate,
  params,
  children,
}: {
  gate: GateConfig;
  params: Promise<{ locale: string }>;
  children: ReactNode;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const actor = await requireGate(locale, gate);
  if (await trialIsOver(actor)) redirect({ href: "/learner/pending?trial=over", locale });
  const others = await enterableGates(actor);
  const schoolId = actor.effective.school_id;

  return (
    <div
      data-theme={gate.theme === "student" ? "student" : undefined}
      data-school-theme={gate.theme === "staff" && schoolId ? schoolId : undefined}
      className="flex flex-1 flex-col bg-background"
    >
      {gate.theme === "staff" && schoolId && <SchoolThemeStyle schoolId={schoolId} />}
      <SignedInHeader
        actor={actor}
        extra={
          <>
            <NotificationBell actor={actor} />
            <GateSwitcher current={gate.key} gates={others} />
          </>
        }
      />
      <FreePeriodBanner actor={actor} />
      <div className="flex flex-1 flex-col md:flex-row">
        <GateNav gate={gate} actor={actor} />
        <main className="gate-main flex min-w-0 flex-1 flex-col gap-6 p-4 pb-24 md:p-6 md:pb-24">
          {children}
        </main>
      </div>
      {!actor.viewAs && <Heartbeat />}
      <Toaster />
    </div>
  );
}
