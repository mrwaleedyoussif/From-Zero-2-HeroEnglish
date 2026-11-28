-- A teacher recommends a course unit (a lesson of any department) to one student, a group or a
-- whole class. The student gets a notice, sees it on their home page, and may open the unit
-- even when it is further along than the units they have reached.
create table public.unit_recommendations (
  id uuid primary key default gen_random_uuid(),
  unit_id text not null references public.course_units (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  class_id uuid references public.classes (id) on delete set null,
  recommended_by uuid references public.profiles (id) on delete set null,
  note text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now(),
  unique (unit_id, student_id)
);
create index unit_recommendations_student_idx on public.unit_recommendations (student_id, created_at desc);
alter table public.unit_recommendations enable row level security;
create policy unit_recommendations_select on public.unit_recommendations for select to authenticated
  using (student_id = auth.uid() or recommended_by = auth.uid()
    or public.auth_can_user('students:view', student_id));

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('assignment', 'due_soon', 'badge', 'report', 'kudos', 'level_up', 'redemption',
    'message', 'recommendation'));

-- Targets: [{type: 'class'|'group'|'student', id}], all inside p_class. Returns how many
-- students were reached. Needs lessons:assign on the class, as setting a lesson does.
create or replace function public.recommend_unit(p_class uuid, p_unit text, p_targets jsonb, p_note text)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_school uuid;
  v_title text;
  v_strand text;
  v_to uuid[];
begin
  select c.school_id into v_school from public.classes c where c.id = p_class;
  if v_school is null or not public.auth_can('lessons:assign', v_school, p_class) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select u.title, u.strand into v_title, v_strand from public.course_units u
    where u.id = p_unit and u.status = 'active';
  if v_title is null then
    raise exception 'unit not available' using errcode = '23503';
  end if;
  if jsonb_typeof(p_targets) <> 'array' or jsonb_array_length(p_targets) not between 1 and 200 then
    raise exception 'no targets' using errcode = '23514';
  end if;

  select array_agg(distinct e.student_id) into v_to from public.enrolments e
  where e.class_id = p_class and e.status = 'active' and exists (
    select 1 from jsonb_array_elements(p_targets) t where
      (t->>'type' = 'class' and (t->>'id')::uuid = p_class)
      or (t->>'type' = 'student' and (t->>'id')::uuid = e.student_id)
      or (t->>'type' = 'group' and exists (select 1 from public.group_members m
        join public.groups g on g.id = m.group_id
        where g.id = (t->>'id')::uuid and g.class_id = p_class and m.student_id = e.student_id)));
  if coalesce(cardinality(v_to), 0) = 0 then
    raise exception 'nobody to recommend to' using errcode = '23514';
  end if;

  delete from public.unit_recommendations r where r.unit_id = p_unit and r.student_id = any(v_to);
  insert into public.unit_recommendations (unit_id, student_id, school_id, class_id, recommended_by, note)
  select p_unit, s, v_school, p_class, auth.uid(), nullif(trim(coalesce(p_note, '')), '') from unnest(v_to) s;
  insert into public.notifications (user_id, school_id, kind, params, href)
  select s, v_school, 'recommendation',
    jsonb_build_object('unit', v_title,
      'from', (select full_name from public.profiles where id = auth.uid())),
    '/student/units/' || v_strand || '/' || p_unit
  from unnest(v_to) s;
  return cardinality(v_to);
end $$;
revoke all on function public.recommend_unit(uuid, text, jsonb, text) from public, anon;
grant execute on function public.recommend_unit(uuid, text, jsonb, text) to authenticated;
