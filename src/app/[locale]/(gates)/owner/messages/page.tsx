import { setRequestLocale } from "next-intl/server";
import { MessagesView } from "@/features/messages/components/messages-view";
import { requirePermission } from "@/lib/auth/guard";

/** In-app messages for the owner portal. */
export default async function OwnerMessagesPage({
  params,
  searchParams,
}: PageProps<"/[locale]/owner/messages">) {
  const { locale } = await params;
  const { class: classId } = await searchParams;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "gate:owner", "page.owner.messages");
  return (
    <MessagesView
      actor={actor}
      base="/owner/messages"
      classId={typeof classId === "string" ? classId : undefined}
    />
  );
}
