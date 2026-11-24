-- Course units: whole units kept exactly as their author organised them (objectives, words,
-- reading text, questions with hints, writing lesson and task). One row per unit; the unit
-- itself is the JSON document the Owner imports from Drive.
create table public.course_units (
  id text primary key check (id ~ '^[A-Z0-9-]{3,40}$'),
  strand text not null check (strand ~ '^[A-Z]{1,8}$'),
  -- The course's own ten levels (the "+" levels are not CEFR bands the placement test uses).
  level text not null check (level in ('A1', 'A1+', 'A2', 'A2+', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C2')),
  unit smallint not null check (unit between 1 and 99),
  title text not null,
  title_ar text,
  content jsonb not null,
  -- Fingerprint of the file, so an unchanged unit is not rewritten on the next import.
  hash text not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (strand, level, unit)
);

-- A learner's work on a unit: answers so far, the writing, and the score of first tries.
create table public.course_unit_progress (
  student_id uuid not null references public.profiles (id) on delete cascade,
  unit_id text not null references public.course_units (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  writing text check (writing is null or char_length(writing) <= 6000),
  correct smallint not null default 0,
  total smallint not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (student_id, unit_id)
);
create index course_unit_progress_unit_idx on public.course_unit_progress (unit_id);

alter table public.course_units enable row level security;
alter table public.course_unit_progress enable row level security;
create trigger set_updated_at before update on public.course_units
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.course_unit_progress
  for each row execute function public.set_updated_at();

-- Units hold answer keys: staff with content:view only. Learners get a unit through the
-- server, which removes the answers and checks each one itself.
create policy course_units_select on public.course_units for select to authenticated
  using (public.auth_holds('content:view'));
create policy course_units_write on public.course_units for all to authenticated
  using (public.auth_can('content:import', null)) with check (public.auth_can('content:import', null));

-- Progress: the learner, or staff with students:view over them. The server writes it.
create policy course_unit_progress_select on public.course_unit_progress for select to authenticated
  using (student_id = auth.uid() or public.auth_can_user('students:view', student_id));
