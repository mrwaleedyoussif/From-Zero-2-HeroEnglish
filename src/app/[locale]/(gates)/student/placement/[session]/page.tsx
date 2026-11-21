import { getTranslations, setRequestLocale } from "next-intl/server";
import { z } from "zod";
import { SpeakingPrompt } from "@/features/placement/components/speaking-prompt";
import { TestItem } from "@/features/placement/components/test-item";
import { WritingPrompt } from "@/features/placement/components/writing-prompt";
import { testView } from "@/features/placement/queries";
import { redirect } from "@/i18n/navigation";
import { requirePermission } from "@/lib/auth/guard";

/** The test screen. Reloading resumes exactly where the student was (SPEC §7). */
export default async function TestPage({
  params,
}: PageProps<"/[locale]/student/placement/[session]">) {
  const { locale, session } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "placement:take", "page.student.placement");
  if (!z.guid().safeParse(session).success || actor.viewAs)
    redirect({ href: "/student/placement", locale });
  const t = await getTranslations("Placement");
  const view = await testView(actor, session).catch(() => null);
  if (!view) return redirect({ href: "/student/placement", locale });

  if (view.status === "in_progress" && view.item) {
    return (
      <TestItem
        key={view.item.id}
        sessionId={view.id}
        item={view.item}
        answered={view.answered}
        maxItems={view.maxItems}
        deadline={view.deadline}
      />
    );
  }
  if (view.status === "productive" && view.prompts.length) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <p className="rounded-md bg-muted p-3">{t("almostDone")}</p>
        {view.prompts.map((p) =>
          p.kind === "writing" ? (
            <WritingPrompt key={p.item.id} sessionId={view.id} item={p.item} />
          ) : (
            <SpeakingPrompt key={p.item.id} sessionId={view.id} item={p.item} />
          ),
        )}
      </div>
    );
  }
  return redirect({ href: `/student/placement/${view.id}/result`, locale });
}
