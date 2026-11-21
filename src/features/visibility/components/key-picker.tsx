import { getTranslations } from "next-intl/server";
import { FormRow, TextField } from "@/components/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { registry } from "@/lib/registry";

/** Search the registry by key or label and pick one key. */
export async function KeyPicker({ q, selected }: { q: string; selected: string | null }) {
  const t = await getTranslations("Registry");
  const tv = await getTranslations("Visibility");
  const needle = q.trim().toLowerCase();
  const matches = registry.filter(
    (e) =>
      !needle || e.key.toLowerCase().includes(needle) || t(e.key).toLowerCase().includes(needle),
  );

  return (
    <div className="flex flex-col gap-3">
      <form method="get" className="contents">
        <FormRow>
          <TextField idPrefix="key" label={tv("search")} name="q" type="search" defaultValue={q} />
          <Button type="submit" variant="secondary">
            {tv("find")}
          </Button>
        </FormRow>
      </form>
      <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto rounded-md border border-border p-2 text-sm">
        {matches.map((e) => (
          <li key={e.key}>
            <Link
              href={{ pathname: "/owner/visibility", query: { q, key: e.key } }}
              aria-current={e.key === selected ? "true" : undefined}
              className="flex items-center justify-between gap-2 rounded px-2 py-1 hover:bg-accent aria-[current=true]:bg-primary aria-[current=true]:text-primary-foreground"
            >
              <span>{t(e.key)}</span>
              <span className="flex items-center gap-1">
                {!e.defaultVisible && <Badge variant="outline">{tv("hiddenByDefault")}</Badge>}
                <code dir="ltr" className="text-xs opacity-70">
                  {e.key}
                </code>
              </span>
            </Link>
          </li>
        ))}
        {matches.length === 0 && <li className="text-muted-foreground">{tv("noMatch")}</li>}
      </ul>
    </div>
  );
}
