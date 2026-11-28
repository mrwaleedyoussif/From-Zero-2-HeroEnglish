-- Handwriting (print and cursive): the steps from letters to paragraphs, and each learner's best
-- tracing and writing marks. The order follows the Owner's cursive booklet (letters, joined
-- letters, words), then sentences and paragraphs. Also: a free trial for general learners.
create table public.handwriting_steps (
  id text primary key check (id ~ '^[LJWSP]-[a-z0-9]{1,12}$'),
  stage text not null check (stage in ('letters', 'joins', 'words', 'sentences', 'paragraphs')),
  sort_order integer not null,
  text text not null check (char_length(text) between 1 and 400),
  styles text[] not null default '{print,cursive}',
  status text not null default 'active' check (status in ('active', 'retired'))
);
create table public.handwriting_progress (
  student_id uuid not null references public.profiles (id) on delete cascade,
  school_id uuid references public.schools (id) on delete cascade,
  step_id text not null references public.handwriting_steps (id) on delete cascade,
  style text not null check (style in ('print', 'cursive')),
  mode text not null check (mode in ('trace', 'write')),
  best smallint not null check (best between 0 and 100),
  tries integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (student_id, step_id, style, mode)
);
create index handwriting_progress_school_idx on public.handwriting_progress (school_id);
alter table public.handwriting_steps enable row level security;
alter table public.handwriting_progress enable row level security;
create policy handwriting_steps_select on public.handwriting_steps for select to authenticated using (true);
create policy handwriting_steps_write on public.handwriting_steps for all to authenticated
  using (public.auth_can('content:import', null)) with check (public.auth_can('content:import', null));
create policy handwriting_progress_select on public.handwriting_progress for select to authenticated
  using (student_id = auth.uid() or public.auth_can_user('students:view', student_id));
create policy handwriting_progress_insert on public.handwriting_progress for insert to authenticated
  with check (student_id = auth.uid() and school_id is not distinct from public.my_school_id());
create policy handwriting_progress_update on public.handwriting_progress for update to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());

