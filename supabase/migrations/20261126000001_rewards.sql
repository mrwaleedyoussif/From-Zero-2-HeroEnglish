-- Phase 6: rewards (SPEC §10, §14 Rewards). Rules, levels, badges and the catalogue are data the
-- Owner tunes; learner balances are written by the server only (anti-gaming lives there).

create table public.reward_rules (
  event_type text primary key check (event_type in ('lesson_completed', 'practice_accuracy',
    'assignment_on_time', 'placement_completed', 'progress_completed', 'streak_day', 'kudos', 'team_challenge')),
  xp integer not null default 0 check (xp between 0 and 10000),
  coins integer not null default 0 check (coins between 0 and 10000),
  min_seconds integer check (min_seconds is null or min_seconds >= 0),
  min_accuracy smallint check (min_accuracy is null or min_accuracy between 0 and 100),
  daily_cap integer check (daily_cap is null or daily_cap > 0),
  scale text not null default 'none' check (scale in ('none', 'level', 'accuracy')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.levels (
  level smallint primary key check (level >= 1),
  name_en text not null,
  name_ar text not null,
  xp_required integer not null unique check (xp_required >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_en text not null,
  name_ar text not null,
  description text,
  icon_file text,
  media_asset_id uuid references public.media_assets (id) on delete set null,
  rule jsonb not null,
  xp_bonus integer not null default 0 check (xp_bonus between 0 and 10000),
  status text not null default 'active' check (status in ('active', 'draft', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_badges (
  student_id uuid not null references public.profiles (id) on delete cascade,
  badge_id uuid not null references public.badges (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  awarded_at timestamptz not null default now(),
  primary key (student_id, badge_id)
);

-- Every XP/coin award. `source_key` makes awards idempotent (one per lesson completion, day…).
create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  event_type text not null,
  xp integer not null check (xp >= 0),
  coins integer not null default 0 check (coins >= 0),
  source_key text not null,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (student_id, event_type, source_key)
);
create index xp_events_student_idx on public.xp_events (student_id, created_at desc);
create index xp_events_school_idx on public.xp_events (school_id, created_at desc);

create table public.streaks (
  student_id uuid primary key references public.profiles (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  current integer not null default 0,
  longest integer not null default 0,
  last_active_on date,
  freeze_week date,
  updated_at timestamptz not null default now()
);

create table public.coin_ledger (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  delta integer not null check (delta <> 0),
  reason text not null check (reason in ('earned', 'redeemed', 'refund')),
  ref_id uuid,
  created_at timestamptz not null default now()
);
create index coin_ledger_student_idx on public.coin_ledger (student_id);

-- Cosmetic items (platform-wide, school_id null) and school-defined real rewards.
create table public.reward_catalog (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools (id) on delete cascade,
  code text not null,
  name_en text not null,
  name_ar text not null,
  emoji text,
  kind text not null check (kind in ('cosmetic', 'real')),
  cost integer not null check (cost > 0),
  needs_approval boolean not null default true,
  status text not null default 'active' check (status in ('active', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (school_id, code)
);

create table public.redemptions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  item_id uuid not null references public.reward_catalog (id) on delete restrict,
  cost integer not null check (cost > 0),
  status text not null default 'requested' check (status in ('requested', 'approved', 'rejected')),
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index redemptions_school_idx on public.redemptions (school_id, status);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  kind text not null check (kind in ('level', 'cefr')),
  value text not null,
  department_id uuid references public.departments (id) on delete cascade,
  issued_at timestamptz not null default now(),
  unique nulls not distinct (student_id, kind, value, department_id)
);

-- Per-class switches teachers control (leaderboard on/off). Audited (visibility change).
create table public.class_reward_settings (
  class_id uuid primary key references public.classes (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  leaderboard_enabled boolean not null default true,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Team challenge points (e.g. RallyCoach, Numbered Heads) given by the teacher to a team.
create table public.team_xp (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  points integer not null check (points between 1 and 1000),
  reason text check (char_length(reason) <= 120),
  awarded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index team_xp_team_idx on public.team_xp (team_id, created_at desc);

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('assignment', 'due_soon', 'badge', 'report', 'kudos', 'level_up', 'redemption'));
