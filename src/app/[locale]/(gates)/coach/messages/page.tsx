import { setRequestLocale } from "next-intl/server";
import { MessagesView } from "@/features/messages/components/messages-view";
import { requirePermission } from "@/lib/auth/guard";

/** In-app messages for the coach portal. */
export default async function CoachMessagesPage({
  params,
  searchParams,
}: PageProps<"/[locale]/coach/messages">) {
  const { locale } = await params;
  const { class: classId } = await searchParams;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "gate:coach", "page.coach.messages");
  return (
    <MessagesView
      actor={actor}
      base="/coach/messages"
      classId={typeof classId === "string" ? classId : undefined}
    />
  );
}
