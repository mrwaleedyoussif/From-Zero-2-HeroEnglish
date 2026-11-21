import { getTranslations, setRequestLocale } from "next-intl/server";
import { FormRow, SelectField, TextField } from "@/components/field";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listSchools } from "@/features/schools/queries";
import { CreateStudentCard, InviteStaffCard } from "@/features/users/components/add-people";
import { listRoles, listUsers, schoolStructure } from "@/features/users/queries";
import { Link } from "@/i18n/navigation";
import { can } from "@/lib/auth/can";
import { requirePermission } from "@/lib/auth/guard";
import { platformTarget, schoolTarget } from "@/lib/auth/scope";
import { localName } from "@/lib/i18n-names";

export default async function UsersPage({
  params,
  searchParams,
}: PageProps<"/[locale]/owner/users">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const actor = await requirePermission(locale, "users:view", "page.owner.users");
  const t = await getTranslations("Users");
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);
  const school = str(sp.school);
  const kind =
    str(sp.kind) === "staff" || str(sp.kind) === "student"
      ? (str(sp.kind) as "staff" | "student")
      : undefined;
  const q = str(sp.q);

  const [users, schools, roles, structure] = await Promise.all([
    listUsers({ school, kind, q }),
    listSchools(),
    listRoles(),
    school ? schoolStructure(school) : Promise.resolve(null),
  ]);
  const writable = !actor.viewAs;
  const target = school ? schoolTarget(school) : platformTarget;
  const canInvite = writable && (await can(actor, "users:invite", target));
  const canCreate = writable && !!structure?.school && (await can(actor, "users:create", target));

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("intro")}
        actions={
          <Button asChild variant="outline">
            <Link href="/owner/users/import">{t("import")}</Link>
          </Button>
        }
      />
      <form className="contents" method="get">
        <FormRow>
          <SelectField
            label={t("school")}
            name="school"
            defaultValue={school ?? ""}
            placeholder={t("allSchools")}
            options={schools.map((s) => ({
              value: s.id,
              label: `${s.code} · ${localName(s, locale)}`,
            }))}
          />
          <SelectField
            label={t("kind")}
            name="kind"
            defaultValue={kind ?? ""}
            placeholder={t("everyone")}
            options={[
              { value: "staff", label: t("staff") },
              { value: "student", label: t("students") },
            ]}
          />
          <TextField label={t("search")} name="q" defaultValue={q} type="search" />
          <Button type="submit" variant="secondary">
            {t("filter")}
          </Button>
        </FormRow>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("fullName")}</TableHead>
            <TableHead>{t("login")}</TableHead>
            <TableHead>{t("school")}</TableHead>
            <TableHead>{t("roles")}</TableHead>
            <TableHead>{t("status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell>
                <Link
                  href={`/owner/users/${u.id}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {u.full_name}
                </Link>
              </TableCell>
              <TableCell dir="ltr" className="text-start font-mono text-xs">
                {u.username ?? u.email}
              </TableCell>
              <TableCell dir="ltr" className="text-start">
                {u.schools?.code ?? "—"}
              </TableCell>
              <TableCell className="flex flex-wrap gap-1">
                {[
                  ...new Map(
                    u.user_roles.flatMap((r) => (r.roles ? [[r.roles.key, r.roles]] : [])),
                  ).values(),
                ].map((r) => (
                  <Badge key={r.key} variant="secondary">
                    {localName(r, locale)}
                  </Badge>
                ))}
              </TableCell>
              <TableCell>
                {u.status === "active" ? (
                  t("active")
                ) : (
                  <Badge variant="destructive">{t("disabled")}</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
          {users.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground">
                {t("empty")}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {users.length === 300 && <p className="text-sm text-muted-foreground">{t("limited")}</p>}

      {!school && canInvite && <p className="text-sm text-muted-foreground">{t("pickSchool")}</p>}
      {canInvite && <InviteStaffCard structure={structure} roles={roles} platform={!school} />}
      {canCreate && structure && <CreateStudentCard structure={structure} />}
    </>
  );
}
