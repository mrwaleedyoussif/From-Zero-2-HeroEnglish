import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { myClasses } from "@/features/learning/teacher/queries";
import { can, canSomewhere } from "@/lib/auth/can";
import { schoolTarget } from "@/lib/auth/scope";
import type { Actor } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { inbox, schoolTeachers, sent } from "../queries";
import { ComposeToStudents, ComposeToTeachers } from "./compose";
import { MessageList } from "./message-list";

/**
 * The messages page of every portal. What it shows follows the person's permissions: an inbox
 * for everyone, writing to students or to teachers for those allowed, and every message for
 * whoever may monitor them (the Owner).
 */
export async function MessagesView({
  actor,
  base,
  classId,
}: {
  actor: Actor;
  base: string;
  classId?: string;
}) {
  const t = await getTranslations("Messages");
  const school = actor.effective.school_id;
  const [toStudents, toStaff, monitor] = await Promise.all([
    canSomewhere(actor, "messages:send"),
    school ? can(actor, "messages:send_staff", schoolTarget(school)) : false,
    canSomewhere(actor, "messages:monitor"),
  ]);
  const [mine, out, classes, teachers] = await Promise.all([
    inbox(actor),
    toStudents || toStaff || monitor ? sent(actor, monitor) : [],
    toStudents && school ? myClasses(actor, "messages:send") : [],
    toStaff ? schoolTeachers(actor) : [],
  ]);
  // Opening the page reads the messages (never while viewing as someone else).
  if (!actor.viewAs && mine.some((m) => m.unread)) {
    const db = await createClient();
    await db
      .from("message_recipients")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", actor.effective.id)
      .is("read_at", null);
  }
  const writes = toStudents || toStaff;
  return (
    <>
      <PageHeader
        title={t("title")}
        description={monitor ? t("introMonitor") : writes ? t("introStaff") : t("introStudent")}
      />
      {toStudents && school && (
        <ComposeToStudents base={base} classes={classes} classId={classId} />
      )}
      {toStaff && <ComposeToTeachers teachers={teachers} />}
      {(!monitor || mine.length > 0) && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">{t("inbox")}</h2>
          <MessageList rows={mine} kind="inbox" empty={t("inboxEmpty")} />
        </section>
      )}
      {(writes || monitor) && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">{monitor ? t("all") : t("sent")}</h2>
          <MessageList rows={out} kind="sent" empty={t("sentEmpty")} />
        </section>
      )}
    </>
  );
}
