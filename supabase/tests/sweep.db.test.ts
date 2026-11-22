import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, asAdmin, connect, count, createSchoolB, type Db, demo, inTx } from "./harness";

let db: Db;
beforeAll(async () => {
  db = await connect();
});
afterAll(async () => {
  await db.end();
});

describe("security sweep (Phase 9)", () => {
  it("every table in the public schema has row level security on", async () => {
    await asAdmin(db);
    const { rows } = await db.query<{ tablename: string }>(
      "select tablename from pg_tables where schemaname = 'public' and not rowsecurity order by 1",
    );
    expect(rows.map((r) => r.tablename)).toEqual([]);
  });

  it("staff and students of another school see none of this school's rows, in any table", () =>
    inTx(db, async () => {
      const b = await createSchoolB(db);
      await asAdmin(db);
      const { rows: tables } = await db.query<{ table_name: string }>(
        `select c.table_name from information_schema.columns c
         join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
         where c.table_schema = 'public' and c.column_name = 'school_id' and t.table_type = 'BASE TABLE'
         order by 1`,
      );
      expect(tables.length).toBeGreaterThan(30);
      // Make sure this school has rows in the learner tables too.
      await db.query(
        "insert into xp_events (student_id, school_id, event_type, xp, source_key) values ($1, $2, 'kudos', 5, 'sweep')",
        [demo.student1, demo.school],
      );
      for (const who of [b.teacher, b.student]) {
        await as(db, who);
        const leaks: string[] = [];
        for (const { table_name } of tables)
          if (
            (await count(db, `select 1 from public.${table_name} where school_id = $1`, [
              demo.school,
            ])) > 0
          )
            leaks.push(table_name);
        expect(leaks).toEqual([]);
      }
    }));

  it("erasing a student removes their rows everywhere (no blocking references)", () =>
    inTx(db, async () => {
      await asAdmin(db);
      await db.query(
        "insert into coin_ledger (student_id, school_id, delta, reason) values ($1, $2, 5, 'earned')",
        [demo.student1, demo.school],
      );
      await db.query("delete from auth.users where id = $1", [demo.student1]);
      for (const t of ["profiles", "enrolments", "coin_ledger", "notifications"])
        expect(
          await count(
            db,
            `select 1 from public.${t} where ${t === "profiles" ? "id" : t === "notifications" ? "user_id" : "student_id"} = $1`,
            [demo.student1],
          ),
        ).toBe(0);
    }));

  it("migrations carry reference data only — no demo schools or people (seed-free production)", () => {
    const dir = join(__dirname, "../migrations");
    for (const f of readdirSync(dir)) {
      const sql = readFileSync(join(dir, f), "utf8").toLowerCase();
      expect(sql, f).not.toMatch(/insert into public\.(schools|profiles|classes|enrolments)\b/);
      expect(sql, f).not.toContain("demo.linguapath");
    }
  });
});
