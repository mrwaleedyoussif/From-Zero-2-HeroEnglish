-- Phase 3: permissions, RLS and audit for content.

insert into public.permissions (key, module, description_en, description_ar) values
  ('integrations:manage', 'content', 'Connect Google Drive and other services', 'ربط Google Drive والخدمات الأخرى')
on conflict (key) do nothing;
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r cross join public.permissions p
where r.is_system and r.default_scope_type = 'platform'
on conflict (role_id, permission_key) do nothing;

-- Holds the permission in at least one scope (mirrors heldPermissions() in engine.ts).
-- For platform-wide data like the content library, where "which school" does not apply.
create or replace function public.auth_holds(p_perm text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active')
    and not exists (
      select 1 from public.user_permission_overrides o
      where o.user_id = auth.uid() and o.permission_key = p_perm and o.effect = 'deny'
        and o.scope_type = 'platform' and (o.expires_at is null or o.expires_at > now()))
    and (
      exists (
        select 1 from public.user_roles ur
        join public.roles r on r.id = ur.role_id and r.status = 'active'
        join public.role_permissions rp on rp.role_id = r.id and rp.permission_key = p_perm
        where ur.user_id = auth.uid())
      or exists (
        select 1 from public.user_permission_overrides o
        where o.user_id = auth.uid() and o.permission_key = p_perm and o.effect = 'allow'
          and (o.expires_at is null or o.expires_at > now())))
$$;
revoke all on function public.auth_holds(text) from public, anon;
grant execute on function public.auth_holds(text) to authenticated;

do $$
declare t text;
begin
  foreach t in array array['departments', 'skills', 'media_assets', 'passages', 'items', 'item_options', 'lessons',
    'lesson_items', 'cut_scores', 'rubrics', 'ability_priors', 'import_jobs', 'integration_secrets'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;

  -- Catalogue-like content every signed-in user may list (names, levels): departments, skills, cut scores.
  foreach t in array array['departments', 'skills', 'cut_scores'] loop
    execute format($f$create policy %1$s_select on public.%1$I for select to authenticated using (true)$f$, t);
  end loop;

  -- Lessons and media: staff browsing the library, or learners.
  foreach t in array array['lessons', 'lesson_items', 'media_assets', 'passages'] loop
    execute format($f$create policy %1$s_select on public.%1$I for select to authenticated
      using (public.auth_holds('content:view') or public.auth_holds('learning:self'))$f$, t);
  end loop;

  -- Questions hold answer keys: staff with content:view only. Learners get items through
  -- server code in Phase 4 that strips `correct`.
  foreach t in array array['items', 'item_options', 'rubrics', 'ability_priors'] loop
    execute format($f$create policy %1$s_select on public.%1$I for select to authenticated
      using (public.auth_holds('content:view'))$f$, t);
  end loop;

  -- Writes: platform-level content:import (the Owner).
  foreach t in array array['departments', 'skills', 'media_assets', 'passages', 'items', 'item_options', 'lessons',
    'lesson_items', 'cut_scores', 'rubrics', 'ability_priors'] loop
    execute format($f$create policy %1$s_write on public.%1$I for all to authenticated
      using (public.auth_can('content:import', null)) with check (public.auth_can('content:import', null))$f$, t);
  end loop;
end $$;

create policy import_jobs_all on public.import_jobs for all to authenticated
  using (public.auth_can('content:import', null)) with check (public.auth_can('content:import', null));

-- integration_secrets: no policies → only the service role (server code) can read or write.
revoke all on public.integration_secrets from anon, authenticated;

-- Content changes are logged like everything else (Owner sees who imported what).
do $$
declare t text;
begin
  foreach t in array array['departments', 'skills', 'cut_scores', 'import_jobs'] loop
    execute format('create trigger audit after insert or update or delete on public.%I
      for each row execute function public.audit_row()', t);
  end loop;
end $$;
