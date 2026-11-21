import { createClient } from "@/lib/supabase/server";
import { schoolTheme } from "@/lib/theme/contrast";

/**
 * Per-school primary colour (schools.theme.primary). Values come from schoolTheme(), which
 * only returns validated #rrggbb strings, so they are safe to put in a <style> tag.
 */
export async function SchoolThemeStyle({ schoolId }: { schoolId: string }) {
  const db = await createClient();
  const { data } = await db.from("schools").select("theme").eq("id", schoolId).maybeSingle();
  const primary = (data?.theme as { primary?: unknown } | null)?.primary;
  if (typeof primary !== "string") return null;
  const theme = schoolTheme(primary);
  if (!theme.ok || !/^[0-9a-f-]{36}$/.test(schoolId)) return null;

  const sel = `[data-school-theme="${schoolId}"]`;
  const css = `${sel}{--primary:${theme.light.primary};--primary-foreground:${theme.light.primaryForeground};--ring:${theme.light.primary}}
.dark ${sel}{--primary:${theme.dark.primary};--primary-foreground:${theme.dark.primaryForeground};--ring:${theme.dark.primary}}`;
  return <style>{css}</style>;
}
