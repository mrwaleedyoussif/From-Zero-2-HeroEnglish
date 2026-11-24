"use client";

import {
  BarChart3,
  BookOpen,
  Building2,
  ClipboardCheck,
  ClipboardList,
  Compass,
  CreditCard,
  Eye,
  FileText,
  GitBranch,
  Home,
  KeyRound,
  Library,
  type LucideIcon,
  NotebookPen,
  Plug,
  ScrollText,
  Sparkles,
  Trophy,
  Upload,
  UserRound,
  Users,
  UsersRound,
} from "lucide-react";
import { Fragment } from "react";
import { Link, usePathname } from "@/i18n/navigation";

/** An icon for each kind of page, by the last part of its registry key. */
const ICONS: Record<string, LucideIcon> = {
  home: Home,
  schools: Building2,
  users: Users,
  import: Upload,
  learners: UserRound,
  roles: KeyRound,
  supervision: GitBranch,
  visibility: Eye,
  plans: CreditCard,
  content: BookOpen,
  rewards: Trophy,
  reports: FileText,
  insights: BarChart3,
  integrations: Plug,
  audit: ScrollText,
  lessons: BookOpen,
  placement: Compass,
  profile: UserRound,
  library: Library,
  assignments: ClipboardList,
  groups: UsersRound,
  coachingLog: NotebookPen,
};

/** Every icon gets a colour of its own, the same on every visit (by its position in the list). */
const HUES = ["violet", "blue", "green", "amber", "rose", "teal", "pink", "orange"] as const;
const hueOf = (icon: string) => {
  const at = Object.keys(ICONS).indexOf(icon);
  return HUES[(at < 0 ? icon.length : at) % HUES.length];
};

export interface NavLink {
  href: string;
  label: string;
  icon: string;
  group?: string;
}

/** The gate's links with icons and section headings; the current section is marked. */
export function GateNavLinks({ items }: { items: readonly NavLink[] }) {
  const pathname = usePathname();
  const current = items
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return items.map((item, i) => {
    const Icon = ICONS[item.icon] ?? (item.icon === "placementCta" ? ClipboardCheck : Sparkles);
    return (
      <Fragment key={item.href}>
        {item.group && item.group !== items[i - 1]?.group && (
          <p className="hidden px-3 pt-4 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase md:block">
            {item.group}
          </p>
        )}
        <Link
          href={item.href}
          aria-current={item.href === current ? "page" : undefined}
          className="group flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2 text-sm whitespace-nowrap text-foreground transition-colors hover:bg-accent aria-[current=page]:bg-primary aria-[current=page]:font-semibold aria-[current=page]:text-primary-foreground"
        >
          <span
            aria-hidden
            data-hue={hueOf(item.icon)}
            className="icon-tile size-7 rounded-lg group-aria-[current=page]:bg-white"
          >
            <Icon className="size-4" />
          </span>
          {item.label}
        </Link>
      </Fragment>
    );
  });
}
