-- Phase 4: assessment (SPEC §7, §14 Assessment). Students read their own results but never
-- write here directly: the test runtime (server) writes after checking ownership.

create table public.test_blueprints (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments (id) on delete cascade,
  kind text not null check (kind in ('placement', 'progress')),
  min_items smallint not null check (min_items between 1 and 100),
  max_items smallint not null check (max_items between 1 and 100),
  target_se numeric(4, 2) not null check (target_se > 0),
  time_limit_sec integer check (time_limit_sec is null or time_limit_sec > 0),
  retake_cooldown_days smallint not null default 30 check (retake_cooldown_days >= 0),
  status text not null default 'active' check (status in ('active', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (department_id, kind),
  check (max_items >= min_items)
);

create table public.test_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  department_id uuid not null references public.departments (id) on delete restrict,
  kind text not null check (kind in ('placement', 'progress')),
  status text not null default 'in_progress'
    check (status in ('in_progress', 'productive', 'completed', 'abandoned', 'expired')),
  theta0 numeric(5, 3) not null default 0,
  theta numeric(5, 3),
  se numeric(5, 3),
  items_count smallint not null default 0,
  current_item_id uuid references public.items (id) on delete set null,
  current_served_at timestamptz,
  started_at timestamptz not null default now(),
  deadline_at timestamptz,
  completed_at timestamptz,
  stop_reason text,
  tab_switches integer not null default 0,
  scaled_score smallint,
  cefr text,
  skill_estimates jsonb not null default '[]'::jsonb,
  rng_seed bigint not null,
  window_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index test_sessions_student_idx on public.test_sessions (student_id, department_id, started_at desc);
create index test_sessions_school_idx on public.test_sessions (school_id, completed_at desc);
create unique index test_sessions_one_open on public.test_sessions (student_id, department_id, kind)
  where status in ('in_progress', 'productive');

create table public.responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.test_sessions (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete restrict,
  item_version integer not null,
  skill_id uuid not null references public.skills (id) on delete restrict,
  seq smallint not null,
  answer jsonb not null,
  correct boolean,
  time_ms integer not null check (time_ms >= 0),
  b_used numeric(5, 2) not null,
  theta_after numeric(5, 3),
  se_after numeric(5, 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, seq),
  unique (session_id, item_id)
);
-- "not seen in the last 180 days" (SPEC §7) and calibration per item.
create index responses_student_item_idx on public.responses (student_id, item_id, created_at desc);
create index responses_item_idx on public.responses (item_id);

create table public.ability_estimates (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  department_id uuid not null references public.departments (id) on delete cascade,
  skill_id uuid references public.skills (id) on delete cascade,
  theta numeric(5, 3) not null,
  se numeric(5, 3),
  cefr text,
  source text not null check (source in ('placement', 'progress', 'rubric', 'teacher')),
  session_id uuid references public.test_sessions (id) on delete set null,
  measured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ability_estimates_student_idx on public.ability_estimates (student_id, department_id, measured_at desc);

create table public.productive_submissions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.test_sessions (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete restrict,
  skill_id uuid not null references public.skills (id) on delete restrict,
  kind text not null check (kind in ('writing', 'speaking')),
  body text,
  drive_file_id text,
  mime_type text,
  duration_ms integer,
  status text not null default 'submitted' check (status in ('submitted', 'scored')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, item_id),
  check ((kind = 'writing' and body is not null) or (kind = 'speaking' and drive_file_id is not null))
);
create index productive_submissions_school_idx on public.productive_submissions (school_id, status);

create table public.submission_scores (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.productive_submissions (id) on delete cascade,
  scorer_id uuid not null references public.profiles (id) on delete restrict,
  rubric_id uuid references public.rubrics (id) on delete set null,
  scores jsonb not null,
  cefr text not null check (cefr in ('PreA1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  comment text,
  school_id uuid not null references public.schools (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A teacher's permission for one more placement attempt (SPEC §7 retake policy).
create table public.placement_retakes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  department_id uuid not null references public.departments (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  granted_by uuid not null references public.profiles (id) on delete restrict,
  reason text,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index placement_retakes_student_idx on public.placement_retakes (student_id, department_id) where used_at is null;

-- A progress check a teacher opens for a class until a date (SPEC §7 progress checks).
create table public.placement_windows (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  department_id uuid not null references public.departments (id) on delete cascade,
  opens_at timestamptz not null default now(),
  closes_at timestamptz not null,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closes_at > opens_at)
);
create index placement_windows_class_idx on public.placement_windows (class_id, closes_at);

alter table public.test_sessions
  add constraint test_sessions_window_fk foreign key (window_id) references public.placement_windows (id) on delete set null;
