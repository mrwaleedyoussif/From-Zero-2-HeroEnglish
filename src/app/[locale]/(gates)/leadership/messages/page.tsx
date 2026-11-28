import { setRequestLocale } from "next-intl/server";
import { MessagesView } from "@/features/messages/components/messages-view";
import { requirePermission } from "@/lib/auth/guard";

/** In-app messages for the leadership portal. */
export default async function LeadershipMessagesPage({
  params,
  searchParams,
}: PageProps<"/[locale]/leadership/messages">) {
  const { locale } = await params;
  const { class: classId } = await searchParams;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "gate:leadership", "page.leadership.messages");
  return (
    <MessagesView
      actor={actor}
      base="/leadership/messages"
      classId={typeof classId === "string" ? classId : undefined}
    />
  );
}
