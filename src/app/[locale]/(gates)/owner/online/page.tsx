import { setRequestLocale } from "next-intl/server";
import { OnlineView } from "@/features/presence/components/online-view";
import { requirePermission } from "@/lib/auth/guard";

/** Who is online now, for the owner portal. */
export default async function OwnerOnlinePage({ params }: PageProps<"/[locale]/owner/online">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, "presence:view", "page.owner.online");
  return <OnlineView />;
}
