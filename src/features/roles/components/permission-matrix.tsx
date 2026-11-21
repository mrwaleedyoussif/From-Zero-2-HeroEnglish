"use client";

import { useTranslations } from "next-intl";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { setRolePermission } from "../actions";

export interface MatrixRole {
  id: string;
  label: string;
  locked: boolean;
  disabled: boolean;
}

export interface MatrixPermission {
  key: string;
  module: string;
  description: string;
}

/** Roles × permissions, grouped by module. Each click saves at once (audited in the DB). */
export function PermissionMatrix({
  roles,
  permissions,
  granted,
  canEdit,
}: {
  roles: MatrixRole[];
  permissions: MatrixPermission[];
  granted: string[];
  canEdit: boolean;
}) {
  const t = useTranslations("Roles");
  const tErrors = useTranslations("Errors");
  const [pending, startTransition] = useTransition();
  const [state, toggle] = useOptimistic(
    new Set(granted),
    (current, change: { cell: string; on: boolean }) => {
      const next = new Set(current);
      if (change.on) next.add(change.cell);
      else next.delete(change.cell);
      return next;
    },
  );

  function onChange(roleId: string, key: string, on: boolean) {
    startTransition(async () => {
      toggle({ cell: `${roleId}|${key}`, on });
      const result = await setRolePermission({ role_id: roleId, permission_key: key, granted: on });
      if (!result.ok) toast.error(tErrors(result.error));
    });
  }

  const modules = [...new Set(permissions.map((p) => p.module))];

  return (
    <div className="overflow-x-auto rounded-md border border-border" aria-busy={pending}>
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 bg-card">
          <tr>
            <th scope="col" className="p-2 text-start">
              {t("permission")}
            </th>
            {roles.map((r) => (
              <th key={r.id} scope="col" className="p-2 text-center font-medium whitespace-nowrap">
                {r.label}
                {r.disabled && <div className="text-xs text-muted-foreground">{t("disabled")}</div>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {modules.map((m) => (
            <ModuleRows key={m} module={m} label={t(`modules.${m}`)}>
              {permissions
                .filter((p) => p.module === m)
                .map((p) => (
                  <tr key={p.key} className="border-t border-border">
                    <th scope="row" className="p-2 text-start font-normal">
                      <code dir="ltr" className="text-xs">
                        {p.key}
                      </code>
                      <div className="text-xs text-muted-foreground">{p.description}</div>
                    </th>
                    {roles.map((r) => {
                      const cell = `${r.id}|${p.key}`;
                      return (
                        <td key={cell} className="p-2 text-center">
                          <Checkbox
                            checked={state.has(cell)}
                            disabled={!canEdit || r.locked}
                            aria-label={`${r.label}: ${p.key}`}
                            onCheckedChange={(v) => onChange(r.id, p.key, v === true)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
            </ModuleRows>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ModuleRows({
  label,
  children,
}: {
  module: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <tr className="bg-muted">
        <th
          colSpan={999}
          scope="rowgroup"
          className="p-2 text-start text-xs font-semibold tracking-wide uppercase"
        >
          {label}
        </th>
      </tr>
      {children}
    </>
  );
}
