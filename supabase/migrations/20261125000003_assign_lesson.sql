-- Phase 5: assign a lesson in one transaction (SPEC §9). Checks lessons:assign on the class,
-- expands targets (students / groups / teams / whole class) to active students of that class,
-- creates progress rows and an in-app notification for each student.

create or replace function public.assign_lesson(
  p_class uuid, p_lesson uuid, p_targets jsonb, p_due timestamptz, p_note text, p_required boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_school uuid;
  v_id uuid;
  v_count integer;
begin
  select c.school_id into v_school from public.classes c where c.id = p_class;
  if v_school is null or not public.auth_can('lessons:assign', v_school, p_class) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from public.lessons l where l.id = p_lesson and l.status = 'active') then
    raise exception 'lesson not available' using errcode = '23503';
  end if;
  if jsonb_typeof(p_targets) <> 'array' or jsonb_array_length(p_targets) = 0 then
    raise exception 'no targets' using errcode = '23514';
  end if;

  insert into public.assignments (school_id, class_id, lesson_id, created_by, note, due_at, required)
  values (v_school, p_class, p_lesson, auth.uid(), nullif(trim(p_note), ''), p_due, coalesce(p_required, true))
  returning id into v_id;

  insert into public.assignment_targets (assignment_id, target_type, target_id)
  select v_id, t->>'type', (t->>'id')::uuid from jsonb_array_elements(p_targets) t
  on conflict do nothing;

  -- Recipients: active students of this class reached by any target.
  with recipients as (
    select e.student_id from public.enrolments e
    join public.assignment_targets t on t.assignment_id = v_id
    where e.class_id = p_class and e.status = 'active' and (
      (t.target_type = 'class' and t.target_id = p_class)
      or (t.target_type = 'student' and t.target_id = e.student_id)
      or (t.target_type = 'group' and exists (select 1 from public.group_members m
        join public.groups g on g.id = m.group_id
        where g.id = t.target_id and g.class_id = p_class and m.student_id = e.student_id))
      or (t.target_type = 'team' and exists (select 1 from public.team_members m
        join public.teams g on g.id = m.team_id
        where g.id = t.target_id and g.class_id = p_class and m.student_id = e.student_id)))
  ), inserted as (
    insert into public.assignment_progress (assignment_id, student_id, school_id)
    select distinct v_id, r.student_id, v_school from recipients r
    on conflict do nothing
    returning student_id
  ), notified as (
    insert into public.notifications (user_id, school_id, kind, params, href)
    select i.student_id, v_school, 'assignment',
      jsonb_build_object('lesson_id', p_lesson, 'assignment_id', v_id, 'due_at', p_due),
      '/student/lessons'
    from inserted i
    returning 1
  )
  select count(*) into v_count from notified;

  if v_count = 0 then
    raise exception 'no students in the chosen targets' using errcode = '23514';
  end if;
  return v_id;
end $$;

revoke all on function public.assign_lesson(uuid, uuid, jsonb, timestamptz, text, boolean) from public, anon;
grant execute on function public.assign_lesson(uuid, uuid, jsonb, timestamptz, text, boolean) to authenticated;

-- Onboarding wizard options (Owner-editable). Interest keys match lesson tags.
insert into public.profile_options (kind, key, name_en, name_ar, emoji, reverse_scored, sort_order) values
  ('interest', 'sports', 'Sports', 'الرياضة', '⚽', false, 1),
  ('interest', 'gaming', 'Games', 'الألعاب', '🎮', false, 2),
  ('interest', 'art', 'Art', 'الفن', '🎨', false, 3),
  ('interest', 'science', 'Science', 'العلوم', '🔬', false, 4),
  ('interest', 'music', 'Music', 'الموسيقى', '🎵', false, 5),
  ('interest', 'travel', 'Travel', 'السفر', '✈️', false, 6),
  ('interest', 'animals', 'Animals', 'الحيوانات', '🐾', false, 7),
  ('interest', 'food', 'Food', 'الطعام', '🍎', false, 8),
  ('interest', 'school', 'School life', 'الحياة المدرسية', '🏫', false, 9),
  ('interest', 'daily life', 'Daily life', 'الحياة اليومية', '🏠', false, 10),
  ('goal', 'school', 'Do well at school', 'التفوق في المدرسة', '📚', false, 1),
  ('goal', 'exam', 'Pass an exam', 'النجاح في اختبار', '📝', false, 2),
  ('goal', 'fun', 'Have fun with English', 'الاستمتاع بالإنجليزية', '😊', false, 3),
  ('goal', 'travel', 'Talk when I travel', 'التحدث عند السفر', '🌍', false, 4),
  ('format', 'video', 'Videos', 'الفيديو', '🎬', false, 1),
  ('format', 'audio', 'Listening', 'الاستماع', '🎧', false, 2),
  ('format', 'reading', 'Reading', 'القراءة', '📖', false, 3),
  ('format', 'game', 'Games', 'الألعاب', '🕹️', false, 4),
  ('format', 'interactive', 'Hands-on practice', 'التدريب العملي', '✋', false, 5),
  ('accommodation', 'extra_time', 'Extra time', 'وقت إضافي', '⏳', false, 1),
  ('accommodation', 'audio_support', 'Read aloud to me', 'اقرأ لي بصوت عالٍ', '🔊', false, 2),
  ('accommodation', 'dyslexia_font', 'Easy-to-read font', 'خط سهل القراءة', '🔤', false, 3),
  ('mindset', 'm1', 'I can get better at English if I practise.', 'يمكنني أن أتحسن في الإنجليزية إذا تدربت.', null, false, 1),
  ('mindset', 'm2', 'Mistakes help me learn.', 'الأخطاء تساعدني على التعلم.', null, false, 2),
  ('mindset', 'm3', 'Some people are just bad at languages.', 'بعض الناس ببساطة ضعفاء في اللغات.', null, true, 3),
  ('mindset', 'm4', 'When something is hard, I try a new way.', 'عندما يكون شيء صعبًا أجرب طريقة جديدة.', null, false, 4),
  ('mindset', 'm5', 'If I need help, I am not smart.', 'إذا احتجت مساعدة فأنا لست ذكيًا.', null, true, 5)
on conflict (kind, key) do nothing;
