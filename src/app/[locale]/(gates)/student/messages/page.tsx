import { setRequestLocale } from "next-intl/server";
import { MessagesView } from "@/features/messages/components/messages-view";
import { requirePermission } from "@/lib/auth/guard";

/** In-app messages for the student portal. */
export default async function StudentMessagesPage({
  params,
  searchParams,
}: PageProps<"/[locale]/student/messages">) {
  const { locale } = await params;
  const { class: classId } = await searchParams;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "gate:student", "page.student.messages");
  return (
    <MessagesView
      actor={actor}
      base="/student/messages"
      classId={typeof classId === "string" ? classId : undefined}
    />
  );
}
