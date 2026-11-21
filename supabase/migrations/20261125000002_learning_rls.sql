-- Phase 5: RLS, audit, assignment function and wizard reference data.

do $$
declare t text;
begin
  foreach t in array array['profile_options', 'learner_profiles', 'learner_notes', 'groups', 'group_members',
    'teams', 'team_members', 'assignments', 'assignment_targets', 'assignment_progress', 'lesson_progress',
    'recommendations', 'notifications'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
  foreach t in array array['profile_options', 'learner_profiles', 'learner_notes', 'groups', 'teams',
    'assignments', 'assignment_progress', 'lesson_progress', 'recommendations'] loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
  foreach t in array array['profile_options', 'assignments', 'groups', 'teams'] loop
    execute format('create trigger audit after insert or update or delete on public.%I
      for each row execute function public.audit_row()', t);
  end loop;
  -- Learner-owned rows: the learner, or staff with students:view over them. Server writes only.
  foreach t in array array['assignment_progress', 'lesson_progress', 'recommendations'] loop
    execute format($f$create policy %1$s_select on public.%1$I for select to authenticated
      using (student_id = auth.uid() or public.auth_can_user('students:view', student_id))$f$, t);
  end loop;
end $$;

create policy profile_options_select on public.profile_options for select to authenticated using (true);
create policy profile_options_write on public.profile_options for all to authenticated
  using (public.auth_can('content:import', null)) with check (public.auth_can('content:import', null));

-- The learner fills in their own profile; staff with students:view read it.
create policy learner_profiles_select on public.learner_profiles for select to authenticated
  using (student_id = auth.uid() or public.auth_can_user('students:view', student_id));
create policy learner_profiles_insert on public.learner_profiles for insert to authenticated
  with check (student_id = auth.uid() and public.auth_can_user('learning:self', student_id)
    and school_id = public.my_school_id());
create policy learner_profiles_update on public.learner_profiles for update to authenticated
  using (student_id = auth.uid() and public.auth_can_user('learning:self', student_id))
  with check (student_id = auth.uid() and school_id = public.my_school_id());

create policy learner_notes_select on public.learner_notes for select to authenticated
  using (public.auth_can_user('students:view', student_id));
create policy learner_notes_insert on public.learner_notes for insert to authenticated
  with check (author_id = auth.uid() and public.auth_can_user('students:edit', student_id));
create policy learner_notes_delete on public.learner_notes for delete to authenticated
  using (author_id = auth.uid());

-- Membership checks bypass RLS so groups' and members' policies don't recurse into each other.
create or replace function public.auth_in_group(p_group uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.group_members m where m.group_id = p_group and m.student_id = auth.uid())
$$;
create or replace function public.auth_in_team(p_team uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.team_members m where m.team_id = p_team and m.student_id = auth.uid())
$$;
revoke all on function public.auth_in_group(uuid) from public, anon;
revoke all on function public.auth_in_team(uuid) from public, anon;
grant execute on function public.auth_in_group(uuid) to authenticated;
grant execute on function public.auth_in_team(uuid) to authenticated;

-- Groups and teams: class staff manage (students:edit), members and class staff read.
create policy groups_select on public.groups for select to authenticated
  using (public.auth_can('classes:view', school_id, class_id)
    or public.auth_in_group(id));
create policy groups_write on public.groups for all to authenticated
  using (public.auth_can('students:edit', school_id, class_id))
  with check (public.auth_can('students:edit', school_id, class_id));
create policy teams_select on public.teams for select to authenticated
  using (public.auth_can('classes:view', school_id, class_id)
    or public.auth_in_team(id));
create policy teams_write on public.teams for all to authenticated
  using (public.auth_can('students:edit', school_id, class_id))
  with check (public.auth_can('students:edit', school_id, class_id));

-- Members must be active students of the group's class.
create policy group_members_select on public.group_members for select to authenticated
  using (student_id = auth.uid() or exists (select 1 from public.groups g where g.id = group_id
    and public.auth_can('classes:view', g.school_id, g.class_id)));
create policy group_members_write on public.group_members for all to authenticated
  using (exists (select 1 from public.groups g where g.id = group_id
    and public.auth_can('students:edit', g.school_id, g.class_id)))
  with check (exists (select 1 from public.groups g join public.enrolments e on e.class_id = g.class_id
    where g.id = group_id and e.student_id = group_members.student_id and e.status = 'active'
    and public.auth_can('students:edit', g.school_id, g.class_id)));
create policy team_members_select on public.team_members for select to authenticated
  using (student_id = auth.uid() or exists (select 1 from public.teams g where g.id = team_id
    and public.auth_can('classes:view', g.school_id, g.class_id)));
create policy team_members_write on public.team_members for all to authenticated
  using (exists (select 1 from public.teams g where g.id = team_id
    and public.auth_can('students:edit', g.school_id, g.class_id)))
  with check (exists (select 1 from public.teams g join public.enrolments e on e.class_id = g.class_id
    where g.id = team_id and e.student_id = team_members.student_id and e.status = 'active'
    and public.auth_can('students:edit', g.school_id, g.class_id)));

-- Kagan teams hold 3–5 (4 is the target; odd class sizes need 3s or 5s).
create or replace function public.team_size_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.team_members where team_id = new.team_id) > 5 then
    raise exception 'team is full' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger team_size_guard after insert on public.team_members
  for each row execute function public.team_size_guard();

-- Assignments: class staff read and delete; students read their own. Created via assign_lesson().
create policy assignments_select on public.assignments for select to authenticated
  using (public.auth_can('students:view', school_id, class_id)
    or exists (select 1 from public.assignment_progress p where p.assignment_id = assignments.id and p.student_id = auth.uid()));
create policy assignments_delete on public.assignments for delete to authenticated
  using (public.auth_can('lessons:assign', school_id, class_id));
create policy assignment_targets_select on public.assignment_targets for select to authenticated
  using (exists (select 1 from public.assignments a where a.id = assignment_id
    and public.auth_can('students:view', a.school_id, a.class_id)));

-- Notifications: own rows only; the user may only mark them read.
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;
