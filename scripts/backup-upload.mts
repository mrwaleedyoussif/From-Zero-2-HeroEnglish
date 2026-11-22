/**
 * npm run backup:upload -- <file.sql.gz> — upload a database dump to Drive 06_Backups/db/
 * and keep the 30 newest (older ones go to the Drive trash). Used by the nightly
 * GitHub Actions backup (.github/workflows/backup.yml) after `pg_dump | gzip`.
 */
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { getStorage } from "@/lib/storage";
import { findLayoutFolder } from "@/lib/storage/layout";

export const KEEP = 30;

const file = process.argv[2];
if (!file) {
  console.error("usage: npm run backup:upload -- <file.sql.gz>");
  process.exit(1);
}
const storage = await getStorage();
const folder = await findLayoutFolder(storage, "06_Backups/db");
if (!folder)
  throw new Error("Drive folder LinguaPath/06_Backups/db is missing — run npm run drive:init");
const uploaded = await storage.upload(
  folder,
  basename(file),
  "application/gzip",
  new Uint8Array(await readFile(file)),
);
console.log(`uploaded ${uploaded.name} (${uploaded.size ?? "?"} bytes)`);

// Names start with the date (db-YYYY-MM-DD…), so name order is age order.
const backups = (await storage.list(folder))
  .filter((f) => f.name.endsWith(".sql.gz"))
  .sort((a, b) => b.name.localeCompare(a.name));
for (const old of backups.slice(KEEP)) {
  await storage.remove(old.id);
  console.log(`trashed ${old.name}`);
}
