-- Core org hierarchy (SPEC §2, §14): Owner → School → Academic year → Grade → Class → Student.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{3,12}$'),
  name_en text not null,
  name_ar text not null,
  timezone text not null default 'Asia/Riyadh',
  week_start smallint not null default 0 check (week_start between 0 and 6), -- 0 = Sunday
  theme jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.academic_years (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  name text not null,
  starts_on date not null,
  ends_on date not null check (ends_on > starts_on),
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, name)
);
create unique index academic_years_one_current on public.academic_years (school_id) where is_current;

create table public.grades (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  code text not null, -- e.g. 'K', '4', '11'
  name_en text not null,
  name_ar text not null,
  sort_order smallint not null default 0,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, code)
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  grade_id uuid not null references public.grades (id) on delete restrict,
  year_id uuid not null references public.academic_years (id) on delete restrict,
  code text not null, -- e.g. '4B'
  name text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (year_id, code)
);
create index classes_school_idx on public.classes (school_id);
create index classes_grade_idx on public.classes (grade_id);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  school_id uuid references public.schools (id) on delete restrict, -- null only for platform staff (Owner)
  kind text not null check (kind in ('staff', 'student')),
  username text check (username ~ '^[a-z0-9][a-z0-9._-]{1,31}$'),
  full_name text not null,
  email text,
  locale text not null default 'en' check (locale in ('en', 'ar')),
  consent boolean not null default false, -- parental consent (SPEC §15)
  consent_at timestamptz,
  status text not null default 'active' check (status in ('active', 'disabled')),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind = 'staff' or (username is not null and school_id is not null))
);
create unique index profiles_school_username on public.profiles (school_id, username) where username is not null;
create index profiles_school_idx on public.profiles (school_id);

create table public.enrolments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  year_id uuid not null references public.academic_years (id) on delete restrict,
  school_id uuid not null references public.schools (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'left')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, class_id)
);
create index enrolments_class_idx on public.enrolments (class_id);
create index enrolments_school_idx on public.enrolments (school_id);

create table public.teaching_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (teacher_id, class_id)
);
create index teaching_assignments_class_idx on public.teaching_assignments (class_id);
create index teaching_assignments_school_idx on public.teaching_assignments (school_id);

do $$
declare t text;
begin
  foreach t in array array['schools','academic_years','grades','classes','profiles','enrolments','teaching_assignments'] loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
