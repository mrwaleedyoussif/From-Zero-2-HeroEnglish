-- Phase 6: leaderboards and redemptions as functions (they read other learners' totals or move
-- coins, so they check access themselves and return only what the caller may see).

-- Weekly XP per active student of a class. Students of the class see it only while the class
-- leaderboard is on; class staff (rewards:view) always see it.
create or replace function public.class_leaderboard(p_class uuid, p_since timestamptz)
returns table (student_id uuid, full_name text, points bigint)
language plpgsql stable security definer set search_path = '' as $$
declare v_school uuid;
begin
  select c.school_id into v_school from public.classes c where c.id = p_class;
  if not (public.auth_can('rewards:view', v_school, p_class)
    or (public.auth_in_class(p_class) and coalesce((select s.leaderboard_enabled
      from public.class_reward_settings s where s.class_id = p_class), true))) then
    return;
  end if;
  return query
    select e.student_id, p.full_name, coalesce(sum(x.xp), 0)::bigint
    from public.enrolments e
    join public.profiles p on p.id = e.student_id
    left join public.xp_events x on x.student_id = e.student_id and x.created_at >= p_since
    where e.class_id = p_class and e.status = 'active'
    group by e.student_id, p.full_name;
end $$;

-- Kagan team inputs: each member's practice accuracy before vs since the week start, and the
-- team's challenge points this week. Same access rule as the class leaderboard.
create or replace function public.team_scores(p_class uuid, p_since timestamptz)
returns table (team_id uuid, team_name text, student_id uuid, baseline numeric, current numeric, challenge bigint)
language plpgsql stable security definer set search_path = '' as $$
declare v_school uuid;
begin
  select c.school_id into v_school from public.classes c where c.id = p_class;
  if not (public.auth_can('rewards:view', v_school, p_class)
    or (public.auth_in_class(p_class) and coalesce((select s.leaderboard_enabled
      from public.class_reward_settings s where s.class_id = p_class), true))) then
    return;
  end if;
  return query
    select t.id, t.name, m.student_id,
      (select avg((x.meta->>'accuracy')::numeric) from public.xp_events x
        where x.student_id = m.student_id and x.event_type = 'practice_accuracy'
        and x.created_at < p_since and x.created_at >= p_since - interval '28 days'),
      (select avg((x.meta->>'accuracy')::numeric) from public.xp_events x
        where x.student_id = m.student_id and x.event_type = 'practice_accuracy' and x.created_at >= p_since),
      (select coalesce(sum(tx.points), 0)::bigint from public.team_xp tx
        where tx.team_id = t.id and tx.created_at >= p_since)
    from public.teams t join public.team_members m on m.team_id = t.id
    where t.class_id = p_class;
end $$;

-- A learner spends coins on a catalogue item. Real rewards wait for a teacher's approval.
create or replace function public.redeem_item(p_item uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_school uuid := public.my_school_id();
  v_item public.reward_catalog;
  v_balance bigint;
  v_id uuid;
begin
  if v_me is null or not public.auth_can_user('rewards:view', v_me) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_item from public.reward_catalog c
    where c.id = p_item and c.status = 'active' and (c.school_id is null or c.school_id = v_school);
  if v_item.id is null then raise exception 'not available' using errcode = '23503'; end if;
  perform pg_advisory_xact_lock(hashtext('coins:' || v_me::text));
  select coalesce(sum(delta), 0) into v_balance from public.coin_ledger where student_id = v_me;
  if v_balance < v_item.cost then raise exception 'not enough coins' using errcode = 'P0001'; end if;
  insert into public.redemptions (student_id, school_id, item_id, cost, status, decided_at)
  values (v_me, v_school, v_item.id, v_item.cost,
    case when v_item.needs_approval then 'requested' else 'approved' end,
    case when v_item.needs_approval then null else now() end)
  returning id into v_id;
  insert into public.coin_ledger (student_id, school_id, delta, reason, ref_id)
  values (v_me, v_school, -v_item.cost, 'redeemed', v_id);
  return v_id;
end $$;

-- A teacher approves or rejects a request; a rejection refunds the coins.
create or replace function public.decide_redemption(p_id uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare v_r public.redemptions;
begin
  select * into v_r from public.redemptions r where r.id = p_id for update;
  if v_r.id is null or not public.auth_can_user('rewards:approve_redemptions', v_r.student_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_r.status <> 'requested' then raise exception 'already decided' using errcode = '23505'; end if;
  update public.redemptions set status = case when p_approve then 'approved' else 'rejected' end,
    decided_by = auth.uid(), decided_at = now() where id = p_id;
  if not p_approve then
    insert into public.coin_ledger (student_id, school_id, delta, reason, ref_id)
    values (v_r.student_id, v_r.school_id, v_r.cost, 'refund', v_r.id);
  end if;
  insert into public.notifications (user_id, school_id, kind, params, href)
  values (v_r.student_id, v_r.school_id, 'redemption',
    jsonb_build_object('approved', p_approve, 'item_id', v_r.item_id), '/student/rewards');
end $$;

do $$
declare f text;
begin
  foreach f in array array['class_leaderboard(uuid, timestamptz)', 'team_scores(uuid, timestamptz)',
    'redeem_item(uuid)', 'decide_redemption(uuid, boolean)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
