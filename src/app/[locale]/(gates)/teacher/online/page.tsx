import { setRequestLocale } from "next-intl/server";
import { OnlineView } from "@/features/presence/components/online-view";
import { requirePermission } from "@/lib/auth/guard";

/** Who is online now, for the teacher portal. */
export default async function TeacherOnlinePage({ params }: PageProps<"/[locale]/teacher/online">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, "presence:view", "page.teacher.online");
  return <OnlineView />;
}
