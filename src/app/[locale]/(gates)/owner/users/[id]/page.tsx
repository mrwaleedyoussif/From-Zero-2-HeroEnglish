import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { AccountCard } from "@/features/users/components/account-card";
import { EffectiveCard } from "@/features/users/components/effective-card";
import { OverridesCard } from "@/features/users/components/overrides-card";
import { RolesCard } from "@/features/users/components/roles-card";
import {
  getUserDetail,
  listPermissions,
  listRoles,
  schoolStructure,
  scopeLabels,
} from "@/features/users/queries";
import { scopeValueSchema } from "@/features/users/schema";
import { scopeOptions } from "@/features/users/scope-options";
import { can, canSomewhere } from "@/lib/auth/can";
import type { Target } from "@/lib/auth/engine";
import { requirePermission } from "@/lib/auth/guard";
import { classTarget, platformTarget } from "@/lib/auth/scope";

export default async function UserPage({
  params,
  searchParams,
}: PageProps<"/[locale]/owner/users/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "users:view", "page.owner.users");
  const detail = await getUserDetail(id);
  if (!detail) notFound();
  const t = await getTranslations("UserDetail");
  const ts = await getTranslations("Scopes");
  const schoolId = detail.profile.school_id;

  const [roles, permissions, structure] = await Promise.all([
    listRoles(),
    listPermissions(),
    schoolId ? schoolStructure(schoolId) : Promise.resolve(null),
  ]);
  const scopeIds = [...detail.roles, ...detail.overrides].flatMap((r) =>
    r.scope_id ? [r.scope_id] : [],
  );
  const labels = await scopeLabels([...scopeIds, ...(structure?.classes.map((c) => c.id) ?? [])]);
  const scopeLabelsT = {
    platform: ts("platform"),
    self: ts("self"),
    school: ts("school"),
    grade: ts("grade"),
    class: ts("class"),
  };
  const platformAllowed = await can(actor, "roles:assign", platformTarget);
  const scopes = scopeOptions(structure, scopeLabelsT, locale, {
    platform: platformAllowed,
    self: true,
  });

  // Where to evaluate the preview: ?at=type:id, default the user's school.
  const at = (await searchParams).at;
  const parsed = scopeValueSchema.safeParse(
    typeof at === "string" ? at : schoolId ? `school:${schoolId}` : "platform:",
  );
  const scope = parsed.success ? parsed.data : { type: "platform" as const, id: null };
  let target: Target = { ...platformTarget, user: id };
  if (scope.type === "school") target = { ...target, school: scope.id };
  if (scope.type === "grade") target = { ...target, school: schoolId, grade: scope.id };
  if (scope.type === "class" && scope.id) target = { ...(await classTarget(scope.id)), user: id };
  const targetOptions = scopeOptions(structure, scopeLabelsT, locale, {
    platform: true,
    self: false,
  });

  const writable = !actor.viewAs;
  const self = actor.real.id === id;
  const [canAssign, canGrant, canViewAs, canDisable, canResetPin] = await Promise.all([
    canSomewhere(actor, "roles:assign"),
    canSomewhere(actor, "permissions:grant"),
    can(actor, "users:impersonate", { userId: id }),
    can(actor, "users:disable", { userId: id }),
    can(actor, "users:reset_pin", { userId: id }),
  ]);

  return (
    <>
      <PageHeader title={detail.profile.full_name} description={t(detail.profile.kind)} />
      <AccountCard
        detail={detail}
        canViewAs={writable && canViewAs && !self}
        canDisable={writable && canDisable && !self}
        canResetPin={writable && canResetPin}
      />
      <RolesCard
        detail={detail}
        roles={roles}
        scopes={scopes}
        labels={labels}
        canEdit={writable && canAssign}
      />
      <OverridesCard
        detail={detail}
        permissions={permissions.map((p) => ({ value: p.key, label: p.key }))}
        scopes={scopes}
        labels={labels}
        canEdit={writable && canGrant}
      />
      <EffectiveCard
        userId={id}
        permissions={permissions}
        target={target}
        targetValue={parsed.success ? `${scope.type}:${scope.id ?? ""}` : "platform:"}
        targetOptions={targetOptions}
        labels={labels}
      />
    </>
  );
}