insert into public.handwriting_steps (id, stage, sort_order, text, styles) values
  ('L-a', 'letters', 1, 'Aa', '{print,cursive}'), ('L-b', 'letters', 2, 'Bb', '{print,cursive}'), ('L-c', 'letters', 3, 'Cc', '{print,cursive}'),
  ('L-d', 'letters', 4, 'Dd', '{print,cursive}'), ('L-e', 'letters', 5, 'Ee', '{print,cursive}'), ('L-f', 'letters', 6, 'Ff', '{print,cursive}'),
  ('L-g', 'letters', 7, 'Gg', '{print,cursive}'), ('L-h', 'letters', 8, 'Hh', '{print,cursive}'), ('L-i', 'letters', 9, 'Ii', '{print,cursive}'),
  ('L-j', 'letters', 10, 'Jj', '{print,cursive}'), ('L-k', 'letters', 11, 'Kk', '{print,cursive}'), ('L-l', 'letters', 12, 'Ll', '{print,cursive}'),
  ('L-m', 'letters', 13, 'Mm', '{print,cursive}'), ('L-n', 'letters', 14, 'Nn', '{print,cursive}'), ('L-o', 'letters', 15, 'Oo', '{print,cursive}'),
  ('L-p', 'letters', 16, 'Pp', '{print,cursive}'), ('L-q', 'letters', 17, 'Qq', '{print,cursive}'), ('L-r', 'letters', 18, 'Rr', '{print,cursive}'),
  ('L-s', 'letters', 19, 'Ss', '{print,cursive}'), ('L-t', 'letters', 20, 'Tt', '{print,cursive}'), ('L-u', 'letters', 21, 'Uu', '{print,cursive}'),
  ('L-v', 'letters', 22, 'Vv', '{print,cursive}'), ('L-w', 'letters', 23, 'Ww', '{print,cursive}'), ('L-x', 'letters', 24, 'Xx', '{print,cursive}'),
  ('L-y', 'letters', 25, 'Yy', '{print,cursive}'), ('L-z', 'letters', 26, 'Zz', '{print,cursive}'), ('J-as', 'joins', 27, 'as', '{cursive}'),
  ('J-ea', 'joins', 28, 'ea', '{cursive}'), ('J-ed', 'joins', 29, 'ed', '{cursive}'), ('J-igh', 'joins', 30, 'igh', '{cursive}'),
  ('J-ing', 'joins', 31, 'ing', '{cursive}'), ('J-ng', 'joins', 32, 'ng', '{cursive}'), ('J-squ', 'joins', 33, 'squ', '{cursive}'),
  ('J-ss', 'joins', 34, 'ss', '{cursive}'), ('J-ai', 'joins', 35, 'ai', '{cursive}'), ('J-ar', 'joins', 36, 'ar', '{cursive}'),
  ('J-au', 'joins', 37, 'au', '{cursive}'), ('J-aw', 'joins', 38, 'aw', '{cursive}'), ('J-ay', 'joins', 39, 'ay', '{cursive}'),
  ('J-ck', 'joins', 40, 'ck', '{cursive}'), ('J-ch', 'joins', 41, 'ch', '{cursive}'), ('J-er', 'joins', 42, 'er', '{cursive}'),
  ('J-ew', 'joins', 43, 'ew', '{cursive}'), ('J-ff', 'joins', 44, 'ff', '{cursive}'), ('J-ll', 'joins', 45, 'll', '{cursive}'),
  ('J-ir', 'joins', 46, 'ir', '{cursive}'), ('J-kn', 'joins', 47, 'kn', '{cursive}'), ('J-qu', 'joins', 48, 'qu', '{cursive}'),
  ('J-ur', 'joins', 49, 'ur', '{cursive}'), ('J-sh', 'joins', 50, 'sh', '{cursive}'), ('J-th', 'joins', 51, 'th', '{cursive}'),
  ('J-ae', 'joins', 52, 'ae', '{cursive}'), ('J-be', 'joins', 53, 'be', '{cursive}'), ('J-de', 'joins', 54, 'de', '{cursive}'),
  ('J-ee', 'joins', 55, 'ee', '{cursive}'), ('J-fe', 'joins', 56, 'fe', '{cursive}'), ('J-ge', 'joins', 57, 'ge', '{cursive}'),
  ('J-ie', 'joins', 58, 'ie', '{cursive}'), ('J-pe', 'joins', 59, 'pe', '{cursive}'), ('J-se', 'joins', 60, 'se', '{cursive}'),
  ('J-ue', 'joins', 61, 'ue', '{cursive}'), ('J-ere', 'joins', 62, 'ere', '{cursive}'), ('J-ure', 'joins', 63, 'ure', '{cursive}'),
  ('J-oe', 'joins', 64, 'oe', '{cursive}'), ('J-re', 'joins', 65, 're', '{cursive}'), ('J-ve', 'joins', 66, 've', '{cursive}'),
  ('J-we', 'joins', 67, 'we', '{cursive}'), ('J-oa', 'joins', 68, 'oa', '{cursive}'), ('J-oh', 'joins', 69, 'oh', '{cursive}'),
  ('J-oi', 'joins', 70, 'oi', '{cursive}'), ('J-on', 'joins', 71, 'on', '{cursive}'), ('J-oo', 'joins', 72, 'oo', '{cursive}'),
  ('J-op', 'joins', 73, 'op', '{cursive}'), ('J-or', 'joins', 74, 'or', '{cursive}'), ('J-ou', 'joins', 75, 'ou', '{cursive}'),
  ('J-ov', 'joins', 76, 'ov', '{cursive}'), ('J-ow', 'joins', 77, 'ow', '{cursive}'), ('W-a1', 'words', 78, 'apple', '{print,cursive}'),
  ('W-a2', 'words', 79, 'ant', '{print,cursive}'), ('W-a3', 'words', 80, 'and', '{print,cursive}'), ('W-b1', 'words', 81, 'ball', '{print,cursive}'),
  ('W-b2', 'words', 82, 'bed', '{print,cursive}'), ('W-b3', 'words', 83, 'book', '{print,cursive}'), ('W-c1', 'words', 84, 'cat', '{print,cursive}'),
  ('W-c2', 'words', 85, 'cup', '{print,cursive}'), ('W-c3', 'words', 86, 'car', '{print,cursive}'), ('W-d1', 'words', 87, 'dog', '{print,cursive}'),
  ('W-d2', 'words', 88, 'door', '{print,cursive}'), ('W-d3', 'words', 89, 'day', '{print,cursive}'), ('W-e1', 'words', 90, 'egg', '{print,cursive}'),
  ('W-e2', 'words', 91, 'eye', '{print,cursive}'), ('W-e3', 'words', 92, 'ear', '{print,cursive}'), ('W-f1', 'words', 93, 'fish', '{print,cursive}'),
  ('W-f2', 'words', 94, 'farm', '{print,cursive}'), ('W-f3', 'words', 95, 'five', '{print,cursive}'), ('W-g1', 'words', 96, 'goat', '{print,cursive}'),
  ('W-g2', 'words', 97, 'girl', '{print,cursive}'), ('W-g3', 'words', 98, 'green', '{print,cursive}'), ('W-h1', 'words', 99, 'hat', '{print,cursive}'),
  ('W-h2', 'words', 100, 'hand', '{print,cursive}'), ('W-h3', 'words', 101, 'home', '{print,cursive}'), ('W-i1', 'words', 102, 'ink', '{print,cursive}'),
  ('W-i2', 'words', 103, 'ice', '{print,cursive}'), ('W-i3', 'words', 104, 'idea', '{print,cursive}'), ('W-j1', 'words', 105, 'jam', '{print,cursive}'),
  ('W-j2', 'words', 106, 'jump', '{print,cursive}'), ('W-j3', 'words', 107, 'juice', '{print,cursive}'), ('W-k1', 'words', 108, 'kite', '{print,cursive}'),
  ('W-k2', 'words', 109, 'king', '{print,cursive}'), ('W-k3', 'words', 110, 'key', '{print,cursive}'), ('W-l1', 'words', 111, 'lamp', '{print,cursive}'),
  ('W-l2', 'words', 112, 'leaf', '{print,cursive}'), ('W-l3', 'words', 113, 'lion', '{print,cursive}'), ('W-m1', 'words', 114, 'moon', '{print,cursive}'),
  ('W-m2', 'words', 115, 'milk', '{print,cursive}'), ('W-m3', 'words', 116, 'map', '{print,cursive}'), ('W-n1', 'words', 117, 'nest', '{print,cursive}'),
  ('W-n2', 'words', 118, 'nose', '{print,cursive}'), ('W-n3', 'words', 119, 'nine', '{print,cursive}'), ('W-o1', 'words', 120, 'orange', '{print,cursive}'),
  ('W-o2', 'words', 121, 'owl', '{print,cursive}'), ('W-o3', 'words', 122, 'open', '{print,cursive}'), ('W-p1', 'words', 123, 'pen', '{print,cursive}'),
  ('W-p2', 'words', 124, 'park', '{print,cursive}'), ('W-p3', 'words', 125, 'pink', '{print,cursive}'), ('W-q1', 'words', 126, 'queen', '{print,cursive}'),
  ('W-q2', 'words', 127, 'quiet', '{print,cursive}'), ('W-q3', 'words', 128, 'quick', '{print,cursive}'), ('W-r1', 'words', 129, 'rain', '{print,cursive}'),
  ('W-r2', 'words', 130, 'red', '{print,cursive}'), ('W-r3', 'words', 131, 'road', '{print,cursive}'), ('W-s1', 'words', 132, 'sun', '{print,cursive}'),
  ('W-s2', 'words', 133, 'sea', '{print,cursive}'), ('W-s3', 'words', 134, 'star', '{print,cursive}'), ('W-t1', 'words', 135, 'tree', '{print,cursive}'),
  ('W-t2', 'words', 136, 'table', '{print,cursive}'), ('W-t3', 'words', 137, 'ten', '{print,cursive}'), ('W-u1', 'words', 138, 'umbrella', '{print,cursive}'),
  ('W-u2', 'words', 139, 'up', '{print,cursive}'), ('W-u3', 'words', 140, 'under', '{print,cursive}'), ('W-v1', 'words', 141, 'van', '{print,cursive}'),
  ('W-v2', 'words', 142, 'vase', '{print,cursive}'), ('W-v3', 'words', 143, 'visit', '{print,cursive}'), ('W-w1', 'words', 144, 'water', '{print,cursive}'),
  ('W-w2', 'words', 145, 'wind', '{print,cursive}'), ('W-w3', 'words', 146, 'week', '{print,cursive}'), ('W-x1', 'words', 147, 'box', '{print,cursive}'),
  ('W-x2', 'words', 148, 'fox', '{print,cursive}'), ('W-x3', 'words', 149, 'six', '{print,cursive}'), ('W-y1', 'words', 150, 'yellow', '{print,cursive}'),
  ('W-y2', 'words', 151, 'year', '{print,cursive}'), ('W-y3', 'words', 152, 'young', '{print,cursive}'), ('W-z1', 'words', 153, 'zoo', '{print,cursive}'),
  ('W-z2', 'words', 154, 'zero', '{print,cursive}'), ('W-z3', 'words', 155, 'zebra', '{print,cursive}'),
  ('S-01', 'sentences', 156, 'I am a student.', '{print,cursive}'),
  ('S-02', 'sentences', 157, 'This is my book.', '{print,cursive}'),
  ('S-03', 'sentences', 158, 'The cat is on the mat.', '{print,cursive}'),
  ('S-04', 'sentences', 159, 'I like to read and write.', '{print,cursive}'),
  ('S-05', 'sentences', 160, 'My school is big and clean.', '{print,cursive}'),
  ('S-06', 'sentences', 161, 'We play football after school.', '{print,cursive}'),
  ('S-07', 'sentences', 162, 'She has a red pen and a blue bag.', '{print,cursive}'),
  ('S-08', 'sentences', 163, 'The sun is hot in the summer.', '{print,cursive}'),
  ('S-09', 'sentences', 164, 'I drink water every morning.', '{print,cursive}'),
  ('S-10', 'sentences', 165, 'My father drives a white car.', '{print,cursive}'),
  ('S-11', 'sentences', 166, 'We visit our family on Friday.', '{print,cursive}'),
  ('S-12', 'sentences', 167, 'He can swim, but he cannot ride a horse.', '{print,cursive}'),
  ('S-13', 'sentences', 168, 'Please open the door and sit down.', '{print,cursive}'),
  ('S-14', 'sentences', 169, 'What is your name, and where do you live?', '{print,cursive}'),
  ('S-15', 'sentences', 170, 'The quick brown fox jumps over the lazy dog.', '{print,cursive}'),
  ('S-16', 'sentences', 171, 'Reading every day makes my English better.', '{print,cursive}'),
  ('S-17', 'sentences', 172, 'I always do my homework before dinner.', '{print,cursive}'),
  ('S-18', 'sentences', 173, 'Good handwriting is clear, neat and easy to read.', '{print,cursive}'),
  ('P-01', 'paragraphs', 174, 'My name is Omar. I am ten years old. I live in a small house with my family. I like my school very much.', '{print,cursive}'),
  ('P-02', 'paragraphs', 175, 'Every morning I wake up early. I wash my face and eat breakfast. Then I take my bag and go to school by bus.', '{print,cursive}'),
  ('P-03', 'paragraphs', 176, 'My best friend is Ali. He is kind and funny. We sit together in class. After school we play football in the park.', '{print,cursive}'),
  ('P-04', 'paragraphs', 177, 'I like the winter. The weather is cool and the sky is grey. Sometimes it rains. I wear a warm jacket and drink hot tea.', '{print,cursive}'),
  ('P-05', 'paragraphs', 178, 'On Friday we visit my grandfather. He tells us old stories. My grandmother cooks rice and chicken. It is my favourite day.', '{print,cursive}'),
  ('P-06', 'paragraphs', 179, 'I want to write well. I hold my pen gently and sit up straight. I write slowly, keep my letters the same size and leave a space between words.', '{print,cursive}')
on conflict (id) do nothing;

-- A general learner on a free trial is let in at once; when the trial ends the account waits
-- for the Owner again. Null = no trial.
alter table public.learner_requests add column trial_ends_at timestamptz;
