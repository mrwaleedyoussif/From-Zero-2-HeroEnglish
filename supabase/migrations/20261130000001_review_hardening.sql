-- Review hardening: gaps that row-level security alone left open. Reference data only, no seed.

-- ── 1. A profile's identity can't be edited through the API ──────────────
-- profiles_update lets anyone with users:edit change any column. Turning a colleague into a
-- "student" would let a PIN reset take over a staff sign-in; moving a profile to another school
-- would move its data access. The app only ever edits `status`; identity comes from server code
-- (service role) when an account is created.
create or replace function public.profiles_freeze_identity() returns trigger
language plpgsql set search_path = '' as $$
begin
  if coalesce(auth.role(), '') = 'authenticated' and (
       new.id is distinct from old.id
    or new.kind is distinct from old.kind
    or new.school_id is distinct from old.school_id
    or new.email is distinct from old.email
    or new.username is distinct from old.username
  ) then
    raise exception 'profile identity (kind, school, email, username) cannot be changed'
      using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.profiles_freeze_identity() from public, anon, authenticated;
create trigger profiles_freeze_identity before update on public.profiles
  for each row execute function public.profiles_freeze_identity();

-- ── 2. Rows that carry a school and a class must agree ───────────────────
-- Policies check the caller's rights in the row's own school_id; nothing checked that the class
-- (or the people) belong to that school, so a foreign id could be attached to one's own school.
-- Security definer: the checks must see the real class/profile, which the caller's own row
-- security hides when it belongs to another school.
create or replace function public.check_class_school() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.classes c where c.id = new.class_id and c.school_id = new.school_id
  ) then
    raise exception 'class does not belong to this school' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.check_class_school() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['enrolments', 'teaching_assignments', 'placement_windows',
    'class_reward_settings'] loop
    execute format('create trigger same_school_class before insert or update of class_id, school_id
      on public.%I for each row execute function public.check_class_school()', t);
  end loop;
end $$;

-- People: a student is enrolled in their own school; a teacher teaches in their own school
-- (platform staff have no school and may be placed anywhere by someone allowed to).
create or replace function public.check_person_school() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  rec jsonb := to_jsonb(new);
  person uuid := coalesce(rec ->> 'student_id', rec ->> 'teacher_id')::uuid;
  home uuid;
begin
  select p.school_id into home from public.profiles p where p.id = person;
  if home is distinct from new.school_id and not (tg_table_name <> 'enrolments' and home is null)
  then
    raise exception 'person does not belong to this school' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.check_person_school() from public, anon, authenticated;
create trigger same_school_person before insert or update of student_id, school_id
  on public.enrolments for each row execute function public.check_person_school();
create trigger same_school_person before insert or update of teacher_id, school_id
  on public.teaching_assignments for each row execute function public.check_person_school();

-- Supervision: the supervisee works in the link's school; the supervisor too, unless they are
-- platform staff (a coach or the Owner covering several schools).
create or replace function public.check_supervision_school() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  above uuid;
  below uuid;
begin
  select p.school_id into above from public.profiles p where p.id = new.supervisor_id;
  select p.school_id into below from public.profiles p where p.id = new.supervisee_id;
  if below is distinct from new.school_id or (above is not null and above <> new.school_id) then
    raise exception 'supervision links stay inside one school' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.check_supervision_school() from public, anon, authenticated;
create trigger same_school_people
  before insert or update of supervisor_id, supervisee_id, school_id
  on public.supervision_links for each row execute function public.check_supervision_school();

-- ── 3. Content imports: audit by counts, not by copying the sheets ───────
-- The row trigger stored the whole import (thousands of questions with answer keys) in
-- audit_log on every check and again on apply — megabytes each time against a 500 MB budget.
-- The app now writes one "content.import" entry with counts (log_audit).
drop trigger if exists audit on public.import_jobs;
update public.audit_log
   set before = before - 'payload', after = after - 'payload'
 where target_table = 'import_jobs' and (before ? 'payload' or after ? 'payload');

-- ── 4. Feature switches that switch ──────────────────────────────────────
-- A feature without a flag row is on for everyone (the default). A row turns it off, or limits
-- it to a list. This returns the features that are OFF for a user.
create or replace function public.feature_flags_off_for(p_user uuid)
returns setof text
language sql stable security definer set search_path = '' as $$
  select f.key from public.feature_flags f
  where (p_user = auth.uid() or public.auth_can('visibility:manage', null))
    and f.key not in (select public.feature_flags_for(p_user))
$$;
revoke all on function public.feature_flags_off_for(uuid) from public, anon;
grant execute on function public.feature_flags_off_for(uuid) to authenticated;
