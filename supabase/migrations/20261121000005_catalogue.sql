-- Reference data needed in every environment (production included). Idempotent.
-- The Owner edits roles and grants in the console afterwards; this only sets defaults.

insert into public.permissions (key, module, description_en, description_ar) values
  ('schools:view', 'org', 'View school details', 'عرض بيانات المدرسة'),
  ('schools:manage', 'org', 'Create and edit schools', 'إنشاء المدارس وتعديلها'),
  ('classes:view', 'org', 'View classes and who teaches them', 'عرض الفصول ومعلميها'),
  ('classes:manage', 'org', 'Manage years, grades, classes, enrolments', 'إدارة السنوات والصفوف والفصول والتسجيل'),
  ('users:view', 'users', 'View user profiles', 'عرض ملفات المستخدمين'),
  ('users:create', 'users', 'Create users', 'إنشاء المستخدمين'),
  ('users:edit', 'users', 'Edit user profiles', 'تعديل ملفات المستخدمين'),
  ('users:disable', 'users', 'Disable or re-enable users', 'تعطيل المستخدمين أو إعادة تفعيلهم'),
  ('users:import', 'users', 'Bulk import users from CSV', 'استيراد المستخدمين من ملف CSV'),
  ('users:invite', 'users', 'Invite staff by email', 'دعوة الموظفين عبر البريد'),
  ('users:reset_pin', 'users', 'Reset student PINs and print login cards', 'إعادة تعيين رموز الطلاب وطباعة بطاقات الدخول'),
  ('users:impersonate', 'users', 'View the app as another user (read-only, audited)', 'عرض التطبيق كمستخدم آخر (قراءة فقط، مُسجَّل)'),
  ('roles:view', 'access', 'View roles and permissions', 'عرض الأدوار والصلاحيات'),
  ('roles:manage', 'access', 'Edit roles and the permission matrix', 'تعديل الأدوار ومصفوفة الصلاحيات'),
  ('roles:assign', 'access', 'Assign roles to users', 'إسناد الأدوار للمستخدمين'),
  ('permissions:grant', 'access', 'Grant or deny individual permissions', 'منح صلاحيات فردية أو منعها'),
  ('visibility:manage', 'access', 'Control what is shown to whom', 'التحكم فيما يظهر لكل مستخدم'),
  ('audit:view', 'access', 'View the audit log', 'عرض سجل التدقيق'),
  ('supervision:view', 'supervision', 'View supervision links', 'عرض روابط الإشراف'),
  ('supervision:manage', 'supervision', 'Edit supervision links', 'تعديل روابط الإشراف'),
  ('coaching:log', 'supervision', 'Write coaching logs and observations', 'كتابة سجلات التدريب والملاحظات الصفية'),
  ('students:view', 'students', 'View student learning data', 'عرض بيانات تعلم الطلاب'),
  ('students:edit', 'students', 'Edit learner profiles and annotations', 'تعديل ملفات المتعلمين والملاحظات'),
  ('learning:self', 'learning', 'Use lessons and practice as a learner', 'استخدام الدروس والتدريبات كمتعلم'),
  ('content:view', 'content', 'Browse the content library', 'تصفح مكتبة المحتوى'),
  ('content:import', 'content', 'Import content from Google Sheets', 'استيراد المحتوى من جداول Google'),
  ('lessons:view', 'lessons', 'View lessons', 'عرض الدروس'),
  ('lessons:assign', 'lessons', 'Assign and recommend lessons', 'إسناد الدروس والتوصية بها'),
  ('placement:take', 'placement', 'Take placement tests', 'أداء اختبارات تحديد المستوى'),
  ('placement:view_results', 'placement', 'View placement results', 'عرض نتائج تحديد المستوى'),
  ('placement:retake', 'placement', 'Allow a placement retake', 'السماح بإعادة اختبار تحديد المستوى'),
  ('placement:score', 'placement', 'Score writing and speaking', 'تقييم الكتابة والمحادثة'),
  ('rewards:view', 'rewards', 'View rewards and leaderboards', 'عرض المكافآت ولوحات الصدارة'),
  ('rewards:grant', 'rewards', 'Give kudos and manage class rewards', 'منح الإشادات وإدارة مكافآت الفصل'),
  ('rewards:approve_redemptions', 'rewards', 'Approve reward redemptions', 'الموافقة على استبدال المكافآت'),
  ('reports:view', 'reports', 'View reports', 'عرض التقارير'),
  ('reports:receive:weekly', 'reports', 'Receive the weekly report', 'استلام التقرير الأسبوعي'),
  ('reports:receive:monthly', 'reports', 'Receive the monthly report', 'استلام التقرير الشهري'),
  ('billing:manage', 'billing', 'Manage plans and billing', 'إدارة الخطط والفوترة')
