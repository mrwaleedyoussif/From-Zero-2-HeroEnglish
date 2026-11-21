-- Phase 2: gate permissions, plans & entitlements (SPEC §4, §13).

-- ── Gate entry permissions (gate access is a permission, never a role name) ──
insert into public.permissions (key, module, description_en, description_ar) values
  ('gate:owner', 'gates', 'Enter the Owner console', 'دخول لوحة المالك'),
  ('gate:leadership', 'gates', 'Enter the school leadership portal', 'دخول بوابة قيادة المدرسة'),
  ('gate:coach', 'gates', 'Enter the coaching portal', 'دخول بوابة التدريب'),
  ('gate:teacher', 'gates', 'Enter the teacher portal', 'دخول بوابة المعلم'),
  ('gate:student', 'gates', 'Enter the student portal', 'دخول بوابة الطالب')
on conflict (key) do nothing;

with g(role_key, perm) as (values
  ('principal', 'gate:leadership'), ('academic_vp', 'gate:leadership'), ('vp', 'gate:leadership'),
  ('coach', 'gate:coach'), ('teacher', 'gate:teacher'), ('student', 'gate:student')
)
insert into public.role_permissions (role_id, permission_key)
select r.id, g.perm from g join public.roles r on r.key = g.role_key
on conflict (role_id, permission_key) do nothing;

-- The platform system role (Owner) holds every permission, including new ones.
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r cross join public.permissions p
where r.is_system and r.default_scope_type = 'platform'
on conflict (role_id, permission_key) do nothing;

-- Gate entry carries no data access, so it is exempt from the anti-escalation check:
-- a principal may assign the teacher role without entering the teacher portal themself.
create or replace function public.auth_can_assign_role(p_role uuid, p_scope_type text, p_scope_id uuid, p_user uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.scope_target(p_scope_type, p_scope_id, p_user) t
    where public.can_user_on(auth.uid(), 'roles:assign', t.school_id, t.grade_id, t.class_id, t.user_id)
      and not exists (
        select 1 from public.role_permissions rp
        where rp.role_id = p_role
          and rp.permission_key not like 'gate:%'
          and not public.can_user_on(auth.uid(), rp.permission_key, t.school_id, t.grade_id, t.class_id, t.user_id)
      )
  )
$$;

-- ── Plans & entitlements (billing switched off: every school resolves to 'free') ──
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z][a-z0-9_]{1,40}$'),
  name_en text not null,
  name_ar text not null,
  sort_order smallint not null default 0,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- key: a registry key (module.*, feature.*, limit.*) or '*' for everything.
-- limit_value: null = unlimited; a number caps limit.* keys.
create table public.plan_entitlements (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  key text not null check (key = '*' or key ~ '^[a-z]+\.[A-Za-z0-9.]+$'),
  limit_value integer check (limit_value is null or limit_value >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, key)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null unique references public.schools (id) on delete cascade,
  plan_id uuid not null references public.plans (id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'canceled')),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  free_until date,
  provider text not null default 'none',
  provider_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index plan_entitlements_plan_idx on public.plan_entitlements (plan_id);
create index subscriptions_plan_idx on public.subscriptions (plan_id);

insert into public.plans (key, name_en, name_ar, sort_order) values
  ('free', 'Free', 'مجانية', 0),
  ('school_basic', 'School Basic', 'المدرسة الأساسية', 1),
  ('school_pro', 'School Pro', 'المدرسة الاحترافية', 2)
on conflict (key) do nothing;
insert into public.plan_entitlements (plan_id, key)
select id, '*' from public.plans where key = 'free'
on conflict (plan_id, key) do nothing;

-- The plan a school is on: its subscription, or 'free'.
create or replace function public.school_plan(p_school uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select s.plan_id from public.subscriptions s where s.school_id = p_school and s.status <> 'canceled'),
    (select p.id from public.plans p where p.key = 'free'))
$$;

do $$
declare t text;
begin
  foreach t in array array['plans', 'plan_entitlements', 'subscriptions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
    execute format('create trigger audit after insert or update or delete on public.%I for each row execute function public.audit_row()', t);
  end loop;
  foreach t in array array['plans', 'plan_entitlements'] loop
    execute format($f$create policy %1$s_select on public.%1$I for select to authenticated using (true)$f$, t);
    execute format($f$create policy %1$s_write on public.%1$I for all to authenticated
      using (public.auth_can('billing:manage', null)) with check (public.auth_can('billing:manage', null))$f$, t);
  end loop;
end $$;

create policy subscriptions_select on public.subscriptions for select to authenticated
  using (school_id = public.my_school_id() or public.auth_can('schools:view', school_id));
create policy subscriptions_write on public.subscriptions for all to authenticated
  using (public.auth_can('billing:manage', school_id)) with check (public.auth_can('billing:manage', school_id));

revoke all on function public.school_plan(uuid) from public, anon;
grant execute on function public.school_plan(uuid) to authenticated;
