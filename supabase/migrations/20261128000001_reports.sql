-- Phase 8: report queue, reports archive, email log, preferences (SPEC §12, §14 Reports).
-- Everything here is written by the scheduler (service role); users read their own rows.

create table public.report_jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('report', 'email', 'pdf', 'archive_responses', 'refresh_insights')),
  dedupe_key text not null unique, -- makes planning idempotent: a second tick inserts nothing
  school_id uuid references public.schools (id) on delete cascade,
  recipient_id uuid references public.profiles (id) on delete cascade,
  report_id uuid,
  period text check (period in ('weekly', 'monthly')),
  period_start date,
  priority smallint not null default 5,
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
  attempts smallint not null default 0,
  deferrals smallint not null default 0,
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index report_jobs_queue_idx on public.report_jobs (status, run_after, priority, created_at);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  period text not null check (period in ('weekly', 'monthly')),
  period_start date not null,
  period_end date not null,
  data jsonb not null,
  drive_file_id text,
  emailed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (recipient_id, period, period_start)
);
create index reports_school_idx on public.reports (school_id, period_start desc);

-- One row per digest email; the unique report_id makes a send happen at most once.
create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  report_id uuid unique references public.reports (id) on delete set null,
  recipient_id uuid references public.profiles (id) on delete set null,
  provider text not null,
  status text not null default 'sending' check (status in ('sending', 'sent', 'failed')),
  day date not null default current_date,
  created_at timestamptz not null default now()
);
create index email_log_day_idx on public.email_log (day, status);

create table public.report_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  weekly boolean not null default true,
  monthly boolean not null default true,
  email boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Each tick leaves a row: diagnostics, and it keeps the free Supabase project from pausing.
create table public.cron_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  planned int not null default 0,
  processed int not null default 0,
  failed int not null default 0,
  deferred int not null default 0
);

-- Monthly per-student/skill totals kept when old responses are archived to Drive (DB budget).
create table public.response_aggregates (
  student_id uuid not null references public.profiles (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  month date not null,
  answered int not null,
  correct int not null,
  primary key (student_id, skill_id, month)
);

do $$
declare t text;
begin
  foreach t in array array['report_jobs', 'reports', 'email_log', 'report_preferences', 'cron_runs',
    'response_aggregates'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
create trigger set_updated_at before update on public.report_jobs for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.report_preferences for each row execute function public.set_updated_at();

-- Reports: the recipient, or school-level report viewers (principal, VPs, Owner).
create policy reports_select on public.reports for select to authenticated
  using (recipient_id = auth.uid() or public.auth_can('reports:view', school_id));
create policy report_preferences_own on public.report_preferences for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Queue, email log and cron runs: platform operators (the Owner) only.
create policy report_jobs_select on public.report_jobs for select to authenticated
  using (public.auth_can('integrations:manage', null));
create policy email_log_select on public.email_log for select to authenticated
  using (public.auth_can('integrations:manage', null));
create policy cron_runs_select on public.cron_runs for select to authenticated
  using (public.auth_can('integrations:manage', null));
create policy response_aggregates_select on public.response_aggregates for select to authenticated
  using (student_id = auth.uid() or public.auth_can_user('students:view', student_id));

-- Claim up to n due jobs (no two ticks get the same job); stale running jobs are retaken.
create or replace function public.claim_jobs(p_n int) returns setof public.report_jobs
language sql security definer set search_path = '' as $$
  update public.report_jobs j set status = 'running', locked_at = now(), attempts = j.attempts + 1
  where j.id in (
    select q.id from public.report_jobs q
    where (q.status = 'queued' and q.run_after <= now())
       or (q.status = 'running' and q.locked_at < now() - interval '10 minutes')
    order by q.priority, q.run_after, q.created_at
    limit p_n
    for update skip locked)
  returning j.*
$$;
revoke all on function public.claim_jobs(int) from public, anon, authenticated;
grant execute on function public.claim_jobs(int) to service_role;
