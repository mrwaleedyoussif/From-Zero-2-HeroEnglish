-- Access control tables (SPEC §3, §4, §14). Roles and permissions are data, not code.

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z_]+:[a-z_:]+$'), -- resource:action
  module text not null,
  description_en text not null,
  description_ar text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z][a-z0-9_]{1,40}$'),
  name_en text not null,
  name_ar text not null,
  default_scope_type text not null check (default_scope_type in ('platform', 'school', 'grade', 'class', 'self')),
  is_system boolean not null default false,
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_key text not null references public.permissions (key) on delete cascade on update cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (role_id, permission_key)
);
create index role_permissions_perm_idx on public.role_permissions (permission_key);

-- scope_id meaning: platform → null; school → schools.id; grade → grades.id; class → classes.id; self → null.
-- school_id is denormalised from the scope (null for platform) so RLS can filter cheaply.
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete cascade,
  scope_type text not null check (scope_type in ('platform', 'school', 'grade', 'class', 'self')),
  scope_id uuid,
  school_id uuid references public.schools (id) on delete cascade,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((scope_type in ('platform', 'self')) = (scope_id is null)),
  check ((scope_type = 'platform') = (school_id is null) or scope_type = 'self')
);
create unique index user_roles_unique on public.user_roles (user_id, role_id, scope_type, coalesce(scope_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index user_roles_role_idx on public.user_roles (role_id);
create index user_roles_school_idx on public.user_roles (school_id);

create table public.user_permission_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  permission_key text not null references public.permissions (key) on delete cascade on update cascade,
  effect text not null check (effect in ('allow', 'deny')),
  scope_type text not null check (scope_type in ('platform', 'school', 'grade', 'class', 'self')),
  scope_id uuid,
  school_id uuid references public.schools (id) on delete cascade,
  expires_at timestamptz,
  reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((scope_type in ('platform', 'self')) = (scope_id is null))
);
create index overrides_user_idx on public.user_permission_overrides (user_id, permission_key);
create index overrides_school_idx on public.user_permission_overrides (school_id);

create table public.supervision_links (
  id uuid primary key default gen_random_uuid(),
  supervisor_id uuid not null references public.profiles (id) on delete cascade,
  supervisee_id uuid not null references public.profiles (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  kind text not null default 'line' check (kind in ('line', 'academic', 'coaching')),
  source text not null default 'manual' check (source in ('default', 'manual')),
  active_from date not null default current_date,
  active_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (supervisor_id <> supervisee_id),
  check (active_to is null or active_to >= active_from)
);
create index supervision_supervisor_idx on public.supervision_links (supervisor_id);
create index supervision_supervisee_idx on public.supervision_links (supervisee_id);
create index supervision_school_idx on public.supervision_links (school_id);

-- Rules used by "apply defaults": every holder of supervisor_role in a school supervises every holder of supervisee_role.
create table public.supervision_defaults (
  id uuid primary key default gen_random_uuid(),
  supervisor_role_id uuid not null references public.roles (id) on delete cascade,
  supervisee_role_id uuid not null references public.roles (id) on delete cascade,
  kind text not null check (kind in ('line', 'academic', 'coaching')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (supervisor_role_id, supervisee_role_id)
);

-- Engine arrives in Phase 2; tables exist now so audit + RLS cover them from day one.
create table public.visibility_rules (
  id uuid primary key default gen_random_uuid(),
  target_key text not null,
  subject_type text not null check (subject_type in ('plan', 'role', 'school', 'grade', 'class', 'user')),
  subject_id uuid,
  effect text not null check (effect in ('show', 'hide')),
  starts_at timestamptz,
  ends_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index visibility_rules_key_idx on public.visibility_rules (target_key);

create table public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  enabled boolean not null default false,
  rollout text not null default 'all' check (rollout in ('all', 'list')),
  subjects jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Append-only. Written by triggers / log_audit(); nobody may update or delete rows.
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  target_table text,
  target_id uuid,
  school_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_school_idx on public.audit_log (school_id, created_at desc);
create index audit_log_target_idx on public.audit_log (target_table, target_id);

do $$
declare t text;
begin
  foreach t in array array['permissions','roles','role_permissions','user_roles','user_permission_overrides',
    'supervision_links','supervision_defaults','visibility_rules','feature_flags'] loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
  foreach t in array array['permissions','roles','role_permissions','user_roles','user_permission_overrides',
    'supervision_links','supervision_defaults','visibility_rules','feature_flags','audit_log'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
