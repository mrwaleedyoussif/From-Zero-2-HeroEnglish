import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, asAdmin, connect, count, type Db, demo, demoId, expectRejects, inTx } from "./harness";

let db: Db;
beforeAll(async () => {
  db = await connect();
});
afterAll(async () => {
  await db.end();
});

const student2 = demoId("student:2"); // 4A
const teacher4b = demoId("teacher4b");

async function credit(student: string, coins: number, xp = 0) {
  await asAdmin(db);
  await db.query(
    "insert into coin_ledger (student_id, school_id, delta, reason) values ($1, $2, $3, 'earned')",
    [student, demo.school, coins],
  );
  if (xp)
    await db.query(
      "insert into xp_events (student_id, school_id, event_type, xp, source_key) values ($1, $2, 'kudos', $3, gen_random_uuid()::text)",
      [student, demo.school, xp],
    );
}

async function item(code: string, cost: number, needsApproval: boolean): Promise<string> {
  await asAdmin(db);
  const { rows } = await db.query<{ id: string }>(
    `insert into reward_catalog (school_id, code, name_en, name_ar, kind, cost, needs_approval)
     values ($1, $2, $2, $2, 'real', $3, $4) returning id`,
    [demo.school, code, cost, needsApproval],
  );
  return rows[0]?.id ?? "";
}

const balance = async (student: string) =>
  Number(
    (
      await db.query<{ b: string }>(
        "select coalesce(sum(delta), 0) as b from coin_ledger where student_id = $1",
        [student],
      )
    ).rows[0]?.b,
  );

describe("rewards RLS and functions", () => {
  it("learners read only their own balances and can never write them", () =>
    inTx(db, async () => {
      await credit(demo.student1, 50, 40);
      await credit(student2, 10, 10);
      await as(db, demo.student1);
      expect(await count(db, "select 1 from coin_ledger")).toBe(1);
      expect(await count(db, "select 1 from xp_events")).toBe(1);
      await expectRejects(
        db,
        "insert into coin_ledger (student_id, school_id, delta, reason) values ($1, $2, 999, 'earned')",
        [demo.student1, demo.school],
        /row-level security/,
      );
      expect((await db.query("update reward_rules set xp = 9999")).rowCount).toBe(0);
    }));

  it("redeeming checks the balance; real rewards wait for the class teacher; rejection refunds", () =>
    inTx(db, async () => {
      const prize = await item("PRIZE", 40, true);
      const sticker = await item("STICKER", 5, false);
      await as(db, demo.student1);
      await expectRejects(db, "select public.redeem_item($1)", [prize], /not enough coins/);

      await credit(demo.student1, 50);
      await as(db, demo.student1);
      await db.query("select public.redeem_item($1)", [sticker]);
      const { rows } = await db.query<{ id: string }>("select public.redeem_item($1) as id", [
        prize,
      ]);
      const id = rows[0]?.id;
      expect(await balance(demo.student1)).toBe(5);
      expect(
        (await db.query<{ status: string }>("select status from redemptions where id = $1", [id]))
          .rows[0]?.status,
      ).toBe("requested");

      await as(db, teacher4b);
      await expectRejects(db, "select public.decide_redemption($1, false)", [id], /forbidden/);
      await as(db, demo.teacher);
      await db.query("select public.decide_redemption($1, false)", [id]);
      await expectRejects(db, "select public.decide_redemption($1, true)", [id], /already decided/);

      await as(db, demo.student1);
      expect(await balance(demo.student1)).toBe(45);
      expect(await count(db, "select 1 from notifications where kind = 'redemption'")).toBe(1);
    }));

  it("a class teacher can switch the class leaderboard off; students then see nothing", () =>
    inTx(db, async () => {
      await credit(demo.student1, 1, 30);
      await credit(student2, 1, 20);
      const board = "select * from public.class_leaderboard($1, now() - interval '7 days')";
      await as(db, demo.student1);
      expect(await count(db, `${board} where points > 0`, [demo.class4A])).toBe(2);
      expect(await count(db, board, [demo.class4B])).toBe(0); // not my class

      await as(db, teacher4b);
      await expectRejects(
        db,
        "insert into class_reward_settings (class_id, school_id, leaderboard_enabled, updated_by) values ($1, $2, false, $3)",
        [demo.class4A, demo.school, teacher4b],
        /row-level security/,
      );
      await as(db, demo.teacher);
      await db.query(
        "insert into class_reward_settings (class_id, school_id, leaderboard_enabled, updated_by) values ($1, $2, false, $3)",
        [demo.class4A, demo.school, demo.teacher],
      );
      expect(await count(db, `${board} where points > 0`, [demo.class4A])).toBe(2); // staff still see

      await as(db, demo.student1);
      expect(await count(db, board, [demo.class4A])).toBe(0);
      expect(await count(db, "select * from public.team_scores($1, now())", [demo.class4A])).toBe(
        0,
      );
    }));
});
