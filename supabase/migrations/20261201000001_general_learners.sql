-- General learners (people outside a school): the Owner decides who gets in.
-- A sign-up either carries an invitation code (in at once) or waits for the Owner's approval.

-- ── Invitation codes ─────────────────────────────────────────────────────
create table public.learner_invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{6,12}$'),
  label text not null check (char_length(label) between 1 and 80),
  max_uses integer not null check (max_uses between 1 and 100000),
  used integer not null default 0 check (used >= 0),
  expires_at timestamptz,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Requests: one per general learner ────────────────────────────────────
create table public.learner_requests (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  invite_id uuid references public.learner_invites (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved')),
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index learner_requests_status_idx on public.learner_requests (status, created_at);

do $$
declare t text;
begin
  foreach t in array array['learner_invites', 'learner_requests'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create trigger set_updated_at before update on public.%I
      for each row execute function public.set_updated_at()', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- Platform-level user managers (the Owner) run both lists; sign-ups themselves are written by
-- server code (service role) after the emailed code proved the address.
create policy learner_invites_all on public.learner_invites for all to authenticated
  using (public.auth_can('users:invite', null)) with check (public.auth_can('users:invite', null));
create policy learner_requests_select on public.learner_requests for select to authenticated
  using (user_id = auth.uid() or public.auth_can('users:edit', null));
create policy learner_requests_update on public.learner_requests for update to authenticated
  using (public.auth_can('users:edit', null)) with check (public.auth_can('users:edit', null));

create trigger audit after insert or update or delete on public.learner_invites
  for each row execute function public.audit_row();

-- Use one place of an invitation, if it is still valid. One statement, so two people can
-- never take the last place together. Null = not valid (unknown, cancelled, expired or full).
create or replace function public.redeem_learner_invite(p_code text) returns uuid
language sql security definer set search_path = '' as $$
  update public.learner_invites i set used = i.used + 1
  where i.code = upper(btrim(p_code)) and i.status = 'active' and i.used < i.max_uses
    and (i.expires_at is null or i.expires_at > now())
  returning i.id
$$;
revoke all on function public.redeem_learner_invite(text) from public, anon, authenticated;
grant execute on function public.redeem_learner_invite(text) to service_role;
