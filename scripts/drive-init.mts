/**
 * npm run drive:init — create the /LinguaPath folder layout in the Owner's Google Drive
 * (SPEC §5). Safe to re-run: existing folders are kept. Needs the same env as the app
 * (Google connected in Owner → Integrations, or GOOGLE_REFRESH_TOKEN).
 * The Integrations page has the same action as a button.
 */
import { getStorage } from "@/lib/storage";
import { initLayout } from "@/lib/storage/layout";

const storage = await getStorage();
const ids = await initLayout(storage);
console.log(`Drive layout ready (${storage.driver}):`);
for (const [path, id] of Object.entries(ids)) console.log(`  ${path.padEnd(22)} ${id}`);
