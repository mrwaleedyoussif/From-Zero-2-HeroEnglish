-- RLS policies (default deny: a table with RLS and no matching policy returns nothing) + audit.

-- The browser's anonymous role never touches app tables.
revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;

-- ── Core ────────────────────────────────────────────────────────────────
create policy schools_select on public.schools for select to authenticated
  using (id = public.my_school_id() or public.auth_can('schools:view', id));
create policy schools_insert on public.schools for insert to authenticated
  with check (public.auth_can('schools:manage', null));
create policy schools_update on public.schools for update to authenticated
  using (public.auth_can('schools:manage', id)) with check (public.auth_can('schools:manage', id));

do $$
declare t text;
begin
  foreach t in array array['academic_years', 'grades', 'classes'] loop
    execute format($f$create policy %1$s_select on public.%1$I for select to authenticated
      using (school_id = public.my_school_id() or public.auth_can('schools:view', school_id))$f$, t);
    execute format($f$create policy %1$s_write on public.%1$I for all to authenticated
      using (public.auth_can('classes:manage', school_id))
      with check (public.auth_can('classes:manage', school_id))$f$, t);
  end loop;
end $$;

create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.auth_can_user('users:view', id));
create policy profiles_insert on public.profiles for insert to authenticated
  with check (public.auth_can('users:create', school_id));
create policy profiles_update on public.profiles for update to authenticated
  using (public.auth_can_user('users:edit', id)) with check (public.auth_can_user('users:edit', id));

create policy enrolments_select on public.enrolments for select to authenticated
  using (student_id = auth.uid() or public.auth_can('students:view', school_id, class_id));
create policy enrolments_write on public.enrolments for all to authenticated
  using (public.auth_can('classes:manage', school_id, class_id))
  with check (public.auth_can('classes:manage', school_id, class_id));

create policy teaching_select on public.teaching_assignments for select to authenticated
  using (teacher_id = auth.uid() or public.auth_can('classes:view', school_id, class_id));
create policy teaching_write on public.teaching_assignments for all to authenticated
  using (public.auth_can('classes:manage', school_id, class_id))
  with check (public.auth_can('classes:manage', school_id, class_id));

-- ── Access catalogue: readable by any signed-in user, editable at platform level ──
do $$
declare t text;
begin
  foreach t in array array['permissions', 'roles', 'role_permissions', 'supervision_defaults'] loop
    execute format($f$create policy %1$s_select on public.%1$I for select to authenticated using (true)$f$, t);
    execute format($f$create policy %1$s_write on public.%1$I for all to authenticated
      using (public.auth_can('roles:manage', null)) with check (public.auth_can('roles:manage', null))$f$, t);
  end loop;
end $$;

create policy user_roles_select on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.auth_can_user('users:view', user_id));
create policy user_roles_insert on public.user_roles for insert to authenticated
  with check (public.auth_can_assign_role(role_id, scope_type, scope_id, user_id));
create policy user_roles_delete on public.user_roles for delete to authenticated
  using (public.auth_can_assign_role(role_id, scope_type, scope_id, user_id));

create policy overrides_select on public.user_permission_overrides for select to authenticated
  using (user_id = auth.uid() or public.auth_can_user('users:view', user_id));
create policy overrides_insert on public.user_permission_overrides for insert to authenticated
  with check (public.auth_can_grant(permission_key, scope_type, scope_id, user_id));
create policy overrides_delete on public.user_permission_overrides for delete to authenticated
  using (public.auth_can_grant(permission_key, scope_type, scope_id, user_id));

create policy supervision_select on public.supervision_links for select to authenticated
  using (supervisor_id = auth.uid() or supervisee_id = auth.uid()
    or public.auth_can('supervision:view', school_id));
create policy supervision_write on public.supervision_links for all to authenticated
  using (public.auth_can('supervision:manage', school_id))
  with check (public.auth_can('supervision:manage', school_id));
create unique index supervision_links_active_unique on public.supervision_links (supervisor_id, supervisee_id, kind)
  where active_to is null;

