import { setRequestLocale } from "next-intl/server";
import { OnlineView } from "@/features/presence/components/online-view";
import { requirePermission } from "@/lib/auth/guard";

/** Who is online now, for the leadership portal. */
export default async function LeadershipOnlinePage({
  params,
}: PageProps<"/[locale]/leadership/online">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, "presence:view", "page.leadership.online");
  return <OnlineView />;
}
