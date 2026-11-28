import "server-only";
import { classStats } from "@/features/insights/queries";
import { unreadMessages } from "@/features/messages/queries";
import type { Actor } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/** A small number beside a menu item: something there is waiting. Rose = urgent, amber = waiting. */
export interface NavBadge {
  n: number;
  tone: "rose" | "amber";
}
type Badges = Record<string, NavBadge>;
type Counter = (actor: Actor) => Promise<Badges>;

const head = { count: "exact", head: true } as const;

/** Each counter reads with the person's own rights, so it never counts what they cannot see. */
const COUNTERS: Record<string, Counter> = {
  owner: async () => {
    const db = await createClient();
    const [learners, media, jobs] = await Promise.all([
      db.from("learner_requests").select("user_id", head).eq("status", "pending"),
      db
        .from("items")
        .select("id", head)
        .eq("status", "active")
        .not("media_file", "is", null)
        .is("media_asset_id", null),
      db.from("report_jobs").select("id", head).eq("status", "failed"),
    ]);
    return {
      "nav.owner.learners": { n: learners.count ?? 0, tone: "rose" },
      "nav.owner.content": { n: media.count ?? 0, tone: "amber" },
      "nav.owner.reports": { n: jobs.count ?? 0, tone: "rose" },
    };
  },
  teacher: async (actor) => {
    const classes = await classStats(actor.effective.school_id);
    const sum = (k: "at_risk" | "overdue") => classes.reduce((n, c) => n + (c[k] ?? 0), 0);
    return {
      "nav.teacher.insights": { n: sum("at_risk"), tone: "amber" },
      "nav.teacher.assignments": { n: sum("overdue"), tone: "rose" },
    };
  },
  leadership: async (actor) => {
    const classes = await classStats(actor.effective.school_id);
    return {
      "nav.leadership.insights": {
        n: classes.reduce((n, c) => n + (c.at_risk ?? 0), 0),
        tone: "amber",
      },
    };
  },
  student: async (actor) => {
    const db = await createClient();
    const { count } = await db
      .from("assignment_progress")
      .select("status", head)
      .eq("student_id", actor.effective.id)
      .neq("status", "done");
    return { "nav.student.lessons": { n: count ?? 0, tone: "amber" } };
  },
};

/** Counters for a gate's menu; only those above zero. The menu must never fail because of them. */
export async function navBadges(actor: Actor, gateKey: string): Promise<Badges> {
  try {
    const [counted, unread] = await Promise.all([
      COUNTERS[gateKey]?.(actor) ?? {},
      unreadMessages(actor),
    ]);
    const all: Badges = { ...counted, [`nav.${gateKey}.messages`]: { n: unread, tone: "rose" } };
    return Object.fromEntries(Object.entries(all).filter(([, b]) => b.n > 0));
  } catch {
    return {};
  }
}
