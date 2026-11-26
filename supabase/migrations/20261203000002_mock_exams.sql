-- STEP mock exams (30 full exams from the Owner's pack) and learners' timed attempts.
-- Exams hold answer keys: staff with content:view read them; learners get an exam through the
-- server, which removes the answers, keeps the time and marks every answer itself.
create table public.mock_exams (
  id text primary key check (id ~ '^M[0-9]{2}$'),
  title text not null,
  set_code text not null check (set_code ~ '^[A-Z]$'),
  content jsonb not null,
  hash text not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One sitting of an exam. Sections run in order, each with its own time; a section that is
-- left (or runs out of time) cannot be opened again, as in the real test.
create table public.mock_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  school_id uuid references public.schools (id) on delete cascade,
  exam_id text not null references public.mock_exams (id) on delete cascade,
  section smallint not null default 1 check (section between 1 and 9),
  section_started_at timestamptz not null default now(),
  answers jsonb not null default '{}'::jsonb,
  played jsonb not null default '[]'::jsonb,
  finished_at timestamptz,
  score smallint,
  section_scores jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index mock_attempts_student_idx on public.mock_attempts (student_id, exam_id);
create index mock_attempts_school_idx on public.mock_attempts (school_id);

alter table public.mock_exams enable row level security;
alter table public.mock_attempts enable row level security;
create trigger set_updated_at before update on public.mock_exams
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.mock_attempts
  for each row execute function public.set_updated_at();

create policy mock_exams_select on public.mock_exams for select to authenticated
  using (public.auth_holds('content:view'));
create policy mock_exams_write on public.mock_exams for all to authenticated
  using (public.auth_can('content:import', null)) with check (public.auth_can('content:import', null));
-- Attempts are written by the server only (it keeps the clock); people read their own, and
-- staff read the learners they may see.
create policy mock_attempts_select on public.mock_attempts for select to authenticated
  using (student_id = auth.uid() or public.auth_can_user('students:view', student_id));

-- One answer at a time, merged in the database, so quick clicks never overwrite each other.
-- Only the server (service role) calls it, after its own checks.
create function public.mock_set_answer(p_attempt uuid, p_question text, p_choice text)
returns void language sql security definer set search_path = '' as $$
  update public.mock_attempts
     set answers = answers || jsonb_build_object(p_question, p_choice)
   where id = p_attempt and finished_at is null;
$$;
revoke execute on function public.mock_set_answer(uuid, text, text) from public, anon, authenticated;
grant execute on function public.mock_set_answer(uuid, text, text) to service_role;
