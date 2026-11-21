-- Phase 2: visibility rules + feature flags lookups (SPEC §4).
-- Precedence is applied in TypeScript (src/lib/visibility/engine.ts); SQL only returns the
-- rules that apply to a user, so nobody can read rules aimed at other people.

-- Every subject a user belongs to: themself, their classes, those classes' grades,
-- their school, their roles, and their school's plan.
create or replace function public.user_subjects(p_user uuid)
returns table (subject_type text, subject_id uuid)
language sql stable security definer set search_path = '' as $$
  select 'user', p_user
  union
  select 'class', c.class_id from public.user_contexts(p_user) c where c.class_id is not null
  union
  select 'grade', c.grade_id from public.user_contexts(p_user) c where c.grade_id is not null
  union
  select 'school', p.school_id from public.profiles p where p.id = p_user and p.school_id is not null
  union
  select 'role', ur.role_id from public.user_roles ur where ur.user_id = p_user
  union
  select 'plan', public.school_plan(p.school_id) from public.profiles p where p.id = p_user and p.school_id is not null
$$;

-- Rules that apply to a user. Callable for yourself, or for anyone with visibility:manage
-- (Visibility Studio "check a user").
create or replace function public.visibility_rules_for(p_user uuid)
returns setof public.visibility_rules
language sql stable security definer set search_path = '' as $$
  select r.* from public.visibility_rules r
  join public.user_subjects(p_user) s
    on s.subject_type = r.subject_type and s.subject_id = r.subject_id
  where p_user = auth.uid() or public.auth_can('visibility:manage', null)
$$;

-- Feature flags that are ON for a user: enabled, and rolled out to all or to one of their subjects.
-- subjects = [{"type": "school", "id": "<uuid>"}, ...]
create or replace function public.feature_flags_for(p_user uuid)
returns setof text
language sql stable security definer set search_path = '' as $$
  select f.key from public.feature_flags f
  where (p_user = auth.uid() or public.auth_can('visibility:manage', null))
    and f.enabled
    and (
      f.rollout = 'all'
      or exists (
        select 1
        from jsonb_array_elements(f.subjects) e
        join public.user_subjects(p_user) s
          on s.subject_type = e ->> 'type' and s.subject_id::text = e ->> 'id'
      )
    )
$$;

create index visibility_rules_subject_idx on public.visibility_rules (subject_type, subject_id);
alter table public.visibility_rules
  add constraint visibility_rules_subject_present check (subject_id is not null),
  add constraint visibility_rules_window check (ends_at is null or starts_at is null or ends_at > starts_at);

revoke all on function public.user_subjects(uuid) from public, anon, authenticated;
revoke all on function public.visibility_rules_for(uuid) from public, anon;
revoke all on function public.feature_flags_for(uuid) from public, anon;
grant execute on function public.visibility_rules_for(uuid) to authenticated;
grant execute on function public.feature_flags_for(uuid) to authenticated;
