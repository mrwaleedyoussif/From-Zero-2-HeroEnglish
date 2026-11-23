import "server-only";
import { ActionError, check } from "@/lib/action-result";
import type { Scope } from "@/lib/auth/engine";
import { generatePin, isStudentEmail, studentEmail } from "@/lib/auth/student-identity";
import { publicEnv } from "@/lib/env.public";
import { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";

type Db = Awaited<ReturnType<typeof createClient>>;

/**
 * Account creation. The admin client is used ONLY for Supabase Auth users; every app row
 * (profile, enrolment, role) is written with the caller's own client so RLS re-checks it.
 * If the app rows fail, the auth user is deleted again.
 */
async function withAuthUser<T>(
  create: () => Promise<{ id: string }>,
  rest: (id: string) => Promise<T>,
): Promise<T> {
  const { id } = await create();
  try {
    return await rest(id);
  } catch (e) {
    await createAdminClient().auth.admin.deleteUser(id);
    throw e;
  }
}

function authError(error: { code?: string; status?: number } | null): never {
  throw new ActionError(
    error?.code === "email_exists" || error?.status === 422 ? "duplicate" : "failed",
  );
}

export async function grantRole(
  db: Db,
  userId: string,
  roleId: string,
  scope: Scope,
  isStaff: boolean,
) {
  if (scope.type === "class" && isStaff && scope.id) {
    // Teaching a class = class-scoped role + teaching assignment, in one transaction.
    check(await db.rpc("assign_class", { p_user: userId, p_class: scope.id, p_role: roleId }));
    return;
  }
  check(
    await db
      .from("user_roles")
      .insert({ user_id: userId, role_id: roleId, scope_type: scope.type, scope_id: scope.id }),
  );
}

export async function roleIdByKey(db: Db, key: string): Promise<string> {
  const { data } = await db
    .from("roles")
    .select("id")
    .eq("key", key)
    .eq("status", "active")
    .maybeSingle();
  if (!data) throw new ActionError("unknownRole");
  return data.id;
}

export interface NewStudent {
  schoolId: string;
  schoolCode: string;
  classId?: string;
  fullName: string;
  username: string;
  consent: boolean;
  studentRoleId: string;
}

export async function provisionStudent(
  db: Db,
  s: NewStudent,
): Promise<{ id: string; pin: string }> {
  const pin = generatePin();
  const admin = createAdminClient();
  const id = await withAuthUser(
    async () => {
      const { data, error } = await admin.auth.admin.createUser({
        email: studentEmail(s.schoolCode, s.username),
        password: pin,
        email_confirm: true,
        user_metadata: { full_name: s.fullName },
      });
      if (error || !data.user) authError(error);
      return { id: data.user.id };
    },
    async (uid) => {
      check(
        await db.from("profiles").insert({
          id: uid,
          school_id: s.schoolId,
          kind: "student",
          username: s.username,
          full_name: s.fullName,
          locale: "ar",
          consent: s.consent,
          consent_at: s.consent ? new Date().toISOString() : null,
        }),
      );
      if (s.classId) {
        const { data: cls } = await db
          .from("classes")
          .select("year_id")
          .eq("id", s.classId)
          .single();
        if (!cls) throw new ActionError("unknownClass");
        check(
          await db.from("enrolments").insert({
            student_id: uid,
            class_id: s.classId,
            year_id: cls.year_id,
            school_id: s.schoolId,
          }),
        );
      }
      await grantRole(db, uid, s.studentRoleId, { type: "self", id: null }, false);
      return uid;
    },
  );
  return { id, pin };
}

export interface NewStaff {
  email: string;
  fullName: string;
  schoolId: string | null;
  locale: "en" | "ar";
  /** true = send Supabase's invite email now; false = create silently (they use the sign-in page). */
  sendInvite: boolean;
}

/**
 * `grant` (the person's first role) runs inside the rollback: if RLS refuses the role, no
 * half-made account is left behind to block a second try.
 */
export async function provisionStaff(
  db: Db,
  s: NewStaff,
  grant?: (id: string) => Promise<void>,
): Promise<string> {
  const admin = createAdminClient();
  return withAuthUser(
    async () => {
      const { data, error } = s.sendInvite
        ? await admin.auth.admin.inviteUserByEmail(s.email, {
            redirectTo: `${publicEnv().NEXT_PUBLIC_APP_URL}/auth/callback?locale=${s.locale}`,
            data: { full_name: s.fullName },
          })
        : await admin.auth.admin.createUser({
            email: s.email,
            email_confirm: true,
            user_metadata: { full_name: s.fullName },
          });
      if (error || !data.user) authError(error);
      return { id: data.user.id };
    },
    async (uid) => {
      check(
        await db.from("profiles").insert({
          id: uid,
          school_id: s.schoolId,
          kind: "staff",
          full_name: s.fullName,
          email: s.email,
          locale: s.locale,
        }),
      );
      await grant?.(uid);
      return uid;
    },
  );
}

/**
 * New PIN, for student sign-in identities only. The check is on the auth account itself (not
 * the editable profile row), so a PIN can never become the password of a staff email.
 */
export async function setPin(userId: string): Promise<string> {
  const pin = generatePin();
  const admin = createAdminClient();
  const { data: existing } = await admin.auth.admin.getUserById(userId);
  if (!isStudentEmail(existing.user?.email ?? "")) throw new ActionError("studentsOnly");
  const { error } = await admin.auth.admin.updateUserById(userId, { password: pin });
  if (error) throw new ActionError("failed");
  return pin;
}
