-- Phase 7: school-wide aggregates for comparisons (no individual rows) and staff last-seen times.

-- Whole-school averages so a coach can compare "their" classes with the school (SPEC §11: growth
-- vs. school average) without seeing other classes. Staff of that school with supervision:view.
create or replace function public.school_averages(p_school uuid)
returns table (students int, active_7d int, lessons_7d int, accuracy_7d numeric, avg_growth numeric)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.auth_can('supervision:view', p_school) then return; end if;
  return query select count(*)::int,
    (count(*) filter (where m.last_active_at >= now() - interval '7 days'))::int,
    coalesce(sum(m.lessons_7d), 0)::int,
    round(avg(m.accuracy_7d), 1),
    round(avg(m.theta_now - m.theta_first), 2)
  from public.mv_student_activity m where m.school_id = p_school;
end $$;

-- Last sign-in of the school's staff for the supervision tree (who supervises whom, last activity).
create or replace function public.staff_last_seen(p_school uuid)
returns table (user_id uuid, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.auth_can('supervision:view', p_school) then return; end if;
  return query select p.id, u.last_sign_in_at
  from public.profiles p join auth.users u on u.id = p.id
  where p.school_id = p_school and p.kind = 'staff';
end $$;

do $$
declare f text;
begin
  foreach f in array array['school_averages(uuid)', 'staff_last_seen(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
