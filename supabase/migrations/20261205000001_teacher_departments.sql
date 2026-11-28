-- Teachers open every department and its content, as a learner does: entry to the learning
-- portal and the right to learn there. The Owner can take either away in the Roles matrix.
with g(role_key, perm) as (values ('teacher', 'gate:student'), ('teacher', 'learning:self'))
insert into public.role_permissions (role_id, permission_key)
select r.id, g.perm from g join public.roles r on r.key = g.role_key
on conflict (role_id, permission_key) do nothing;
