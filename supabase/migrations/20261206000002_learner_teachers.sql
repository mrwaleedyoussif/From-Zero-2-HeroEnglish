-- General learners belong to nobody's school: only the Owner sees them, until the Owner gives
-- one or more of them to a teacher. That teacher then has them as a small class of their own
-- (in the general learners' group), so monitoring, messages and recommendations work as for
-- any class. No other teacher or school leader sees them.

-- A teacher of any school may be given a class of general learners (and only there).
create or replace function public.check_person_school() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  rec jsonb := to_jsonb(new);
  person uuid := coalesce(rec ->> 'student_id', rec ->> 'teacher_id')::uuid;
  home uuid;
begin
  select p.school_id into home from public.profiles p where p.id = person;
  if home is distinct from new.school_id and not (tg_table_name <> 'enrolments' and home is null)
     and not (tg_table_name = 'teaching_assignments' and exists (
       select 1 from public.schools s where s.id = new.school_id and s.code = 'GENERAL'))
  then
    raise exception 'person does not belong to this school' using errcode = '42501';
  end if;
  return new;
end $$;

create or replace function public.assign_learner_teacher(p_learner uuid, p_teacher uuid)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_school uuid;
  v_year uuid;
  v_grade uuid;
  v_class uuid;
  v_role uuid;
  v_y integer;
begin
  if not public.auth_can('users:edit', null) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select s.id into v_school from public.schools s where s.code = 'GENERAL';
  if v_school is null or not exists (select 1 from public.profiles p
      where p.id = p_learner and p.school_id = v_school and p.kind = 'student')
     or not exists (select 1 from public.profiles p
      where p.id = p_teacher and p.kind = 'staff' and p.status = 'active') then
    raise exception 'not a general learner and a member of staff' using errcode = '23514';
  end if;
  select y.id into v_year from public.academic_years y where y.school_id = v_school and y.is_current;
  if v_year is null then
    v_y := extract(year from now())::integer
      - case when extract(month from now()) >= 8 then 0 else 1 end;
    insert into public.academic_years (school_id, name, starts_on, ends_on, is_current)
    values (v_school, v_y || '-' || (v_y + 1), make_date(v_y, 9, 1), make_date(v_y + 1, 8, 31), true)
    on conflict (school_id, name) do update set is_current = true
    returning id into v_year;
  end if;
  insert into public.grades (school_id, code, name_en, name_ar, sort_order)
  values (v_school, 'GL', 'General learners', 'المتعلمون العامون', 0)
  on conflict (school_id, code) do update set code = excluded.code
  returning id into v_grade;
  insert into public.classes (school_id, grade_id, year_id, code, name)
  values (v_school, v_grade, v_year, 'GL-' || upper(substr(md5(p_teacher::text), 1, 5)),
    (select full_name from public.profiles where id = p_teacher))
  on conflict (year_id, code) do update set code = excluded.code
  returning id into v_class;
  -- The role a class teacher holds (the one whose scope is a class).
  select r.id into v_role from public.roles r
    where r.default_scope_type = 'class' and r.status = 'active'
    order by r.is_system desc, r.key limit 1;
  insert into public.teaching_assignments (teacher_id, class_id, school_id)
  values (p_teacher, v_class, v_school) on conflict (teacher_id, class_id) do nothing;
  insert into public.user_roles (user_id, role_id, scope_type, scope_id, created_by)
  values (p_teacher, v_role, 'class', v_class, auth.uid()) on conflict do nothing;
  insert into public.enrolments (student_id, class_id, year_id, school_id)
  values (p_learner, v_class, v_year, v_school)
  on conflict (student_id, class_id) do update set status = 'active';
  return v_class;
end $$;

create or replace function public.unassign_learner_teacher(p_learner uuid, p_teacher uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.auth_can('users:edit', null) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.enrolments e set status = 'left'
  where e.student_id = p_learner and e.class_id in (
    select a.class_id from public.teaching_assignments a
    join public.schools s on s.id = a.school_id
    where a.teacher_id = p_teacher and s.code = 'GENERAL');
end $$;
revoke all on function public.assign_learner_teacher(uuid, uuid),
  public.unassign_learner_teacher(uuid, uuid) from public, anon;
grant execute on function public.assign_learner_teacher(uuid, uuid),
  public.unassign_learner_teacher(uuid, uuid) to authenticated;

-- Messages reach every student the sender may write to, including general learners given to
-- a teacher of another school (each target is still checked against the sender's rights).
create or replace function public.send_message(p_audience text, p_targets jsonb, p_body text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_school uuid := public.my_school_id();
  v_body text := trim(coalesce(p_body, ''));
  v_id uuid;
  v_count integer;
  v_names text[];
  v_to uuid[];
begin
  if v_me is null or v_school is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_audience not in ('students', 'staff') or jsonb_typeof(p_targets) <> 'array'
     or jsonb_array_length(p_targets) not between 1 and 200
     or char_length(v_body) not between 1 and 2000 then
    raise exception 'bad message' using errcode = '23514';
  end if;
  if (select count(*) from public.messages m
      where m.sender_id = v_me and m.created_at > now() - interval '1 hour') >= 30 then
    raise exception 'too many messages' using errcode = '54000';
  end if;

  if p_audience = 'students' then
    select array_agg(distinct p.id) into v_to from jsonb_array_elements(p_targets) t
    join public.profiles p on p.kind = 'student' and p.status = 'active'
    where (t->>'type' = 'class' and exists (select 1 from public.enrolments e
            where e.class_id = (t->>'id')::uuid and e.student_id = p.id and e.status = 'active'
              and public.auth_can('messages:send', e.school_id, e.class_id)))
       or (t->>'type' = 'group' and exists (select 1 from public.group_members gm
            join public.groups g on g.id = gm.group_id
            where g.id = (t->>'id')::uuid and gm.student_id = p.id
              and public.auth_can('messages:send', g.school_id, g.class_id)))
       or (t->>'type' = 'student' and p.id = (t->>'id')::uuid
            and public.auth_can_user('messages:send', p.id));
    select array_agg(n) into v_names from (
      select c.name as n from jsonb_array_elements(p_targets) t
        join public.classes c on c.id = (t->>'id')::uuid where t->>'type' = 'class'
      union all select g.name from jsonb_array_elements(p_targets) t
        join public.groups g on g.id = (t->>'id')::uuid where t->>'type' = 'group'
      union all select p.full_name from jsonb_array_elements(p_targets) t
        join public.profiles p on p.id = (t->>'id')::uuid
        where t->>'type' = 'student' and p.id = any(v_to)
      limit 8) x;
  else
    if not public.auth_can('messages:send_staff', v_school) then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    select array_agg(p.id) into v_to from public.profiles p
    where p.kind = 'staff' and p.status = 'active' and p.school_id = v_school and p.id <> v_me
      and exists (select 1 from public.teaching_assignments a where a.teacher_id = p.id)
      and exists (select 1 from jsonb_array_elements(p_targets) t
        where t->>'type' = 'teachers' or (t->>'type' = 'teacher' and (t->>'id')::uuid = p.id));
    if exists (select 1 from jsonb_array_elements(p_targets) t where t->>'type' = 'teachers') then
      v_names := array['*'];
    else
      select array_agg(n) into v_names from (
        select p.full_name as n from public.profiles p where p.id = any(v_to) limit 8) x;
    end if;
  end if;

  v_count := coalesce(cardinality(v_to), 0);
  if v_count = 0 then
    raise exception 'nobody to send to' using errcode = '23514';
  end if;

  insert into public.messages (school_id, sender_id, audience, to_names, recipients, body)
  values (v_school, v_me, p_audience, coalesce(v_names, '{}'), v_count, v_body)
  returning id into v_id;
  insert into public.message_recipients (message_id, user_id) select v_id, u from unnest(v_to) u;
  insert into public.notifications (user_id, school_id, kind, params, href)
  select u, v_school, 'message',
    jsonb_build_object('from', (select full_name from public.profiles where id = v_me)),
    case when p_audience = 'students' then '/student/messages' else '/teacher/messages' end
  from unnest(v_to) u;
  return v_id;
end $$;