on conflict (key) do update set module = excluded.module,
  description_en = excluded.description_en, description_ar = excluded.description_ar;

insert into public.roles (key, name_en, name_ar, default_scope_type, is_system, status) values
  ('owner', 'Owner', 'المالك', 'platform', true, 'active'),
  ('principal', 'Principal', 'مدير المدرسة', 'school', true, 'active'),
  ('academic_vp', 'Academic vice principal', 'الوكيل الأكاديمي', 'school', true, 'active'),
  ('vp', 'Vice principal', 'الوكيل', 'school', true, 'active'),
  ('coach', 'Academic coach', 'المدرب الأكاديمي', 'school', true, 'active'),
  ('teacher', 'Teacher', 'المعلم', 'class', true, 'active'),
  ('student', 'Student', 'الطالب', 'self', true, 'active'),
  ('parent', 'Parent', 'ولي الأمر', 'self', true, 'disabled') -- v1: schema only (SPEC §17)
on conflict (key) do nothing;

-- Default grants. Only inserted when missing, so the Owner's later edits are kept.
with grants(role_key, perms) as (values
  ('owner', null::text[]), -- null = every permission
  ('principal', array['schools:view','classes:view','classes:manage','users:view','users:create','users:edit',
    'users:disable','users:import','users:invite','users:reset_pin','roles:view','roles:assign','supervision:view',
    'supervision:manage','audit:view','students:view','content:view','lessons:view','placement:view_results',
    'reports:view','reports:receive:weekly','reports:receive:monthly','rewards:view','coaching:log',
    -- superset of in-school roles so a principal can assign them (anti-escalation rule)
    'students:edit','lessons:assign','placement:retake','placement:score','placement:take','learning:self',
    'rewards:grant','rewards:approve_redemptions']),
  ('academic_vp', array['schools:view','classes:view','users:view','students:view','supervision:view','coaching:log',
    'content:view','lessons:view','lessons:assign','placement:view_results','placement:retake','reports:view',
    'reports:receive:weekly','reports:receive:monthly','rewards:view']),
  ('vp', array['schools:view','classes:view','users:view','users:reset_pin','students:view','supervision:view',
    'lessons:view','placement:view_results','reports:view','reports:receive:weekly','rewards:view']),
  ('coach', array['schools:view','classes:view','users:view','supervision:view','coaching:log','content:view',
    'lessons:view','placement:view_results','reports:view','reports:receive:weekly']),
  ('teacher', array['classes:view','users:view','users:reset_pin','students:view','students:edit','content:view',
    'lessons:view','lessons:assign','placement:view_results','placement:retake','placement:score','rewards:view',
    'rewards:grant','rewards:approve_redemptions','reports:view','reports:receive:weekly']),
  ('student', array['learning:self','placement:take','rewards:view'])
)
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
from grants g
join public.roles r on r.key = g.role_key
join public.permissions p on g.perms is null or p.key = any (g.perms)
on conflict (role_id, permission_key) do nothing;

-- Default supervision graph (SPEC §2). Coaches get teachers assigned by hand.
with d(sup, sub, kind) as (values
  ('principal', 'academic_vp', 'line'), ('principal', 'vp', 'line'), ('principal', 'coach', 'line'),
  ('principal', 'teacher', 'line'), ('academic_vp', 'coach', 'academic'), ('academic_vp', 'teacher', 'academic'),
  ('vp', 'teacher', 'line')
)
insert into public.supervision_defaults (supervisor_role_id, supervisee_role_id, kind)
select a.id, b.id, d.kind from d
join public.roles a on a.key = d.sup
join public.roles b on b.key = d.sub
on conflict (supervisor_role_id, supervisee_role_id) do nothing;
