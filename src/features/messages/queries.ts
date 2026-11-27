import "server-only";
import type { Actor } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export interface MessageRow {
  id: string;
  body: string;
  created_at: string;
  from: string;
  to: string[];
  recipients: number;
  read: number | null;
  unread?: boolean;
}

/** Messages sent to me, newest first (row security: only my own). */
export async function inbox(actor: Actor): Promise<MessageRow[]> {
  const db = await createClient();
  const { data } = await db
    .from("message_recipients")
    .select(
      "read_at, messages!inner(id, body, created_at, to_names, recipients, profiles!messages_sender_id_fkey(full_name))",
    )
    .eq("user_id", actor.effective.id)
    .order("created_at", { referencedTable: "messages", ascending: false })
    .limit(100);
  return (data ?? [])
    .map((r) => ({
      id: r.messages.id,
      body: r.messages.body,
      created_at: r.messages.created_at,
      from: r.messages.profiles?.full_name ?? "",
      to: r.messages.to_names,
      recipients: r.messages.recipients,
      read: null,
      unread: !r.read_at,
    }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** Messages I sent — or, with `all`, every message row security lets me read (the Owner). */
export async function sent(actor: Actor, all = false): Promise<MessageRow[]> {
  const db = await createClient();
  let q = db
    .from("messages")
    .select(
      "id, body, created_at, to_names, recipients, profiles!messages_sender_id_fkey(full_name), message_recipients(read_at)",
    )
    .order("created_at", { ascending: false })
    .limit(all ? 200 : 60);
  if (!all) q = q.eq("sender_id", actor.effective.id);
  const { data } = await q;
  return (data ?? []).map((m) => ({
    id: m.id,
    body: m.body,
    created_at: m.created_at,
    from: m.profiles?.full_name ?? "",
    to: m.to_names,
    recipients: m.recipients,
    read: m.message_recipients.filter((r) => r.read_at).length,
  }));
}

/** Teachers of my school (staff who teach a class), for leaders who write to them. */
export async function schoolTeachers(actor: Actor) {
  const db = await createClient();
  const { data } = await db
    .from("teaching_assignments")
    .select("teacher_id, profiles!teaching_assignments_teacher_id_fkey(full_name, status)")
    .eq("school_id", actor.effective.school_id ?? "")
    .limit(2000);
  const seen = new Map<string, string>();
  for (const r of data ?? [])
    if (r.profiles?.status === "active" && r.teacher_id !== actor.effective.id)
      seen.set(r.teacher_id, r.profiles.full_name);
  return [...seen].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}

export async function unreadMessages(actor: Actor): Promise<number> {
  const db = await createClient();
  const { count } = await db
    .from("message_recipients")
    .select("message_id", { count: "exact", head: true })
    .eq("user_id", actor.effective.id)
    .is("read_at", null);
  return count ?? 0;
}
