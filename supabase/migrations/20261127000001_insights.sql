-- Phase 7: dashboard aggregates (SPEC §11). One materialized view of per-student activity keeps
-- dashboards fast on the free tier; it is never exposed directly (no RLS on views) — only through
-- the functions below, which check the caller's scope row by row.

create materialized view public.mv_student_activity as
with xp as (
  select x.student_id,
    max(x.created_at) as last_active_at,
    count(*) filter (where x.event_type = 'lesson_completed' and x.created_at >= now() - interval '7 days') as lessons_7d,
    count(distinct (x.created_at at time zone 'UTC')::date) filter (where x.created_at >= now() - interval '7 days') as active_days_7d,
    avg((x.meta->>'accuracy')::numeric) filter (where x.event_type = 'practice_accuracy'
      and x.created_at >= now() - interval '7 days') as accuracy_7d,
    avg((x.meta->>'accuracy')::numeric) filter (where x.event_type = 'practice_accuracy'
      and x.created_at < now() - interval '7 days' and x.created_at >= now() - interval '35 days') as accuracy_prev,
    coalesce(sum(x.xp) filter (where x.created_at >= now() - interval '7 days'), 0) as xp_7d
  from public.xp_events x group by x.student_id
), ab as (
  select a.student_id,
    (array_agg(a.theta order by a.measured_at desc))[1] as theta_now,
    (array_agg(a.theta order by a.measured_at))[1] as theta_first,
    (array_agg(a.cefr order by a.measured_at desc))[1] as cefr_now
  from public.ability_estimates a where a.skill_id is null group by a.student_id
), od as (
  select p.student_id, count(*) as overdue
  from public.assignment_progress p join public.assignments a on a.id = p.assignment_id
  where p.status <> 'done' and a.due_at < now() group by p.student_id
)
select e.student_id, e.class_id, c.school_id, c.grade_id,
  xp.last_active_at,
  coalesce(xp.lessons_7d, 0)::int as lessons_7d,
  coalesce(xp.active_days_7d, 0)::int as active_days_7d,
  round(xp.accuracy_7d, 1) as accuracy_7d,
  round(xp.accuracy_prev, 1) as accuracy_prev,
  coalesce(xp.xp_7d, 0)::bigint as xp_7d,
  coalesce(od.overdue, 0)::int as overdue,
  ab.theta_now, ab.theta_first, ab.cefr_now,
  now() as refreshed_at
from public.enrolments e
join public.classes c on c.id = e.class_id
join public.academic_years y on y.id = c.year_id and y.is_current
left join xp on xp.student_id = e.student_id
left join ab on ab.student_id = e.student_id
left join od on od.student_id = e.student_id
where e.status = 'active';

create unique index mv_student_activity_pk on public.mv_student_activity (student_id, class_id);
create index mv_student_activity_class_idx on public.mv_student_activity (school_id, class_id);
revoke all on public.mv_student_activity from public, anon, authenticated;

-- Refreshed by the server (service role) when older than a few minutes, and by the daily tick.
create or replace function public.refresh_insights() returns timestamptz
language plpgsql security definer set search_path = '' as $$
begin
  refresh materialized view concurrently public.mv_student_activity;
  return now();
end $$;
create or replace function public.insights_refreshed_at() returns timestamptz
language sql stable security definer set search_path = '' as $$
  select max(refreshed_at) from public.mv_student_activity
$$;
revoke all on function public.refresh_insights() from public, anon, authenticated;
grant execute on function public.refresh_insights() to service_role;
grant execute on function public.insights_refreshed_at() to authenticated;

-- Does the caller supervise (directly, today) someone who teaches this class?
create or replace function public.auth_supervises_class(p_class uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.supervision_links l
    join public.teaching_assignments t on t.teacher_id = l.supervisee_id
    where l.supervisor_id = auth.uid() and t.class_id = p_class
      and l.active_from <= current_date and (l.active_to is null or l.active_to >= current_date))
$$;

-- Class-level figures: staff with students:view on the class, or supervisors of its teacher
-- (e.g. a coach sees their teachers' classes in aggregate, never individual students).
create or replace function public.auth_sees_class(p_class uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.classes c where c.id = p_class
    and (public.auth_can('students:view', c.school_id, c.id) or public.auth_supervises_class(c.id)))
$$;

do $$
declare f text;
begin
  foreach f in array array['auth_supervises_class(uuid)', 'auth_sees_class(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
