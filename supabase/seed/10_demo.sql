-- Demo data for local development and tests. NEVER run in production.
-- IDs are deterministic (md5 of a label) so tests and docs can refer to them.
-- Staff sign in with a magic link (local emails appear in Mailpit, http://127.0.0.1:54324).
-- Students sign in at /student-login with school code RIY01, their username and PIN 246810.

create or replace function pg_temp.demo_id(label text) returns uuid
language sql immutable as $$ select md5('linguapath-demo:' || label)::uuid $$;

create or replace function pg_temp.demo_user(
  label text, email text, full_name text, kind text, school uuid, username text, pin text
) returns uuid language plpgsql as $$
declare uid uuid := pg_temp.demo_id(label);
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current,
    phone_change, phone_change_token, reauthentication_token)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', email,
    case when pin is null then '' else crypt(pin, gen_salt('bf')) end, now(),
    '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', full_name), now(), now(),
    '', '', '', '', '', '', '', '')
  on conflict (id) do nothing;
  insert into auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at, last_sign_in_at)
  values (uid, uid, uid::text, 'email', jsonb_build_object('sub', uid::text, 'email', email, 'email_verified', true),
    now(), now(), now())
  on conflict do nothing;
  insert into public.profiles (id, school_id, kind, username, full_name, email, locale, consent, consent_at)
  values (uid, school, kind, username, full_name, case when kind = 'staff' then email end,
    case when kind = 'student' then 'ar' else 'en' end, kind = 'student', case when kind = 'student' then now() end)
  on conflict (id) do nothing;
  return uid;
end $$;

create or replace function pg_temp.grant_role(usr uuid, role_key text, scope_type text, scope_id uuid)
returns void language sql as $$
  insert into public.user_roles (user_id, role_id, scope_type, scope_id)
  select usr, r.id, scope_type, scope_id from public.roles r where r.key = role_key
  on conflict do nothing
$$;

do $$
declare
  school uuid := pg_temp.demo_id('school:RIY01');
  yr uuid := pg_temp.demo_id('year:RIY01:2026-2027');
  g4 uuid := pg_temp.demo_id('grade:RIY01:4');
  c4a uuid := pg_temp.demo_id('class:RIY01:4A');
  c4b uuid := pg_temp.demo_id('class:RIY01:4B');
  teacher uuid;
  names text[] := array['Sara Khalid','Omar Saleh','Lama Fahad','Yousef Nasser','Noura Ali','Faisal Hamad',
    'Reem Saad','Khalid Majed','Haya Turki','Abdullah Zaid','Jana Ahmed','Saud Ibrahim','Dana Waleed',
    'Hamza Adel','Layan Sami','Rakan Bader','Maha Talal','Ziyad Mansour','Joud Hassan','Tariq Nawaf'];
  i int;
  stu uuid;
  cls uuid;
begin
  insert into public.schools (id, code, name_en, name_ar)
  values (school, 'RIY01', 'Riyadh Demo School', 'مدرسة الرياض التجريبية') on conflict do nothing;
  insert into public.academic_years (id, school_id, name, starts_on, ends_on, is_current)
  values (yr, school, '2026-2027', '2026-08-23', '2027-06-17', true) on conflict do nothing;
  for i in 1..6 loop
    insert into public.grades (id, school_id, code, name_en, name_ar, sort_order)
    values (pg_temp.demo_id('grade:RIY01:' || i), school, i::text, 'Grade ' || i, 'الصف ' || i, i)
    on conflict do nothing;
  end loop;
  insert into public.classes (id, school_id, grade_id, year_id, code, name) values
    (c4a, school, g4, yr, '4A', 'Grade 4 A'), (c4b, school, g4, yr, '4B', 'Grade 4 B') on conflict do nothing;

  perform pg_temp.grant_role(pg_temp.demo_user('owner', 'owner@demo.linguapath.test', 'Demo Owner', 'staff', null, null, null),
    'owner', 'platform', null);
  perform pg_temp.grant_role(pg_temp.demo_user('principal', 'principal@demo.linguapath.test', 'Demo Principal', 'staff', school, null, null),
    'principal', 'school', school);
  perform pg_temp.grant_role(pg_temp.demo_user('academic_vp', 'academic.vp@demo.linguapath.test', 'Demo Academic VP', 'staff', school, null, null),
    'academic_vp', 'school', school);
  perform pg_temp.grant_role(pg_temp.demo_user('vp', 'vp@demo.linguapath.test', 'Demo Vice Principal', 'staff', school, null, null),
    'vp', 'school', school);
  perform pg_temp.grant_role(pg_temp.demo_user('coach', 'coach@demo.linguapath.test', 'Demo Coach', 'staff', school, null, null),
    'coach', 'school', school);

  -- The demo teacher teaches 4A only, so 4B students must stay invisible to them.
  teacher := pg_temp.demo_user('teacher', 'teacher@demo.linguapath.test', 'Demo Teacher', 'staff', school, null, null);
  insert into public.teaching_assignments (teacher_id, class_id, school_id) values (teacher, c4a, school) on conflict do nothing;
  perform pg_temp.grant_role(teacher, 'teacher', 'class', c4a);
  -- A second teacher for 4B (visibility and isolation tests compare the two).
  teacher := pg_temp.demo_user('teacher4b', 'teacher.4b@demo.linguapath.test', 'Demo Teacher 4B', 'staff', school, null, null);
  insert into public.teaching_assignments (teacher_id, class_id, school_id) values (teacher, c4b, school) on conflict do nothing;
  perform pg_temp.grant_role(teacher, 'teacher', 'class', c4b);
  teacher := pg_temp.demo_id('teacher');

  for i in 1..20 loop
    cls := case when i <= 10 then c4a else c4b end;
    stu := pg_temp.demo_user('student:' || i,
      lower(replace(split_part(names[i], ' ', 1) || '.' || left(split_part(names[i], ' ', 2), 1), ' ', '')) || '@riy01.students.local',
      names[i], 'student', school,
      lower(split_part(names[i], ' ', 1) || '.' || left(split_part(names[i], ' ', 2), 1)), '246810');
    insert into public.enrolments (student_id, class_id, year_id, school_id) values (stu, cls, yr, school) on conflict do nothing;
    perform pg_temp.grant_role(stu, 'student', 'self', null);
  end loop;

  -- Coach supports the demo teacher (coaches are linked by hand, not by default).
  insert into public.supervision_links (supervisor_id, supervisee_id, school_id, kind, source)
  values (pg_temp.demo_id('coach'), teacher, school, 'coaching', 'manual') on conflict do nothing;
  perform public.apply_supervision_defaults(school);
end $$;

-- Demo only: the placement test is off by default (registry); the demo shows it so it can be tested.
insert into public.visibility_rules (target_key, subject_type, subject_id, effect, note)
select 'module.placement', 'plan', p.id, 'show', 'demo: placement test on'
from public.plans p where p.key = 'free';
