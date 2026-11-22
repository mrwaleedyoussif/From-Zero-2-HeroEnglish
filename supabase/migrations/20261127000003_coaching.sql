-- Phase 7: coaching log (SPEC §11) and free-tier usage counters for the Owner's budget meters.

create table public.coaching_logs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  class_id uuid references public.classes (id) on delete set null,
  kind text not null check (kind in ('observation', 'walkthrough', 'meeting')),
  observed_on date not null default current_date,
  rubric_id uuid references public.rubrics (id) on delete set null,
  scores jsonb not null default '{}',
  notes text check (char_length(notes) <= 4000),
  agreed_actions text check (char_length(agreed_actions) <= 2000),
  follow_up_on date,
  status text not null default 'open' check (status in ('open', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (coach_id <> teacher_id)
);
create index coaching_logs_coach_idx on public.coaching_logs (coach_id, follow_up_on);
create index coaching_logs_teacher_idx on public.coaching_logs (teacher_id, observed_on desc);

alter table public.coaching_logs enable row level security;
create trigger set_updated_at before update on public.coaching_logs
  for each row execute function public.set_updated_at();

-- Does the caller directly supervise this person today?
create or replace function public.auth_supervises(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.supervision_links l where l.supervisor_id = auth.uid()
    and l.supervisee_id = p_user and l.active_from <= current_date
    and (l.active_to is null or l.active_to >= current_date))
$$;
revoke all on function public.auth_supervises(uuid) from public, anon;
grant execute on function public.auth_supervises(uuid) to authenticated;

-- The coach writes; the observed teacher reads their feedback; whoever supervises the coach or
-- manages supervision in the school reads it too.
create policy coaching_logs_select on public.coaching_logs for select to authenticated
  using (coach_id = auth.uid() or teacher_id = auth.uid() or public.auth_supervises(coach_id)
    or public.auth_can('supervision:manage', school_id));
create policy coaching_logs_insert on public.coaching_logs for insert to authenticated
  with check (coach_id = auth.uid() and public.auth_can_user('coaching:log', teacher_id)
    and school_id = public.my_school_id()
    and (public.auth_supervises(teacher_id) or public.auth_can('supervision:manage', school_id)));
create policy coaching_logs_update on public.coaching_logs for update to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

-- Classroom observation rubric (Owner-editable data, levels 1–4).
insert into public.rubrics (code, criteria) values
  ('OBSERVATION', '[
    {"key": "planning", "name_en": "Lesson planning & objectives", "name_ar": "تخطيط الدرس والأهداف"},
    {"key": "engagement", "name_en": "Student engagement", "name_ar": "تفاعل الطلاب"},
    {"key": "english", "name_en": "Use of English in class", "name_ar": "استخدام الإنجليزية في الصف"},
    {"key": "differentiation", "name_en": "Differentiation", "name_ar": "التمايز"},
    {"key": "afl", "name_en": "Assessment for learning", "name_ar": "التقويم من أجل التعلم"}
  ]'::jsonb)
on conflict (code) do nothing;

-- Usage counters (emails, Drive calls) bumped by the server; read through budget_stats().
create table public.usage_counters (
  day date not null default current_date,
  kind text not null check (kind in ('email', 'drive_call')),
  count integer not null default 0,
  primary key (day, kind)
);
alter table public.usage_counters enable row level security;

create or replace function public.bump_usage(p_kind text, p_n integer default 1) returns void
language sql security definer set search_path = '' as $$
  insert into public.usage_counters (day, kind, count) values (current_date, p_kind, p_n)
  on conflict (day, kind) do update set count = public.usage_counters.count + excluded.count
$$;
revoke all on function public.bump_usage(text, integer) from public, anon, authenticated;
grant execute on function public.bump_usage(text, integer) to service_role;

-- Free-tier budget (SPEC §12): platform integrations managers (the Owner) only.
create or replace function public.budget_stats()
returns table (db_bytes bigint, emails_today int, drive_calls_today int, students int, staff int)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.auth_can('integrations:manage', null) then return; end if;
  return query select pg_database_size(current_database()),
    coalesce((select count from public.usage_counters where day = current_date and kind = 'email'), 0),
    coalesce((select count from public.usage_counters where day = current_date and kind = 'drive_call'), 0),
    (select count(*)::int from public.profiles where kind = 'student' and status = 'active'),
    (select count(*)::int from public.profiles where kind = 'staff' and status = 'active');
end $$;
revoke all on function public.budget_stats() from public, anon;
grant execute on function public.budget_stats() to authenticated;
