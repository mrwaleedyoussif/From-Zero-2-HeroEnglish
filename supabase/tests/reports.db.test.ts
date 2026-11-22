import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, asAdmin, connect, count, type Db, demo, demoId, inTx } from "./harness";

let db: Db;
beforeAll(async () => {
  db = await connect();
});
afterAll(async () => {
  await db.end();
});

const teacher4b = demoId("teacher4b");
const recipients = async (period: string) =>
  (
    await db.query<{ user_id: string; priority: number }>(
      "select user_id, priority from public.report_recipients($1, $2) order by priority",
      [demo.school, period],
    )
  ).rows;

describe("reports: recipients, queue and privacy", () => {
  it("recipients come from reports:receive permissions, prioritised without role names", () =>
    inTx(db, async () => {
      await asAdmin(db);
      const weekly = await recipients("weekly");
      expect(weekly).toHaveLength(6);
      const prio = new Map(weekly.map((r) => [r.user_id, r.priority]));
      expect(prio.get(demo.principal)).toBe(1);
      expect(prio.get(demo.vp)).toBe(2);
      expect(prio.get(demo.coach)).toBe(3);
      expect(prio.get(demo.teacher)).toBe(4);
      expect((await recipients("monthly")).map((r) => r.user_id)).toContain(demo.principal);
      expect((await recipients("monthly")).map((r) => r.user_id)).not.toContain(demo.teacher);

      await db.query("insert into report_preferences (user_id, weekly) values ($1, false)", [
        demo.teacher,
      ]);
      expect((await recipients("weekly")).map((r) => r.user_id)).not.toContain(demo.teacher);
    }));

  it("a job is claimed once, even by two ticks at the same time", () =>
    inTx(db, async () => {
      await asAdmin(db);
      await db.query(
        "insert into report_jobs (kind, dedupe_key) values ('refresh_insights', 'refresh:test') on conflict do nothing",
      );
      await db.query(
        "insert into report_jobs (kind, dedupe_key) values ('refresh_insights', 'refresh:test') on conflict do nothing",
      );
      expect(await count(db, "select 1 from report_jobs where dedupe_key = 'refresh:test'")).toBe(
        1,
      );
      expect(
        await count(db, "select * from public.claim_jobs(20) where dedupe_key = 'refresh:test'"),
      ).toBe(1);
      expect(
        await count(db, "select * from public.claim_jobs(20) where dedupe_key = 'refresh:test'"),
      ).toBe(0);
    }));

  it("reports: recipients read their own, school leaders read the school's; queue is Owner-only", () =>
    inTx(db, async () => {
      await asAdmin(db);
      for (const who of [demo.teacher, teacher4b, demo.principal])
        await db.query(
          `insert into reports (school_id, recipient_id, period, period_start, period_end, data)
           values ($1, $2, 'weekly', '2026-11-15', '2026-11-21', '{}')`,
          [demo.school, who],
        );
      await db.query("insert into email_log (provider, recipient_id) values ('console', $1)", [
        demo.teacher,
      ]);
      await as(db, demo.teacher);
      expect(await count(db, "select 1 from reports")).toBe(1);
      expect(await count(db, "select 1 from email_log")).toBe(0);
      expect(await count(db, "select 1 from report_jobs")).toBe(0);
      await as(db, demo.principal);
      expect(await count(db, "select 1 from reports")).toBe(3);
      await as(db, demo.owner);
      expect(await count(db, "select 1 from email_log")).toBe(1);
    }));
});
