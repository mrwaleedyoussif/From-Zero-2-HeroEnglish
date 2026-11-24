import {
  ArrowRight,
  CircleCheck,
  CloudOff,
  FileWarning,
  Music,
  UserRoundCheck,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { googleConnection } from "@/lib/storage/secret";
import { createClient } from "@/lib/supabase/server";
import type { WidgetProps } from ".";

const count = (r: { count: number | null }) => r.count ?? 0;

/**
 * Owner home, first thing: what is waiting for the Owner, each line a link to where it is
 * dealt with. Reads with the Owner's own rights (row security applies).
 */
export async function OwnerTodoWidget(_: WidgetProps) {
  const t = await getTranslations("Todo");
  const tr = await getTranslations("Registry");
  const db = await createClient();
  const head = { count: "exact", head: true } as const;
  const [learners, media, jobs, drive] = await Promise.all([
    db.from("learner_requests").select("user_id", head).eq("status", "pending"),
    db
      .from("items")
      .select("id", head)
      .eq("status", "active")
      .not("media_file", "is", null)
      .is("media_asset_id", null),
    db.from("report_jobs").select("id", head).eq("status", "failed"),
    googleConnection().catch(() => null),
  ]);
  const todo: { key: string; hue: string; icon: ReactNode; text: string; href: string }[] = [];
  if (count(learners))
    todo.push({
      key: "learners",
      hue: "violet",
      icon: <UserRoundCheck aria-hidden />,
      text: t("learners", { n: count(learners) }),
      href: "/owner/learners",
    });
  if (drive && !drive.connected)
    todo.push({
      key: "drive",
      hue: "blue",
      icon: <CloudOff aria-hidden />,
      text: t("drive"),
      href: "/owner/integrations",
    });
  if (count(media))
    todo.push({
      key: "media",
      hue: "pink",
      icon: <Music aria-hidden />,
      text: t("media", { n: count(media) }),
      href: "/owner/content",
    });
  if (count(jobs))
    todo.push({
      key: "jobs",
      hue: "rose",
      icon: <FileWarning aria-hidden />,
      text: t("jobs", { n: count(jobs) }),
      href: "/owner/reports",
    });

  return (
    <section
      data-widget="widget.owner.todo"
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 md:col-span-2 xl:col-span-3"
    >
      <h2 className="text-base font-semibold">{tr("widget.owner.todo")}</h2>
      {todo.length === 0 ? (
        <p className="flex items-center gap-2 text-success">
          <CircleCheck aria-hidden className="size-5" />
          {t("clear")}
        </p>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {todo.map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                data-todo={item.key}
                className="flex min-h-12 items-center gap-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm font-medium hover:bg-warning/20"
              >
                <span data-hue={item.hue} className="icon-tile size-8 rounded-lg [&_svg]:size-5">
                  {item.icon}
                </span>
                <span className="flex-1">{item.text}</span>
                <span className="sr-only">{t("open")}</span>
                <ArrowRight aria-hidden className="size-4 rtl:rotate-180" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
