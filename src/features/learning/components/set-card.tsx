import { getTranslations } from "next-intl/server";
import { ActionForm } from "@/components/action-form";
import { SelectField } from "@/components/field";
import { Button } from "@/components/ui/button";
import { addMember, deleteSet, removeMember } from "../teacher/actions";
import type { RosterStudent } from "../teacher/queries";

/** One group or team: members (remove), add a classmate, delete. */
export async function SetCard({
  classId,
  kind,
  set,
  students,
  editable,
}: {
  classId: string;
  kind: "group" | "team";
  set: { id: string; name: string; members: string[] };
  students: RosterStudent[];
  editable: boolean;
}) {
  const t = await getTranslations("Groups");
  const name = new Map(students.map((s) => [s.id, s.name]));
  const others = students.filter((s) => !set.members.includes(s.id));
  const hidden = (
    <>
      <input type="hidden" name="class_id" value={classId} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="set_id" value={set.id} />
    </>
  );

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3" data-set={set.name}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">
          {set.name} <span className="text-sm text-muted-foreground">({set.members.length})</span>
        </span>
        {editable && (
          <ActionForm action={deleteSet} successMessage="removed">
            {hidden}
            <Button type="submit" size="sm" variant="ghost">
              {t("delete")}
            </Button>
          </ActionForm>
        )}
      </div>
      <ul className="flex flex-wrap gap-1">
        {set.members.map((id) => (
          <li
            key={id}
            className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-sm"
          >
            {name.get(id) ?? "—"}
            {editable && (
              <ActionForm action={removeMember} successMessage="removed">
                {hidden}
                <input type="hidden" name="student_id" value={id} />
                <button
                  type="submit"
                  aria-label={t("remove", { name: name.get(id) ?? "" })}
                  className="px-1"
                >
                  ×
                </button>
              </ActionForm>
            )}
          </li>
        ))}
      </ul>
      {editable && others.length > 0 && (
        <ActionForm action={addMember} className="flex items-end gap-2">
          {hidden}
          <SelectField
            idPrefix={`add-${set.id.slice(0, 8)}`}
            label={t("add")}
            name="student_id"
            required
            defaultValue=""
            placeholder="—"
            options={others.map((s) => ({ value: s.id, label: s.name }))}
          />
          <Button type="submit" size="sm">
            {t("addButton")}
          </Button>
        </ActionForm>
      )}
    </div>
  );
}
