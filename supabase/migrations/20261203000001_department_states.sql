-- The Owner opens, closes ("soon") or hides each department, per kind of learner (audience:
-- general learners or a school list). No row = the app's default for that department.
create table public.department_states (
  id uuid primary key default gen_random_uuid(),
  audience text not null check (audience ~ '^[a-z0-9-]{2,40}$'),
  department text not null check (department ~ '^[a-zA-Z0-9]{2,40}$'),
  state text not null check (state in ('open', 'soon', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (audience, department)
);
alter table public.department_states enable row level security;
create trigger set_updated_at before update on public.department_states
  for each row execute function public.set_updated_at();
-- Every change is recorded in the audit log (rule 11).
create trigger audit after insert or update or delete on public.department_states
  for each row execute function public.audit_row();

-- What is open is not secret (the public departments page shows it); only the Owner changes it.
create policy department_states_select on public.department_states for select
  to anon, authenticated using (true);
create policy department_states_write on public.department_states for all to authenticated
  using (public.auth_can('visibility:manage', null))
  with check (public.auth_can('visibility:manage', null));
