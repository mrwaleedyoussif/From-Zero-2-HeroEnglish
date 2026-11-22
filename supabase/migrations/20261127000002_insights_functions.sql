-- Phase 7: scoped dashboard functions. Each returns only rows the caller may see.

create or replace function public.class_stats(p_school uuid default null)
returns table (class_id uuid, class_code text, school_id uuid, grade_id uuid, grade_code text,
  grade_name_en text, grade_name_ar text, students int, active_7d int, lessons_7d int,
  accuracy_7d numeric, xp_7d bigint, overdue int, avg_theta numeric, avg_growth numeric, at_risk int)
language sql stable security definer set search_path = '' as $$
  select m.class_id, c.code, m.school_id, m.grade_id, g.code, g.name_en, g.name_ar,
    count(*)::int,
    count(*) filter (where m.last_active_at >= now() - interval '7 days')::int,
    sum(m.lessons_7d)::int,
    round(avg(m.accuracy_7d), 1),
    sum(m.xp_7d)::bigint,
    sum(m.overdue)::int,
    round(avg(m.theta_now), 2),
    round(avg(m.theta_now - m.theta_first), 2),
    count(*) filter (where m.last_active_at is null or m.last_active_at < now() - interval '7 days'
      or m.overdue > 0 or m.accuracy_7d < m.accuracy_prev - 15)::int
  from public.mv_student_activity m
  join public.classes c on c.id = m.class_id
  join public.grades g on g.id = m.grade_id
  where (p_school is null or m.school_id = p_school) and public.auth_sees_class(m.class_id)
  group by m.class_id, c.code, m.school_id, m.grade_id, g.code, g.name_en, g.name_ar, g.sort_order
  order by g.sort_order, c.code
$$;

-- Individual learners: only staff with students:view on the class (not supervisors of the teacher).
create or replace function public.student_stats(p_class uuid)
returns table (student_id uuid, full_name text, last_active_at timestamptz, lessons_7d int,
  active_days_7d int, accuracy_7d numeric, accuracy_prev numeric, xp_7d bigint, overdue int,
  theta_now numeric, theta_first numeric, cefr_now text)
language sql stable security definer set search_path = '' as $$
  select m.student_id, p.full_name, m.last_active_at, m.lessons_7d, m.active_days_7d, m.accuracy_7d,
    m.accuracy_prev, m.xp_7d, m.overdue, m.theta_now, m.theta_first, m.cefr_now
  from public.mv_student_activity m
  join public.profiles p on p.id = m.student_id
  where m.class_id = p_class and public.auth_can('students:view', m.school_id, m.class_id)
  order by p.full_name
$$;

-- Placement distribution: students per latest CEFR, per visible class.
create or replace function public.class_cefr(p_school uuid default null)
returns table (class_id uuid, cefr text, n int)
language sql stable security definer set search_path = '' as $$
  select m.class_id, coalesce(m.cefr_now, 'none'), count(*)::int
  from public.mv_student_activity m
  where (p_school is null or m.school_id = p_school) and public.auth_sees_class(m.class_id)
  group by m.class_id, coalesce(m.cefr_now, 'none')
$$;

-- Skill heat-map: latest θ per student and skill, for staff with students:view on the class.
create or replace function public.class_skill_matrix(p_class uuid)
returns table (student_id uuid, full_name text, skill_id uuid, skill_code text, theta numeric, cefr text)
language sql stable security definer set search_path = '' as $$
  select distinct on (a.student_id, a.skill_id) a.student_id, p.full_name, a.skill_id, k.code, a.theta, a.cefr
  from public.enrolments e
  join public.classes c on c.id = e.class_id
  join public.ability_estimates a on a.student_id = e.student_id and a.skill_id is not null
  join public.skills k on k.id = a.skill_id
  join public.profiles p on p.id = e.student_id
  where e.class_id = p_class and e.status = 'active'
    and public.auth_can('students:view', c.school_id, c.id)
  order by a.student_id, a.skill_id, a.measured_at desc
$$;

-- Teachers' platform usage: teachers the caller supervises directly, or all teachers of the school
-- for those who manage supervision there (principal by default).
create or replace function public.teacher_usage(p_school uuid)
returns table (teacher_id uuid, full_name text, classes int, assignments_30d int,
  last_assignment_at timestamptz, kudos_30d int, last_sign_in_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select t.teacher_id, p.full_name, count(distinct t.class_id)::int,
    (select count(*) from public.assignments a where a.created_by = t.teacher_id
      and a.created_at >= now() - interval '30 days')::int,
    (select max(a.created_at) from public.assignments a where a.created_by = t.teacher_id),
    (select count(*) from public.xp_events x where x.event_type = 'kudos'
      and x.meta->>'from' = t.teacher_id::text and x.created_at >= now() - interval '30 days')::int,
    (select u.last_sign_in_at from auth.users u where u.id = t.teacher_id)
  from public.teaching_assignments t
  join public.profiles p on p.id = t.teacher_id
  where t.school_id = p_school and (
    public.auth_can('supervision:manage', p_school)
    or exists (select 1 from public.supervision_links l where l.supervisor_id = auth.uid()
      and l.supervisee_id = t.teacher_id and l.active_from <= current_date
      and (l.active_to is null or l.active_to >= current_date)))
  group by t.teacher_id, p.full_name
  order by p.full_name
$$;

do $$
declare f text;
begin
  foreach f in array array['class_stats(uuid)', 'student_stats(uuid)', 'class_cefr(uuid)',
    'class_skill_matrix(uuid)', 'teacher_usage(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
