import { notFound } from "next/navigation";

/** Any unknown path inside a locale shows the translated 404 (src/app/[locale]/not-found.tsx). */
export default function CatchAll() {
  notFound();
}
