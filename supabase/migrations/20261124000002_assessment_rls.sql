-- Phase 4: RLS, audit and reference data for assessment.

do $$
declare t text;
begin
  foreach t in array array['test_blueprints', 'test_sessions', 'responses', 'ability_estimates',
    'productive_submissions', 'submission_scores', 'placement_retakes', 'placement_windows'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
  foreach t in array array['submission_scores', 'placement_retakes', 'placement_windows', 'test_blueprints'] loop
    execute format('create trigger audit after insert or update or delete on public.%I
      for each row execute function public.audit_row()', t);
  end loop;

  -- Student-owned results: the student, or staff with placement:view_results over that student.
  -- No insert/update/delete policies: only the server runtime (service role) writes.
  foreach t in array array['test_sessions', 'responses', 'ability_estimates', 'productive_submissions'] loop
    execute format($f$create policy %1$s_select on public.%1$I for select to authenticated
      using (student_id = auth.uid() or public.auth_can_user('placement:view_results', student_id))$f$, t);
  end loop;
end $$;

create policy test_blueprints_select on public.test_blueprints for select to authenticated using (true);
create policy test_blueprints_write on public.test_blueprints for all to authenticated
  using (public.auth_can('content:import', null)) with check (public.auth_can('content:import', null));

create policy submission_scores_select on public.submission_scores for select to authenticated
  using (
    exists (select 1 from public.productive_submissions s where s.id = submission_id
      and (s.student_id = auth.uid() or public.auth_can_user('placement:view_results', s.student_id))));
create policy submission_scores_insert on public.submission_scores for insert to authenticated
  with check (
    scorer_id = auth.uid() and exists (select 1 from public.productive_submissions s where s.id = submission_id
      and public.auth_can_user('placement:score', s.student_id)));

create policy placement_retakes_select on public.placement_retakes for select to authenticated
  using (student_id = auth.uid() or public.auth_can_user('placement:view_results', student_id));
create policy placement_retakes_insert on public.placement_retakes for insert to authenticated
  with check (granted_by = auth.uid() and public.auth_can_user('placement:retake', student_id));

create policy placement_windows_select on public.placement_windows for select to authenticated
  using (
    public.auth_can('classes:view', school_id, class_id)
    or exists (select 1 from public.enrolments e where e.class_id = placement_windows.class_id
      and e.student_id = auth.uid() and e.status = 'active'));
create policy placement_windows_write on public.placement_windows for all to authenticated
  using (public.auth_can('placement:retake', school_id, class_id))
  with check (created_by = auth.uid() and public.auth_can('placement:retake', school_id, class_id));

-- Blueprints from each department's placement settings; progress checks are shorter (SPEC §7).
insert into public.test_blueprints (department_id, kind, min_items, max_items, target_se, time_limit_sec)
select d.id, 'placement', d.placement_min_items, d.placement_max_items, d.placement_target_se, 45 * 60
from public.departments d
on conflict (department_id, kind) do nothing;

-- New departments get blueprints automatically (content arrives through the Sheets import).
create or replace function public.ensure_blueprints() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.test_blueprints (department_id, kind, min_items, max_items, target_se, time_limit_sec)
  values (new.id, 'placement', new.placement_min_items, new.placement_max_items, new.placement_target_se, 45 * 60),
         (new.id, 'progress', 10, 15, greatest(new.placement_target_se, 0.45), 20 * 60)
  on conflict (department_id, kind) do update
    set min_items = excluded.min_items, max_items = excluded.max_items, target_se = excluded.target_se
    where public.test_blueprints.kind = 'placement';
  return new;
end $$;
revoke all on function public.ensure_blueprints() from public, anon, authenticated;
create trigger ensure_blueprints after insert or update of placement_min_items, placement_max_items, placement_target_se
  on public.departments for each row execute function public.ensure_blueprints();

-- Default CEFR rubric for writing and speaking (Owner-editable reference data, SPEC §7).
insert into public.rubrics (code, criteria) values
  ('CEFR-PRODUCTIVE', '[
    {"key": "task", "name_en": "Task achievement", "name_ar": "إنجاز المهمة"},
    {"key": "range", "name_en": "Vocabulary range", "name_ar": "تنوع المفردات"},
    {"key": "accuracy", "name_en": "Grammar accuracy", "name_ar": "دقة القواعد"},
    {"key": "fluency", "name_en": "Fluency & organisation", "name_ar": "الطلاقة والتنظيم"}
  ]'::jsonb)
on conflict (code) do nothing;
