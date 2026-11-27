import { setRequestLocale } from "next-intl/server";
import { MessagesView } from "@/features/messages/components/messages-view";
import { requirePermission } from "@/lib/auth/guard";

/** In-app messages for the teacher portal. */
export default async function TeacherMessagesPage({
  params,
  searchParams,
}: PageProps<"/[locale]/teacher/messages">) {
  const { locale } = await params;
  const { class: classId } = await searchParams;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "gate:teacher", "page.teacher.messages");
  return (
    <MessagesView
      actor={actor}
      base="/teacher/messages"
      classId={typeof classId === "string" ? classId : undefined}
    />
  );
}