do $$
declare t text;
begin
  foreach t in array array['visibility_rules', 'feature_flags'] loop
    execute format($f$create policy %1$s_all on public.%1$I for all to authenticated
      using (public.auth_can('visibility:manage', null)) with check (public.auth_can('visibility:manage', null))$f$, t);
  end loop;
end $$;

-- ── Audit (append-only) ─────────────────────────────────────────────────
create policy audit_select on public.audit_log for select to authenticated
  using (public.auth_can('audit:view', school_id));
revoke insert, update, delete, truncate on public.audit_log from authenticated, service_role;

create or replace function public.audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  rec jsonb := to_jsonb(coalesce(new, old));
begin
  insert into public.audit_log (actor_id, action, target_table, target_id, school_id, before, after)
  values (
    auth.uid(), lower(tg_op), tg_table_name, (rec ->> 'id')::uuid,
    case when tg_table_name = 'schools' then (rec ->> 'id')::uuid else (rec ->> 'school_id')::uuid end,
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['schools', 'grades', 'classes', 'permissions', 'roles', 'role_permissions',
    'user_roles', 'user_permission_overrides', 'supervision_links', 'supervision_defaults',
    'visibility_rules', 'feature_flags'] loop
    execute format('create trigger audit after insert or update or delete on public.%I
      for each row execute function public.audit_row()', t);
  end loop;
end $$;

-- App-level events (view-as, PIN reset, import). Actor is always the caller.
create or replace function public.log_audit(
  p_action text, p_target_table text, p_target_id uuid default null, p_school uuid default null, p_details jsonb default null
) returns void
language sql security definer set search_path = '' as $$
  insert into public.audit_log (actor_id, action, target_table, target_id, school_id, after)
  select auth.uid(), p_action, p_target_table, p_target_id, p_school, p_details
  where auth.uid() is not null
$$;
revoke all on function public.log_audit(text, text, uuid, uuid, jsonb) from public, anon;
grant execute on function public.log_audit(text, text, uuid, uuid, jsonb) to authenticated;
revoke all on function public.audit_row() from public, anon, authenticated;

-- ── RPCs (security invoker: RLS still applies) ──────────────────────────
-- Teach a class: teaching assignment + class-scoped role in one transaction.
create or replace function public.assign_class(p_user uuid, p_class uuid, p_role uuid) returns void
language sql security invoker set search_path = '' as $$
  insert into public.teaching_assignments (teacher_id, class_id, school_id)
  select p_user, c.id, c.school_id from public.classes c where c.id = p_class
  on conflict (teacher_id, class_id) do nothing;
  insert into public.user_roles (user_id, role_id, scope_type, scope_id, created_by)
  values (p_user, p_role, 'class', p_class, auth.uid())
  on conflict do nothing;
$$;

-- Create default supervision links in a school from supervision_defaults (idempotent).
create or replace function public.apply_supervision_defaults(p_school uuid) returns integer
language sql security invoker set search_path = '' as $$
  with holders as (
    select distinct ur.user_id, ur.role_id
    from public.user_roles ur join public.profiles p on p.id = ur.user_id
    where p.school_id = p_school and p.status = 'active'
  ), ins as (
    insert into public.supervision_links (supervisor_id, supervisee_id, school_id, kind, source)
    select s.user_id, e.user_id, p_school, d.kind, 'default'
    from public.supervision_defaults d
    join holders s on s.role_id = d.supervisor_role_id
    join holders e on e.role_id = d.supervisee_role_id
    where s.user_id <> e.user_id
    on conflict do nothing
    returning 1
  )
  select count(*)::integer from ins
$$;
revoke all on function public.assign_class(uuid, uuid, uuid) from public, anon;
revoke all on function public.apply_supervision_defaults(uuid) from public, anon;
grant execute on function public.assign_class(uuid, uuid, uuid) to authenticated;
grant execute on function public.apply_supervision_defaults(uuid) to authenticated;
