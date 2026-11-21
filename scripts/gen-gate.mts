/**
 * npm run gen:gate <name>   — scaffold a new gate (SPEC §4). No other file needs editing.
 * npm run gen:gate -- --index — only regenerate src/gates/index.generated.ts.
 *
 * Writes: src/gates/<name>.config.ts, src/app/[locale]/(gates)/<name>/{layout,page}.tsx,
 * labels in messages/{en,ar}.json, a migration for the `gate:<name>` permission (granted to
 * the Owner), and the gate index. Afterwards: `npm run db:migrate` (or db:reset locally),
 * then give `gate:<name>` to roles in Owner → Roles & permissions.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  addGateMessages,
  GATE_NAME,
  migrationName,
  renderConfig,
  renderIndex,
  renderLayout,
  renderMigration,
  renderPage,
} from "./gen-gate-lib.mts";

const root = process.cwd();
const gatesDir = join(root, "src/gates");

function writeIndex(): string[] {
  const names = readdirSync(gatesDir)
    .filter((f) => f.endsWith(".config.ts"))
    .map((f) => f.replace(".config.ts", ""));
  writeFileSync(join(gatesDir, "index.generated.ts"), renderIndex(names));
  return names;
}

const arg = process.argv[2];
if (arg === "--index") {
  console.log(`Gate index: ${writeIndex().join(", ")}`);
  process.exit(0);
}
if (!arg || !GATE_NAME.test(arg)) {
  console.error("Usage: npm run gen:gate <name>   (lowercase letters/digits, e.g. kiosk)");
  process.exit(1);
}
const name = arg;
if (existsSync(join(gatesDir, `${name}.config.ts`))) {
  console.error(`Gate "${name}" already exists.`);
  process.exit(1);
}

const existingPriorities = readdirSync(gatesDir)
  .filter((f) => f.endsWith(".config.ts"))
  .map((f) => Number(/priority:\s*(\d+)/.exec(readFileSync(join(gatesDir, f), "utf8"))?.[1] ?? 0));
writeFileSync(
  join(gatesDir, `${name}.config.ts`),
  renderConfig(name, Math.max(0, ...existingPriorities) + 10),
);

const routeDir = join(root, "src/app/[locale]/(gates)", name);
mkdirSync(routeDir, { recursive: true });
writeFileSync(join(routeDir, "layout.tsx"), renderLayout(name));
writeFileSync(join(routeDir, "page.tsx"), renderPage(name));

for (const lang of ["en", "ar"]) {
  const file = join(root, "messages", `${lang}.json`);
  const messages = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
  writeFileSync(file, `${JSON.stringify(addGateMessages(messages, name), null, 2)}\n`);
}

const migrationsDir = join(root, "supabase/migrations");
const migration = migrationName(
  readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")),
  name,
  new Date(),
);
writeFileSync(join(migrationsDir, migration), renderMigration(name));

writeIndex();
// Keep generated files in the repo's formatting so `format:check` stays green.
execFileSync("npx", ["prettier", "--write", gatesDir, routeDir, join(root, "messages")], {
  stdio: "ignore",
});
console.log(`Gate "${name}" created:
  src/gates/${name}.config.ts
  src/app/[locale]/(gates)/${name}/layout.tsx + page.tsx
  messages/en.json + ar.json (labels — translate the Arabic one)
  supabase/migrations/${migration}
Next: npm run db:migrate, then grant "gate:${name}" to roles in Owner → Roles & permissions.`);
