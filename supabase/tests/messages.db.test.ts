import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, connect, count, type Db, demo, demoId, expectRejects, inTx } from "./harness";

let db: Db;
beforeAll(async () => {
  db = await connect();
});
afterAll(async () => {
  await db.end();
});

const send = "select public.send_message($1, $2::jsonb, $3)";
const cls = (id: string) => JSON.stringify([{ type: "class", id }]);

describe("in-app messages and presence", () => {
  it("a teacher writes to their own class only; students cannot write at all", () =>
    inTx(db, async () => {
      await as(db, demo.teacher);
      await db.query(send, ["students", cls(demo.class4A), "Hello 4A"]);
      expect(await count(db, "select 1 from messages")).toBe(1);
      // Another teacher's class: nobody is reached, so nothing is sent.
      await expectRejects(db, send, ["students", cls(demo.class4B), "Hello 4B"], /nobody/);
      await expectRejects(
        db,
        send,
        ["staff", JSON.stringify([{ type: "teachers" }]), "Hi all"],
        /forbidden/,
      );

      await as(db, demo.student1);
      expect(await count(db, "select 1 from messages")).toBe(1);
      expect(await count(db, "select 1 from message_recipients")).toBe(1);
      expect(await count(db, "select 1 from notifications where kind = 'message'")).toBe(1);
      await expectRejects(db, send, ["students", cls(demo.class4A), "From a student"], /nobody/);
      await expectRejects(
        db,
        send,
        ["students", JSON.stringify([{ type: "student", id: demoId("student:2") }]), "psst"],
        /nobody/,
      );
      await expectRejects(
        db,
        "insert into messages (school_id, sender_id, audience, body) values ($1, $2, 'students', 'x')",
        [demo.school, demo.student1],
        /row-level security/,
      );
      // A student of another class got nothing and sees nothing.
      await as(db, demo.student11);
      expect(await count(db, "select 1 from messages")).toBe(0);
    }));

  it("leaders write to teachers; the Owner can read every message", () =>
    inTx(db, async () => {
      await as(db, demo.principal);
      await db.query(send, ["staff", JSON.stringify([{ type: "teachers" }]), "Meeting at 2"]);
      await as(db, demo.teacher);
      expect(await count(db, "select 1 from messages where body = 'Meeting at 2'")).toBe(1);
      await as(db, demo.coach);
      expect(await count(db, "select 1 from messages")).toBe(0);
      await as(db, demo.owner);
      expect(await count(db, "select 1 from messages")).toBe(1);
    }));

  it("who is online is shown to the staff who may see the person, never to students", () =>
    inTx(db, async () => {
      await as(db, demo.student1);
      await db.query("select public.touch_presence()");
      await as(db, demo.student11);
      await db.query("select public.touch_presence()");
      expect(await count(db, "select 1 from public.presence_list(5)")).toBe(0);
      expect(await count(db, "select 1 from presence")).toBe(0);
      await as(db, demo.teacher); // teaches 4A only
      expect(await count(db, "select 1 from public.presence_list(5)")).toBe(1);
      await as(db, demo.principal);
      expect(await count(db, "select 1 from public.presence_list(5)")).toBe(2);
      await as(db, demo.coach);
      expect(await count(db, "select 1 from public.presence_list(5)")).toBe(0);
    }));
});
