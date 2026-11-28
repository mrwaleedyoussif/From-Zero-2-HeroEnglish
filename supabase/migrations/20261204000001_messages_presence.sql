-- In-app messages (staff → students, classes or groups; leaders → teachers) and "who is online".
-- Students never send: only send_message() writes, and it needs a sending permission.
insert into public.permissions (key, module, description_en, description_ar) values
  ('messages:send', 'messages', 'Send in-app messages to students', 'إرسال رسائل داخل التطبيق إلى الطلاب'),
  ('messages:send_staff', 'messages', 'Send in-app messages to teachers', 'إرسال رسائل داخل التطبيق إلى المعلمين'),
  ('messages:monitor', 'messages', 'Read every in-app message', 'قراءة كل الرسائل داخل التطبيق'),
  ('presence:view', 'presence', 'See who is online', 'معرفة المتصلين الآن')
on conflict (key) do nothing;

with g(role_key, perm) as (values
  ('teacher', 'messages:send'), ('teacher', 'presence:view'),
  ('coach', 'messages:send'), ('coach', 'messages:send_staff'),
  ('vp', 'messages:send'), ('vp', 'messages:send_staff'), ('vp', 'presence:view'),
  ('academic_vp', 'messages:send'), ('academic_vp', 'messages:send_staff'), ('academic_vp', 'presence:view'),
  ('principal', 'messages:send'), ('principal', 'messages:send_staff'), ('principal', 'presence:view')
)
insert into public.role_permissions (role_id, permission_key)
select r.id, g.perm from g join public.roles r on r.key = g.role_key
on conflict (role_id, permission_key) do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r cross join public.permissions p
where r.is_system and r.default_scope_type = 'platform'
on conflict (role_id, permission_key) do nothing;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  audience text not null check (audience in ('students', 'staff')),
  to_names text[] not null default '{}',
  recipients integer not null default 0,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_sender_idx on public.messages (sender_id, created_at desc);
create index messages_school_idx on public.messages (school_id, created_at desc);

create table public.message_recipients (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  read_at timestamptz,
  primary key (message_id, user_id)
);
create index message_recipients_user_idx on public.message_recipients (user_id, read_at);

alter table public.messages enable row level security;
alter table public.message_recipients enable row level security;

create or replace function public.auth_got_message(p_message uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.message_recipients r
    where r.message_id = p_message and r.user_id = auth.uid())
$$;
create or replace function public.auth_sent_message(p_message uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.messages m
    where m.id = p_message
      and (m.sender_id = auth.uid() or public.auth_can('messages:monitor', m.school_id)))
$$;
revoke all on function public.auth_got_message(uuid), public.auth_sent_message(uuid) from public, anon;
grant execute on function public.auth_got_message(uuid), public.auth_sent_message(uuid) to authenticated;

create policy messages_select on public.messages for select to authenticated
  using (sender_id = auth.uid() or public.auth_got_message(id)
    or public.auth_can('messages:monitor', school_id));
create policy message_recipients_select on public.message_recipients for select to authenticated
  using (user_id = auth.uid() or public.auth_sent_message(message_id));
create policy message_recipients_read on public.message_recipients for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update on public.message_recipients from authenticated;
grant update (read_at) on public.message_recipients to authenticated;

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('assignment', 'due_soon', 'badge', 'report', 'kudos', 'level_up', 'redemption', 'message'));

-- Send one message. Targets: [{type: 'class'|'group'|'student'|'teacher'|'teachers', id}].
-- Every target is checked against the sender's rights; people outside them are left out.
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
    join public.profiles p on p.kind = 'student' and p.status = 'active' and p.school_id = v_school
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
revoke all on function public.send_message(text, jsonb, text) from public, anon;
grant execute on function public.send_message(text, jsonb, text) to authenticated;

-- Who is online: each signed-in page says "I am here" about once a minute.
create table public.presence (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  seen_at timestamptz not null default now()
);
alter table public.presence enable row level security;

create or replace function public.touch_presence() returns void
language sql security definer set search_path = '' as $$
  insert into public.presence (user_id) select p.id from public.profiles p where p.id = auth.uid()
  on conflict (user_id) do update set seen_at = now()
    where public.presence.seen_at < now() - interval '45 seconds'
$$;

-- People the caller may see, with when they were last here. p_minutes: only those seen lately.
create or replace function public.presence_list(p_minutes integer default 5)
returns table (user_id uuid, full_name text, kind text, school_id uuid, seen_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id, p.full_name, p.kind, p.school_id, s.seen_at
  from public.presence s join public.profiles p on p.id = s.user_id
  where p.status = 'active' and p.id <> auth.uid()
    and s.seen_at > now() - make_interval(mins => least(greatest(coalesce(p_minutes, 5), 1), 43200))
    and (public.auth_can('presence:view', p.school_id) or public.auth_can_user('presence:view', p.id))
  order by s.seen_at desc limit 500
$$;
revoke all on function public.touch_presence(), public.presence_list(integer) from public, anon;
grant execute on function public.touch_presence(), public.presence_list(integer) to authenticated;
