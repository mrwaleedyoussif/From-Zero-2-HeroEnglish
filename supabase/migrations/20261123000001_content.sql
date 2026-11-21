-- Phase 3: content model (SPEC §6, §14 Content) + Drive integration secret (SPEC §5).
-- The Owner writes content in Google Sheets; the importer upserts by stable codes.
-- Content is never deleted by import: rows missing from a sheet stay; status=retired hides them.

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9_]{2,20}$'),
  name_en text not null,
  name_ar text not null,
  description text,
  placement_max_items smallint not null default 30 check (placement_max_items between 5 and 100),
  placement_min_items smallint not null default 12 check (placement_min_items between 1 and 100),
  placement_target_se numeric(4, 2) not null default 0.35 check (placement_target_se > 0),
  status text not null default 'active' check (status in ('active', 'draft', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments (id) on delete cascade,
  code text not null check (code ~ '^[A-Z0-9_]{2,20}$'),
  name_en text not null,
  name_ar text not null,
  blueprint_min_share numeric(4, 3) not null default 0 check (blueprint_min_share between 0 and 1),
  sort_order smallint not null default 0,
  status text not null default 'active' check (status in ('active', 'draft', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (department_id, code)
);

-- Files in Drive /LinguaPath/02_Media, cached so we never search Drive per request.
create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  file_name text not null unique,
  drive_file_id text not null unique,
  mime_type text not null,
  size_bytes bigint,
  folder text,
  drive_modified_at timestamptz,
  status text not null default 'active' check (status in ('active', 'missing')),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.passages (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  body text not null,
  media_file text,
  media_asset_id uuid references public.media_assets (id) on delete set null,
  cefr text check (cefr in ('PreA1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  word_count integer,
  tags text[] not null default '{}',
  source_note text,
  status text not null default 'active' check (status in ('active', 'draft', 'retired')),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  department_id uuid not null references public.departments (id) on delete restrict,
  skill_id uuid not null references public.skills (id) on delete restrict,
  sub_skill text,
  item_type text not null check (item_type in ('mcq_single', 'mcq_multi', 'true_false', 'gap_fill', 'matching',
    'ordering', 'short_answer', 'writing_prompt', 'speaking_prompt')),
  stem text not null,
  passage_id uuid references public.passages (id) on delete set null,
  media_file text,
  media_asset_id uuid references public.media_assets (id) on delete set null,
  correct text,
  difficulty smallint not null check (difficulty between 1 and 10),
  -- Initial Rasch difficulty from the Owner's 1–10 judgement (SPEC §7); calibrated later.
  b_initial numeric(5, 2) generated always as ((difficulty - 5.5) * 0.6) stored,
  b_calibrated numeric(5, 2),
  cefr text check (cefr in ('PreA1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  grade_band text check (grade_band in ('K-2', '3-5', '6-8', '9-12')),
  tags text[] not null default '{}',
  explanation text,
  time_limit_sec integer check (time_limit_sec is null or time_limit_sec > 0),
  author text,
  status text not null default 'active' check (status in ('active', 'draft', 'retired')),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index items_department_skill_idx on public.items (department_id, skill_id) where status = 'active';
create index items_passage_idx on public.items (passage_id);
create index items_media_idx on public.items (media_asset_id);

create table public.item_options (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  label text not null check (label in ('A', 'B', 'C', 'D', 'E')),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, label)
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  department_id uuid not null references public.departments (id) on delete restrict,
  skill_id uuid not null references public.skills (id) on delete restrict,
  title_en text not null,
  title_ar text not null,
  cefr text check (cefr in ('PreA1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  grade_band text check (grade_band in ('K-2', '3-5', '6-8', '9-12')),
  objectives text,
  duration_min smallint check (duration_min is null or duration_min > 0),
  format text not null check (format in ('video', 'audio', 'reading', 'interactive', 'worksheet', 'game', 'slides')),
  content_link text,
  content_url text,
  media_asset_id uuid references public.media_assets (id) on delete set null,
  tags text[] not null default '{}',
  prerequisites text[] not null default '{}',
  xp integer not null default 0 check (xp >= 0),
  status text not null default 'active' check (status in ('active', 'draft', 'retired')),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lessons_filters_idx on public.lessons (department_id, skill_id, cefr, grade_band) where status = 'active';
create index lessons_tags_idx on public.lessons using gin (tags);
create index lessons_media_idx on public.lessons (media_asset_id);

create table public.lesson_items (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lesson_id, item_id)
);
create index lesson_items_item_idx on public.lesson_items (item_id);

create table public.cut_scores (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments (id) on delete cascade,
  cefr text not null check (cefr in ('PreA1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  min_theta numeric(5, 2) not null,
  max_theta numeric(5, 2) not null check (max_theta > min_theta),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (department_id, cefr)
);

-- Filled in Phase 4 (placement) — tables exist so the content model is complete.
create table public.rubrics (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  department_id uuid references public.departments (id) on delete cascade,
  skill_id uuid references public.skills (id) on delete cascade,
  criteria jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ability_priors (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments (id) on delete cascade,
  grade_band text not null check (grade_band in ('K-2', '3-5', '6-8', '9-12')),
  theta0 numeric(5, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (department_id, grade_band)
);

-- One row per sync. `payload` holds the previewed rows until applied, then is cleared (DB budget).
create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  started_by uuid,
  status text not null default 'previewed' check (status in ('previewed', 'applied', 'failed', 'expired')),
  summary jsonb not null default '{}'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  missing_media jsonb not null default '[]'::jsonb,
  payload jsonb,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index import_jobs_created_idx on public.import_jobs (created_at desc);

-- Encrypted secrets (AES-256-GCM with ENCRYPTION_KEY). Only the service role reads them.
create table public.integration_secrets (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique,
  ciphertext text not null,
  account_email text,
  scopes text[] not null default '{}',
  connected_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
