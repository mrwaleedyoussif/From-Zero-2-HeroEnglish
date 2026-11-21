-- Permission resolution (SPEC §3). Mirrors src/lib/auth/can.ts exactly:
--   deny override > allow override > role permission > nothing; the scope must contain the target.
-- A target is (school, grade, class, user); null school = platform-level.

-- Does an assignment scope contain the target?
create or replace function public.scope_contains(
  p_scope_type text, p_scope_id uuid, p_holder uuid,
  p_school uuid, p_grade uuid, p_class uuid, p_user uuid
) returns boolean
language sql stable set search_path = '' as $$
  select case p_scope_type
    when 'platform' then true
    when 'school' then p_school is not null and p_scope_id = p_school
    when 'grade' then p_grade is not null and p_scope_id = p_grade
    when 'class' then p_class is not null and p_scope_id = p_class
    when 'self' then p_user is not null and p_user = p_holder
    else false
  end
$$;

-- Core evaluator for any actor. Not exposed to API roles (would leak other users' permissions).
create or replace function public.can_user_on(
  p_actor uuid, p_perm text, p_school uuid, p_grade uuid, p_class uuid, p_user uuid
) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when p_actor is null then false
    when not exists (select 1 from public.profiles p where p.id = p_actor and p.status = 'active') then false
    when exists (
      select 1 from public.user_permission_overrides o
      where o.user_id = p_actor and o.permission_key = p_perm and o.effect = 'deny'
        and (o.expires_at is null or o.expires_at > now())
        and public.scope_contains(o.scope_type, o.scope_id, o.user_id, p_school, p_grade, p_class, p_user)
    ) then false
    when exists (
      select 1 from public.user_permission_overrides o
      where o.user_id = p_actor and o.permission_key = p_perm and o.effect = 'allow'
        and (o.expires_at is null or o.expires_at > now())
        and public.scope_contains(o.scope_type, o.scope_id, o.user_id, p_school, p_grade, p_class, p_user)
    ) then true
    else exists (
      select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id and r.status = 'active'
      join public.role_permissions rp on rp.role_id = r.id and rp.permission_key = p_perm
      where ur.user_id = p_actor
        and public.scope_contains(ur.scope_type, ur.scope_id, ur.user_id, p_school, p_grade, p_class, p_user)
    )
  end
$$;

-- Contexts a user target lives in: their school, plus each class they study or teach in.
create or replace function public.user_contexts(p_user uuid)
returns table (school_id uuid, grade_id uuid, class_id uuid)
language sql stable security definer set search_path = '' as $$
  select p.school_id, null::uuid, null::uuid from public.profiles p where p.id = p_user
  union all
  select c.school_id, c.grade_id, c.id
  from public.enrolments e join public.classes c on c.id = e.class_id
  where e.student_id = p_user and e.status = 'active'
  union all
  select c.school_id, c.grade_id, c.id
  from public.teaching_assignments t join public.classes c on c.id = t.class_id
  where t.teacher_id = p_user
$$;

-- Target context for an assignment scope (used by grant checks).
create or replace function public.scope_target(p_scope_type text, p_scope_id uuid, p_user uuid)
returns table (school_id uuid, grade_id uuid, class_id uuid, user_id uuid)
language sql stable security definer set search_path = '' as $$
  select null::uuid, null::uuid, null::uuid, null::uuid where p_scope_type = 'platform'
  union all select p_scope_id, null, null, null where p_scope_type = 'school'
  union all select g.school_id, g.id, null, null from public.grades g where p_scope_type = 'grade' and g.id = p_scope_id
  union all select c.school_id, c.grade_id, c.id, null from public.classes c where p_scope_type = 'class' and c.id = p_scope_id
  union all select p.school_id, null, null, p.id from public.profiles p where p_scope_type = 'self' and p.id = p_user
$$;

-- ── Functions for the signed-in user (RLS + app) ───────────────────────────
create or replace function public.auth_can(p_perm text, p_school uuid, p_class uuid default null)
returns boolean
language sql stable security definer set search_path = '' as $$
  select public.can_user_on(
    auth.uid(), p_perm, p_school,
    (select c.grade_id from public.classes c where c.id = p_class),
    p_class, null)
$$;

create or replace function public.auth_can_user(p_perm text, p_target uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_contexts(p_target) t
    where public.can_user_on(auth.uid(), p_perm, t.school_id, t.grade_id, t.class_id, p_target)
  )
$$;

-- Anti-escalation: grant an override only for a permission you hold yourself, on that scope.
create or replace function public.auth_can_grant(p_perm text, p_scope_type text, p_scope_id uuid, p_user uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.scope_target(p_scope_type, p_scope_id, p_user) t
    where public.can_user_on(auth.uid(), 'permissions:grant', t.school_id, t.grade_id, t.class_id, t.user_id)
      and public.can_user_on(auth.uid(), p_perm, t.school_id, t.grade_id, t.class_id, t.user_id)
  )
$$;

-- Anti-escalation: assign a role only if you hold every permission it carries, on that scope.
create or replace function public.auth_can_assign_role(p_role uuid, p_scope_type text, p_scope_id uuid, p_user uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.scope_target(p_scope_type, p_scope_id, p_user) t
    where public.can_user_on(auth.uid(), 'roles:assign', t.school_id, t.grade_id, t.class_id, t.user_id)
      and not exists (
        select 1 from public.role_permissions rp
        where rp.role_id = p_role
          and not public.can_user_on(auth.uid(), rp.permission_key, t.school_id, t.grade_id, t.class_id, t.user_id)
      )
  )
$$;

create or replace function public.my_school_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select school_id from public.profiles where id = auth.uid()
$$;

-- Fill user_roles / overrides school_id from the scope so RLS and indexes can use it.
create or replace function public.fill_scope_school() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.school_id := case new.scope_type
    when 'platform' then null
    when 'school' then new.scope_id
    when 'grade' then (select school_id from public.grades where id = new.scope_id)
    when 'class' then (select school_id from public.classes where id = new.scope_id)
    when 'self' then (select school_id from public.profiles where id = new.user_id)
  end;
  if new.scope_type in ('school', 'grade', 'class') and new.school_id is null then
    raise exception 'Unknown % scope %', new.scope_type, new.scope_id;
  end if;
  return new;
end $$;

create trigger fill_scope_school before insert or update on public.user_roles
  for each row execute function public.fill_scope_school();
create trigger fill_scope_school before insert or update on public.user_permission_overrides
  for each row execute function public.fill_scope_school();

revoke all on function public.can_user_on(uuid, text, uuid, uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.user_contexts(uuid) from public, anon, authenticated;
revoke all on function public.scope_target(text, uuid, uuid) from public, anon, authenticated;
revoke all on function public.fill_scope_school() from public, anon, authenticated;
revoke all on function public.auth_can(text, uuid, uuid) from public, anon;
revoke all on function public.auth_can_user(text, uuid) from public, anon;
revoke all on function public.auth_can_grant(text, text, uuid, uuid) from public, anon;
revoke all on function public.auth_can_assign_role(uuid, text, uuid, uuid) from public, anon;
revoke all on function public.my_school_id() from public, anon;
grant execute on function public.auth_can(text, uuid, uuid) to authenticated;
grant execute on function public.auth_can_user(text, uuid) to authenticated;
grant execute on function public.auth_can_grant(text, text, uuid, uuid) to authenticated;
grant execute on function public.auth_can_assign_role(uuid, text, uuid, uuid) to authenticated;
grant execute on function public.my_school_id() to authenticated;
