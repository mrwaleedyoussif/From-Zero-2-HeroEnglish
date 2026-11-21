-- Phase 5: learner profiles, groups & teams, assignments, progress, recommendations,
-- notifications (SPEC §8, §9, §12 in-app, §14 Learning).

-- Owner-editable option lists for the onboarding wizard (content is data, rule 6).
create table public.profile_options (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('interest', 'goal', 'format', 'accommodation', 'mindset')),
  key text not null,
  name_en text not null,
  name_ar text not null,
  emoji text,
  reverse_scored boolean not null default false, -- mindset statements: fixed-mindset wording
  sort_order smallint not null default 0,
  status text not null default 'active' check (status in ('active', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, key)
);

create table public.learner_profiles (
  student_id uuid primary key references public.profiles (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  interests text[] not null default '{}',
  goals text[] not null default '{}',
  preferred_formats text[] not null default '{}',
  accommodations text[] not null default '{}',
  mindset_answers jsonb not null default '{}',
  mindset_score smallint check (mindset_score between 0 and 100),
  language_background text check (char_length(language_background) <= 200),
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Teacher annotations on a learner (staff only; students don't see them).
create table public.learner_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index learner_notes_student_idx on public.learner_notes (student_id, created_at desc);

-- Flexible groups (by level or interest) and Kagan-style teams of 4, both inside one class.
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, name)
);
create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, student_id)
);
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, name)
);
create table public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (team_id, student_id)
);
create index group_members_student_idx on public.group_members (student_id);
create index team_members_student_idx on public.team_members (student_id);

-- A lesson set for students of one class (targets: students, groups, teams or the class).
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete restrict,
  created_by uuid references public.profiles (id) on delete set null,
  note text check (char_length(note) <= 500),
  due_at timestamptz,
  required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index assignments_class_idx on public.assignments (class_id, created_at desc);

create table public.assignment_targets (
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  target_type text not null check (target_type in ('student', 'group', 'team', 'class')),
  target_id uuid not null,
  primary key (assignment_id, target_type, target_id)
);

-- One row per student per assignment; "overdue" is computed (due_at passed, not done).
create table public.assignment_progress (
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'done')),
  score smallint check (score between 0 and 100),
  time_spent_sec integer not null default 0 check (time_spent_sec >= 0),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (assignment_id, student_id)
);
create index assignment_progress_student_idx on public.assignment_progress (student_id, status);

-- A learner's history with a lesson, assigned or self-chosen (novelty / repetition signals).
create table public.lesson_progress (
  student_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'done')),
  best_score smallint check (best_score between 0 and 100),
  attempts smallint not null default 0,
  time_spent_sec integer not null default 0 check (time_spent_sec >= 0),
  last_opened_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (student_id, lesson_id)
);

-- Daily cache of a learner's ranked suggestions (computed at most once a day: DB budget).
create table public.recommendations (
  student_id uuid primary key references public.profiles (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  computed_on date not null default current_date,
  items jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

-- In-app notifications (bell). Text is a message key + params, rendered in the user's language.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  school_id uuid references public.schools (id) on delete cascade,
  kind text not null check (kind in ('assignment', 'due_soon', 'badge', 'report', 'kudos')),
  params jsonb not null default '{}',
  href text check (href ~ '^/[A-Za-z0-9/_?=&.-]*$'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
