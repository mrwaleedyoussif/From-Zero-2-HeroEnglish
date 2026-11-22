-- Phase 8: the scheduler generates each recipient's report with *their* scope, so the Phase 7
-- dashboard functions get user-parameterised versions (service role only). The signed-in versions
-- now call them with auth.uid(), so the scope rules exist once.

create or replace function public.sees_class(p_user uuid, p_class uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.classes c where c.id = p_class
    and (public.can_user_on(p_user, 'students:view', c.school_id, c.grade_id, c.id, null)
      or exists (select 1 from public.supervision_links l
        join public.teaching_assignments t on t.teacher_id = l.supervisee_id
        where l.supervisor_id = p_user and t.class_id = c.id
          and l.active_from <= current_date and (l.active_to is null or l.active_to >= current_date))))
$$;
create or replace function public.auth_sees_class(p_class uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.sees_class(auth.uid(), p_class)
$$;

create or replace function public.class_stats_for(p_user uuid, p_school uuid)
returns table (class_id uuid, class_code text, school_id uuid, grade_id uuid, grade_code text,
  grade_name_en text, grade_name_ar text, students int, active_7d int, lessons_7d int,
  accuracy_7d numeric, xp_7d bigint, overdue int, avg_theta numeric, avg_growth numeric, at_risk int)
language sql stable security definer set search_path = '' as $$
  select m.class_id, c.code, m.school_id, m.grade_id, g.code, g.name_en, g.name_ar,
    count(*)::int,
    count(*) filter (where m.last_active_at >= now() - interval '7 days')::int,
    sum(m.lessons_7d)::int, round(avg(m.accuracy_7d), 1), sum(m.xp_7d)::bigint, sum(m.overdue)::int,
    round(avg(m.theta_now), 2), round(avg(m.theta_now - m.theta_first), 2),
    count(*) filter (where m.last_active_at is null or m.last_active_at < now() - interval '7 days'
      or m.overdue > 0 or m.accuracy_7d < m.accuracy_prev - 15)::int
  from public.mv_student_activity m
  join public.classes c on c.id = m.class_id
  join public.grades g on g.id = m.grade_id
  where (p_school is null or m.school_id = p_school) and public.sees_class(p_user, m.class_id)
  group by m.class_id, c.code, m.school_id, m.grade_id, g.code, g.name_en, g.name_ar, g.sort_order
  order by g.sort_order, c.code
$$;
create or replace function public.class_stats(p_school uuid default null)
returns table (class_id uuid, class_code text, school_id uuid, grade_id uuid, grade_code text,
  grade_name_en text, grade_name_ar text, students int, active_7d int, lessons_7d int,
  accuracy_7d numeric, xp_7d bigint, overdue int, avg_theta numeric, avg_growth numeric, at_risk int)
language sql stable security definer set search_path = '' as $$
  select * from public.class_stats_for(auth.uid(), p_school)
$$;

create or replace function public.student_stats_for(p_user uuid, p_class uuid)
returns table (student_id uuid, full_name text, last_active_at timestamptz, lessons_7d int,
  active_days_7d int, accuracy_7d numeric, accuracy_prev numeric, xp_7d bigint, overdue int,
  theta_now numeric, theta_first numeric, cefr_now text)
language sql stable security definer set search_path = '' as $$
  select m.student_id, p.full_name, m.last_active_at, m.lessons_7d, m.active_days_7d, m.accuracy_7d,
    m.accuracy_prev, m.xp_7d, m.overdue, m.theta_now, m.theta_first, m.cefr_now
  from public.mv_student_activity m
  join public.profiles p on p.id = m.student_id
  where m.class_id = p_class
    and public.can_user_on(p_user, 'students:view', m.school_id, m.grade_id, m.class_id, null)
  order by p.full_name
$$;
create or replace function public.student_stats(p_class uuid)
returns table (student_id uuid, full_name text, last_active_at timestamptz, lessons_7d int,
  active_days_7d int, accuracy_7d numeric, accuracy_prev numeric, xp_7d bigint, overdue int,
  theta_now numeric, theta_first numeric, cefr_now text)
language sql stable security definer set search_path = '' as $$
  select * from public.student_stats_for(auth.uid(), p_class)
$$;

-- Report recipients: active staff of the school holding reports:receive:<period> anywhere in it.
create or replace function public.report_recipients(p_school uuid, p_period text)
returns table (user_id uuid, full_name text, email text, locale text, priority smallint)
language sql stable security definer set search_path = '' as $$
  select p.id, p.full_name, p.email, p.locale,
    -- Email priority from permissions, never role names: whoever manages supervision first,
    -- then school-wide viewers, then coaches, then everyone else (SPEC §12).
    (case
      when public.can_user_on(p.id, 'supervision:manage', p_school, null, null, null) then 1
      when public.can_user_on(p.id, 'students:view', p_school, null, null, null) then 2
      when public.can_user_on(p.id, 'coaching:log', p_school, null, null, null) then 3
      else 4 end)::smallint
  from public.profiles p
  left join public.report_preferences rp on rp.user_id = p.id
  where p.school_id = p_school and p.status = 'active' and p.kind = 'staff'
    and coalesce(case when p_period = 'weekly' then rp.weekly else rp.monthly end, true)
    and exists (select 1 from public.user_contexts(p.id) t
      where public.can_user_on(p.id, 'reports:receive:' || p_period, t.school_id, t.grade_id, t.class_id, p.id))
$$;

do $$
declare f text;
begin
  foreach f in array array['sees_class(uuid, uuid)', 'class_stats_for(uuid, uuid)',
    'student_stats_for(uuid, uuid)', 'report_recipients(uuid, text)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;
