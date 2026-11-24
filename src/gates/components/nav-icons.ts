import {
  BarChart3,
  BookOpen,
  Building2,
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
  Trophy,
  Upload,
  UserRound,
  Users,
  UsersRound,
} from "lucide-react";

/** An icon for each kind of page, by the last part of its registry key. */
export const ICONS: Record<string, LucideIcon> = {
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
export const hueOf = (icon: string) => {
  const at = Object.keys(ICONS).indexOf(icon);
  return HUES[(at < 0 ? icon.length : at) % HUES.length];
};
