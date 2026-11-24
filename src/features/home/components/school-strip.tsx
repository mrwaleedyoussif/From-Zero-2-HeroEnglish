import Image from "next/image";
import type { HomeTexts } from "../copy";
import { Bi } from "./bi";

const SCHOOLS = [
  ["schoolLine", "/brand/schools/andalus-international.webp"],
  ["schoolLine2", "/brand/schools/alandalus-private.webp"],
] as const;

/** The schools the app is built for, with their logos. Shown only on the school user's path. */
export function SchoolStrip({ texts }: { texts: HomeTexts }) {
  return (
    <ul className="z2h-rise flex flex-wrap items-stretch justify-center gap-3">
      {SCHOOLS.map(([k, src]) => (
        <li
          key={k}
          className="flex max-w-72 items-center gap-3 rounded-2xl border border-white/15 bg-white/5 p-2 pe-4 text-start text-sm text-[var(--z-soft)]"
        >
          <Image
            src={src}
            alt=""
            width={56}
            height={56}
            className="size-14 shrink-0 rounded-xl bg-white object-contain p-0.5"
          />
          <Bi texts={texts} k={k} className="font-semibold text-white" />
        </li>
      ))}
    </ul>
  );
}
