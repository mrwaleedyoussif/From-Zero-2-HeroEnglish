-- Phase 6: RLS, audit and defaults for rewards.

do $$
declare t text;
begin
  foreach t in array array['reward_rules', 'levels', 'badges', 'user_badges', 'xp_events', 'streaks',
    'coin_ledger', 'reward_catalog', 'redemptions', 'certificates', 'class_reward_settings', 'team_xp'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
  foreach t in array array['reward_rules', 'levels', 'badges', 'streaks', 'reward_catalog', 'redemptions',
    'class_reward_settings'] loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
  foreach t in array array['reward_rules', 'levels', 'badges', 'reward_catalog', 'class_reward_settings',
    'redemptions', 'team_xp'] loop
    execute format('create trigger audit after insert or update or delete on public.%I
      for each row execute function public.audit_row()', t);
  end loop;
  -- Reference data: everyone signed in reads; the Owner (platform content:import) edits.
  foreach t in array array['reward_rules', 'levels', 'badges'] loop
    execute format($f$create policy %1$s_select on public.%1$I for select to authenticated using (true)$f$, t);
    execute format($f$create policy %1$s_write on public.%1$I for all to authenticated
      using (public.auth_can('content:import', null)) with check (public.auth_can('content:import', null))$f$, t);
  end loop;
  -- Learner balances: the learner, or staff with rewards:view over them. Server writes only.
  foreach t in array array['user_badges', 'xp_events', 'streaks', 'coin_ledger', 'certificates', 'redemptions'] loop
    execute format($f$create policy %1$s_select on public.%1$I for select to authenticated
      using (student_id = auth.uid() or public.auth_can_user('rewards:view', student_id))$f$, t);
  end loop;
end $$;

create policy reward_catalog_select on public.reward_catalog for select to authenticated
  using (school_id is null or school_id = public.my_school_id() or public.auth_can('rewards:view', school_id));
create policy reward_catalog_write on public.reward_catalog for all to authenticated
  using ((school_id is null and public.auth_can('content:import', null))
    or (school_id is not null and public.auth_can('rewards:approve_redemptions', school_id)))
  with check ((school_id is null and public.auth_can('content:import', null))
    or (school_id is not null and public.auth_can('rewards:approve_redemptions', school_id)));

create or replace function public.auth_in_class(p_class uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.enrolments e
    where e.class_id = p_class and e.student_id = auth.uid() and e.status = 'active')
$$;
revoke all on function public.auth_in_class(uuid) from public, anon;
grant execute on function public.auth_in_class(uuid) to authenticated;

create policy class_reward_settings_select on public.class_reward_settings for select to authenticated
  using (public.auth_can('classes:view', school_id, class_id) or public.auth_in_class(class_id));
create policy class_reward_settings_write on public.class_reward_settings for all to authenticated
  using (public.auth_can('rewards:grant', school_id, class_id))
  with check (updated_by = auth.uid() and public.auth_can('rewards:grant', school_id, class_id));

create policy team_xp_select on public.team_xp for select to authenticated
  using (public.auth_in_team(team_id) or exists (select 1 from public.teams t where t.id = team_id
    and public.auth_can('classes:view', t.school_id, t.class_id)));
create policy team_xp_insert on public.team_xp for insert to authenticated
  with check (awarded_by = auth.uid() and exists (select 1 from public.teams t where t.id = team_id
    and t.school_id = team_xp.school_id and public.auth_can('rewards:grant', t.school_id, t.class_id)));

-- Defaults (Owner-tunable). Inserted only when missing.
insert into public.reward_rules (event_type, xp, coins, min_seconds, min_accuracy, daily_cap, scale) values
  ('lesson_completed', 20, 4, 60, null, 300, 'level'),
  ('practice_accuracy', 10, 2, null, 50, 150, 'accuracy'),
  ('assignment_on_time', 15, 3, null, null, 150, 'none'),
  ('placement_completed', 50, 10, null, null, null, 'none'),
  ('progress_completed', 30, 6, null, null, null, 'none'),
  ('streak_day', 5, 1, null, null, 5, 'none'),
  ('kudos', 10, 2, null, null, 30, 'none'),
  ('team_challenge', 15, 3, null, null, 60, 'none')
on conflict (event_type) do nothing;

insert into public.levels (level, name_en, name_ar, xp_required) values
  (1, 'Explorer', 'مستكشف', 0),
  (2, 'Voyager', 'رحّالة', 200),
  (3, 'Navigator', 'ملّاح', 600),
  (4, 'Captain', 'قبطان', 1500),
  (5, 'Legend', 'أسطورة', 3000)
on conflict (level) do nothing;

insert into public.reward_catalog (school_id, code, name_en, name_ar, emoji, kind, cost, needs_approval) values
  (null, 'frame-star', 'Star avatar frame', 'إطار النجمة', '⭐', 'cosmetic', 30, false),
  (null, 'frame-rocket', 'Rocket avatar frame', 'إطار الصاروخ', '🚀', 'cosmetic', 60, false),
  (null, 'theme-ocean', 'Ocean theme', 'سمة المحيط', '🌊', 'cosmetic', 80, false)
on conflict do nothing;
